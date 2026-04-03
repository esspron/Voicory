import { test, expect, request } from '@playwright/test';

/**
 * Twilio Voice Webhook Tests
 * Tests the /api/twilio/:userId/voice and /voice/gather endpoints
 * 
 * These tests hit the real deployed Cloud Run backend.
 * Twilio webhooks are POST requests with form-encoded bodies.
 * 
 * Fixed: 2026-04-03 — replaced stub AI response with real OpenAI GPT-4o-mini
 */

const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';

// A real userId that exists in Supabase with a phone number + assistant configured
// For CI: override via env var TEST_TWILIO_USER_ID
const TEST_USER_ID = process.env.TEST_TWILIO_USER_ID || 'test-user-id-placeholder';
const TEST_PHONE_TO = process.env.TEST_TWILIO_PHONE_TO || '+15005550006'; // Twilio test number
const TEST_PHONE_FROM = process.env.TEST_TWILIO_PHONE_FROM || '+15005550001';

// ============================================================
// HELPERS
// ============================================================

/**
 * Build a fake Twilio voice webhook payload (form-encoded)
 */
function buildVoicePayload(overrides: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams({
    CallSid: `CA${Math.random().toString(36).substring(2, 34)}`,
    AccountSid: 'ACtest123456789',
    From: TEST_PHONE_FROM,
    To: TEST_PHONE_TO,
    CallStatus: 'ringing',
    Direction: 'inbound',
    ...overrides,
  });
}

/**
 * Build a fake Twilio gather callback payload
 */
function buildGatherPayload(speechResult: string, callSid: string, overrides: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams({
    CallSid: callSid,
    SpeechResult: speechResult,
    Confidence: '0.92',
    From: TEST_PHONE_FROM,
    To: TEST_PHONE_TO,
    ...overrides,
  });
}

/**
 * Assert response is valid TwiML
 * Note: backend omits <?xml declaration (valid per Twilio docs)
 */
function assertTwiml(body: string, shouldContain?: string[]) {
  expect(body).toContain('<Response>');
  expect(body).toContain('</Response>');
  if (shouldContain) {
    for (const str of shouldContain) {
      expect(body).toContain(str);
    }
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================

test('backend health check passes', async () => {
  const ctx = await request.newContext();
  const res = await ctx.get(`${BASE_URL}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('healthy');
});

// ============================================================
// VOICE WEBHOOK — initial call handler
// ============================================================

test.describe('POST /api/twilio/:userId/voice', () => {

  test('returns valid TwiML with <Say> and <Gather> on inbound call', async () => {
    test.skip(!process.env.TEST_TWILIO_USER_ID, 'Requires TEST_TWILIO_USER_ID env var with a real configured user');
    const ctx = await request.newContext();
    const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: buildVoicePayload().toString(),
    });

    // Twilio expects 200 with XML content type
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/xml');

    const body = await res.text();
    assertTwiml(body);

    // Must have <Say> (greeting) and <Gather> (to capture user speech)
    expect(body).toContain('<Say');
    expect(body).toContain('<Gather');
    expect(body).toContain('input="speech"');

    // Gather must point back to the gather endpoint for conversation loop
    expect(body).toContain(`/voice/gather`);
  });

  test('returns TwiML with fallback message for unknown phone number', async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${BASE_URL}/api/twilio/nonexistent-user-999/voice`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: buildVoicePayload({ To: '+19999999999' }).toString(),
    });

    expect(res.status()).toBe(200);
    const body = await res.text();
    assertTwiml(body);

    // Should gracefully say the number is not configured
    expect(body).toContain('<Say');
    expect(body).toContain('<Hangup');
  });

  test('returns TwiML even on malformed payload (no crash)', async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'CallSid=&From=&To=',
    });

    // Must never return 500 — Twilio would retry endlessly
    expect(res.status()).not.toBe(500);
    expect(res.headers()['content-type']).toContain('text/xml');
  });

  test('content-type header is text/xml not application/json', async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: buildVoicePayload().toString(),
    });
    expect(res.headers()['content-type']).toContain('text/xml');
  });
});

// ============================================================
// GATHER WEBHOOK — AI response handler (THE FIX)
// ============================================================

test.describe('POST /api/twilio/:userId/voice/gather', () => {

  test('returns valid TwiML with AI <Say> response when speech is provided', async () => {
    const ctx = await request.newContext();
    const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;

    const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: buildGatherPayload('I want to book an appointment for next Monday', callSid).toString(),
    });

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/xml');

    const body = await res.text();
    assertTwiml(body);

    // Must have a real <Say> response (not the old stub "I heard you say:")
    expect(body).toContain('<Say');
    expect(body).not.toContain('I heard you say:');
    expect(body).not.toContain('We will process your request');
  });

  test('AI response continues conversation loop via <Gather>', async () => {
    test.skip(!process.env.TEST_TWILIO_USER_ID, 'Requires TEST_TWILIO_USER_ID env var with a real configured user');
    const ctx = await request.newContext();
    const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;

    const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: buildGatherPayload('What are your business hours?', callSid).toString(),
    });

    const body = await res.text();
    assertTwiml(body);

    // After AI responds, must gather again for multi-turn conversation
    expect(body).toContain('<Gather');
    expect(body).toContain(`/voice/gather`);
  });

  test('returns prompt to repeat when no speech detected', async () => {
    const ctx = await request.newContext();
    const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;

    const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: buildGatherPayload('', callSid).toString(),
    });

    expect(res.status()).toBe(200);
    const body = await res.text();
    assertTwiml(body);

    // Should ask user to repeat, not hang up immediately
    expect(body).toContain('<Say');
    expect(body).not.toContain('I heard you say:');
  });

  test('handles unknown user gracefully without crashing', async () => {
    const ctx = await request.newContext();
    const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;

    const res = await ctx.post(`${BASE_URL}/api/twilio/unknown-user-xyz/voice/gather`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: buildGatherPayload('Hello', callSid).toString(),
    });

    // Must return TwiML, never crash
    expect(res.status()).not.toBe(500);
    const body = await res.text();
    assertTwiml(body);
  });

  test('XML special characters in AI response are escaped (no broken TwiML)', async () => {
    const ctx = await request.newContext();
    const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;

    // Send speech that might trigger responses with special chars
    const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: buildGatherPayload('Tell me about AT&T or prices > $50', callSid).toString(),
    });

    const body = await res.text();

    // Raw & < > must not appear inside <Say> — must be escaped
    // (The escapeXml() helper must be applied to AI output)
    const sayContent = body.match(/<Say[^>]*>(.*?)<\/Say>/s)?.[1] || '';
    expect(sayContent).not.toMatch(/[^&]&[^a-z#]/); // raw & not followed by entity
  });

  test('response time is under 10 seconds (OpenAI latency acceptable)', async () => {
    const ctx = await request.newContext({ timeout: 15000 });
    const callSid = `CA${Math.random().toString(36).substring(2, 34)}`;

    const start = Date.now();
    const res = await ctx.post(`${BASE_URL}/api/twilio/${TEST_USER_ID}/voice/gather`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: buildGatherPayload('Hi, how are you?', callSid).toString(),
    });
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(10000); // 10s max — Twilio times out at 15s
  });
});
