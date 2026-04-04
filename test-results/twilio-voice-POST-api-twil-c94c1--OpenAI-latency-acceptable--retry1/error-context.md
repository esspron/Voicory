# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: twilio-voice.spec.ts >> POST /api/twilio/:userId/voice/gather >> response time is under 10 seconds (OpenAI latency acceptable)
- Location: tests/twilio-voice.spec.ts:245:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 429
```

# Test source

```ts
  156 |     const ctx = await request.newContext();
  157 |     const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;
  158 | 
  159 |     const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
  160 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  161 |       data: buildGatherPayload('I want to book an appointment for next Monday', callSid).toString(),
  162 |     });
  163 | 
  164 |     expect(res.status()).toBe(200);
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
> 256 |     expect(res.status()).toBe(200);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  257 |     expect(elapsed).toBeLessThan(10000); // 10s max — Twilio times out at 15s
  258 |   });
  259 | });
  260 | 
```