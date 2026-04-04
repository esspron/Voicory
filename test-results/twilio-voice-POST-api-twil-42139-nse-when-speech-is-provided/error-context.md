# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: twilio-voice.spec.ts >> POST /api/twilio/:userId/voice/gather >> returns valid TwiML with AI <Say> response when speech is provided
- Location: tests/twilio-voice.spec.ts:155:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
  64  |       expect(body).toContain(str);
  65  |     }
  66  |   }
  67  | }
  68  | 
  69  | // ============================================================
  70  | // HEALTH CHECK
  71  | // ============================================================
  72  | 
  73  | test('backend health check passes', async () => {
  74  |   const ctx = await request.newContext();
  75  |   const res = await ctx.get(`${BASE_URL}/health`);
  76  |   expect(res.status()).toBe(200);
  77  |   const body = await res.json();
  78  |   expect(body.status).toBe('healthy');
  79  | });
  80  | 
  81  | // ============================================================
  82  | // VOICE WEBHOOK — initial call handler
  83  | // ============================================================
  84  | 
  85  | test.describe('POST /api/twilio/:userId/voice', () => {
  86  | 
  87  |   test('returns valid TwiML with <Say> and <Gather> on inbound call', async () => {
  88  |     test.skip(!process.env.TEST_TWILIO_USER_ID, 'Requires TEST_TWILIO_USER_ID env var with a real configured user');
  89  |     const ctx = await request.newContext();
  90  |     const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice`, {
  91  |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  92  |       data: buildVoicePayload().toString(),
  93  |     });
  94  | 
  95  |     // Twilio expects 200 with XML content type
  96  |     expect(res.status()).toBe(200);
  97  |     expect(res.headers()['content-type']).toContain('text/xml');
  98  | 
  99  |     const body = await res.text();
  100 |     assertTwiml(body);
  101 | 
  102 |     // Must have <Say> (greeting) and <Gather> (to capture user speech)
  103 |     expect(body).toContain('<Say');
  104 |     expect(body).toContain('<Gather');
  105 |     expect(body).toContain('input="speech"');
  106 | 
  107 |     // Gather must point back to the gather endpoint for conversation loop
  108 |     expect(body).toContain(`/voice/gather`);
  109 |   });
  110 | 
  111 |   test('returns TwiML with fallback message for unknown phone number', async () => {
  112 |     const ctx = await request.newContext();
  113 |     const res = await ctx.post(`${BASE_URL}/api/twilio/00000000-0000-0000-0000-000000000000/voice`, {
  114 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  115 |       data: buildVoicePayload({ To: '+19999999999' }).toString(),
  116 |     });
  117 | 
  118 |     expect(res.status()).toBe(200);
  119 |     const body = await res.text();
  120 |     assertTwiml(body);
  121 | 
  122 |     // Should gracefully say the number is not configured
  123 |     expect(body).toContain('<Say');
  124 |     expect(body).toContain('<Hangup');
  125 |   });
  126 | 
  127 |   test('returns TwiML even on malformed payload (no crash)', async () => {
  128 |     const ctx = await request.newContext();
  129 |     const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice`, {
  130 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  131 |       data: 'CallSid=&From=&To=',
  132 |     });
  133 | 
  134 |     // Must never return 500 — Twilio would retry endlessly
  135 |     expect(res.status()).not.toBe(500);
  136 |     expect(res.headers()['content-type']).toContain('text/xml');
  137 |   });
  138 | 
  139 |   test('content-type header is text/xml not application/json', async () => {
  140 |     const ctx = await request.newContext();
  141 |     const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice`, {
  142 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  143 |       data: buildVoicePayload().toString(),
  144 |     });
  145 |     expect(res.headers()['content-type']).toContain('text/xml');
  146 |   });
  147 | });
  148 | 
  149 | // ============================================================
  150 | // GATHER WEBHOOK — AI response handler (THE FIX)
  151 | // ============================================================
  152 | 
  153 | test.describe('POST /api/twilio/:userId/voice/gather', () => {
  154 | 
  155 |   test('returns valid TwiML with AI <Say> response when speech is provided', async () => {
  156 |     const ctx = await request.newContext();
  157 |     const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;
  158 | 
  159 |     const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
  160 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  161 |       data: buildGatherPayload('I want to book an appointment for next Monday', callSid).toString(),
  162 |     });
  163 | 
> 164 |     expect(res.status()).toBe(200);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  165 |     expect(res.headers()['content-type']).toContain('text/xml');
  166 | 
  167 |     const body = await res.text();
  168 |     assertTwiml(body);
  169 | 
  170 |     // Must have a real <Say> response (not the old stub "I heard you say:")
  171 |     expect(body).toContain('<Say');
  172 |     expect(body).not.toContain('I heard you say:');
  173 |     expect(body).not.toContain('We will process your request');
  174 |   });
  175 | 
  176 |   test('AI response continues conversation loop via <Gather>', async () => {
  177 |     test.skip(!process.env.TEST_TWILIO_USER_ID, 'Requires TEST_TWILIO_USER_ID env var with a real configured user');
  178 |     const ctx = await request.newContext();
  179 |     const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;
  180 | 
  181 |     const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
  182 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  183 |       data: buildGatherPayload('What are your business hours?', callSid).toString(),
  184 |     });
  185 | 
  186 |     const body = await res.text();
  187 |     assertTwiml(body);
  188 | 
  189 |     // After AI responds, must gather again for multi-turn conversation
  190 |     expect(body).toContain('<Gather');
  191 |     expect(body).toContain(`/voice/gather`);
  192 |   });
  193 | 
  194 |   test('returns prompt to repeat when no speech detected', async () => {
  195 |     const ctx = await request.newContext();
  196 |     const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;
  197 | 
  198 |     const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
  199 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  200 |       data: buildGatherPayload('', callSid).toString(),
  201 |     });
  202 | 
  203 |     expect(res.status()).toBe(200);
  204 |     const body = await res.text();
  205 |     assertTwiml(body);
  206 | 
  207 |     // Should ask user to repeat, not hang up immediately
  208 |     expect(body).toContain('<Say');
  209 |     expect(body).not.toContain('I heard you say:');
  210 |   });
  211 | 
  212 |   test('handles unknown user gracefully without crashing', async () => {
  213 |     const ctx = await request.newContext();
  214 |     const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;
  215 | 
  216 |     const res = await ctx.post(`${BASE_URL}/api/twilio/00000000-0000-0000-0000-000000000001/voice/gather`, {
  217 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  218 |       data: buildGatherPayload('Hello', callSid).toString(),
  219 |     });
  220 | 
  221 |     // Must return TwiML, never crash
  222 |     expect(res.status()).not.toBe(500);
  223 |     const body = await res.text();
  224 |     assertTwiml(body);
  225 |   });
  226 | 
  227 |   test('XML special characters in AI response are escaped (no broken TwiML)', async () => {
  228 |     const ctx = await request.newContext();
  229 |     const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;
  230 | 
  231 |     // Send speech that might trigger responses with special chars
  232 |     const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
  233 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  234 |       data: buildGatherPayload('Tell me about AT&T or prices > $50', callSid).toString(),
  235 |     });
  236 | 
  237 |     const body = await res.text();
  238 | 
  239 |     // Raw & < > must not appear inside <Say> — must be escaped
  240 |     // (The escapeXml() helper must be applied to AI output)
  241 |     const sayContent = body.match(/<Say[^>]*>(.*?)<\/Say>/s)?.[1] || '';
  242 |     expect(sayContent).not.toMatch(/[^&]&[^a-z#]/); // raw & not followed by entity
  243 |   });
  244 | 
  245 |   test('response time is under 10 seconds (OpenAI latency acceptable)', async () => {
  246 |     const ctx = await request.newContext({ timeout: 15000 });
  247 |     const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;
  248 | 
  249 |     const start = Date.now();
  250 |     const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
  251 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  252 |       data: buildGatherPayload('Hi, how are you?', callSid).toString(),
  253 |     });
  254 |     const elapsed = Date.now() - start;
  255 | 
  256 |     expect(res.status()).toBe(200);
  257 |     expect(elapsed).toBeLessThan(10000); // 10s max — Twilio times out at 15s
  258 |   });
  259 | });
  260 | 
```