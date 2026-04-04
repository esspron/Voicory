# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: twilio-voice.spec.ts >> POST /api/twilio/:userId/voice/gather >> handles unknown user gracefully without crashing
- Location: tests/twilio-voice.spec.ts:212:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "<Response>"
Received string:    "{\"error\":\"Validation failed\",\"details\":[{\"field\":\"\",\"message\":\"Required\"}]}"
```

# Test source

```ts
  1   | import { test, expect, request } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Twilio Voice Webhook Tests
  5   |  * Tests the /api/twilio/:userId/voice and /voice/gather endpoints
  6   |  * 
  7   |  * These tests hit the real deployed Cloud Run backend.
  8   |  * Twilio webhooks are POST requests with form-encoded bodies.
  9   |  * 
  10  |  * Fixed: 2026-04-03 — replaced stub AI response with real OpenAI GPT-4o-mini
  11  |  */
  12  | 
  13  | const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';
  14  | 
  15  | // A real userId that exists in Supabase with a phone number + assistant configured
  16  | // For CI: override via env var TEST_TWILIO_USER_ID
  17  | // Default: Vishwas's user ID (has "Bacha" assistant in draft state)
  18  | const TEST_USER_ID = process.env.TEST_TWILIO_USER_ID || '60ab39c1-7170-4013-9764-d732f7196c95';
  19  | const TEST_PHONE_TO = process.env.TEST_TWILIO_PHONE_TO || '+15005550006'; // Twilio test number
  20  | const TEST_PHONE_FROM = process.env.TEST_TWILIO_PHONE_FROM || '+15005550001';
  21  | 
  22  | // ============================================================
  23  | // HELPERS
  24  | // ============================================================
  25  | 
  26  | /**
  27  |  * Build a fake Twilio voice webhook payload (form-encoded)
  28  |  */
  29  | function buildVoicePayload(overrides: Record<string, string> = {}): URLSearchParams {
  30  |   return new URLSearchParams({
  31  |     CallSid: `CA${Math.random().toString(36).substring(2, 34)}`,
  32  |     AccountSid: 'ACtest123456789',
  33  |     From: TEST_PHONE_FROM,
  34  |     To: TEST_PHONE_TO,
  35  |     CallStatus: 'ringing',
  36  |     Direction: 'inbound',
  37  |     ...overrides,
  38  |   });
  39  | }
  40  | 
  41  | /**
  42  |  * Build a fake Twilio gather callback payload
  43  |  */
  44  | function buildGatherPayload(speechResult: string, callSid: string, overrides: Record<string, string> = {}): URLSearchParams {
  45  |   return new URLSearchParams({
  46  |     CallSid: callSid,
  47  |     SpeechResult: speechResult,
  48  |     Confidence: '0.92',
  49  |     From: TEST_PHONE_FROM,
  50  |     To: TEST_PHONE_TO,
  51  |     ...overrides,
  52  |   });
  53  | }
  54  | 
  55  | /**
  56  |  * Assert response is valid TwiML
  57  |  * Note: backend omits <?xml declaration (valid per Twilio docs)
  58  |  */
  59  | function assertTwiml(body: string, shouldContain?: string[]) {
> 60  |   expect(body).toContain('<Response>');
      |                ^ Error: expect(received).toContain(expected) // indexOf
  61  |   expect(body).toContain('</Response>');
  62  |   if (shouldContain) {
  63  |     for (const str of shouldContain) {
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
```