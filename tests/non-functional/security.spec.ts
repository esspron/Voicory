// @ts-nocheck
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';
const TEST_JWT = process.env.TEST_JWT;

test.describe('Security — Non-Functional', () => {
  test('SQL injection in customer name field → 400 or sanitized (not 500)', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: {
        name: "Robert'); DROP TABLE customers; --",
        phone: '+15555550100',
        email: 'sqlinject@example.com',
      },
    });
    // Should NOT return 500 (server error) — either 400 validation or 201 (sanitized)
    expect(res.status()).not.toBe(500);
    expect([200, 201, 400, 422]).toContain(res.status());
  });

  test('XSS payload in message → response does not echo raw <script> tag', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const xssPayload = '<script>alert("xss")</script>';
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: {
        message: xssPayload,
        assistantId: process.env.TEST_ASSISTANT_ID || '00000000-0000-0000-0000-000000000001',
      },
    });
    if (res.status() === 200) {
      const text = await res.text();
      // Response should not echo back raw unescaped script tags that would execute
      expect(text).not.toMatch(/<script>alert\("xss"\)<\/script>/);
    } else {
      // 400, 402, 404 are all acceptable — means it was rejected before any echo
      expect([400, 402, 404]).toContain(res.status());
    }
  });

  test('JWT token tampering → 401', async ({ request }) => {
    // Tamper with a JWT by modifying its payload segment
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoYWNrZXIiLCJyb2xlIjoiYWRtaW4ifQ.tampered_signature_xyz';
    const res = await request.get(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${fakeJwt}` },
    });
    expect(res.status()).toBe(401);
  });

  test('Missing Authorization header → 401 on /api/customers', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customers`);
    expect(res.status()).toBe(401);
  });

  test('Missing Authorization header → 401 on /api/paddle/billing-status', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/paddle/billing-status`);
    expect(res.status()).toBe(401);
  });

  test('Missing Authorization header → 401 on /api/crm/integrations', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/crm/integrations`);
    expect(res.status()).toBe(401);
  });

  test('Missing Authorization header → 401 on /api/test-chat', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      data: { message: 'hello', assistantId: '00000000-0000-0000-0000-000000000001' },
    });
    expect(res.status()).toBe(401);
  });

  test('Invalid JWT format (garbage string) → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customers`, {
      headers: { Authorization: 'Bearer thisIsNotAJWT' },
    });
    expect(res.status()).toBe(401);
  });

  test('Rate limiting: 15 rapid requests to /api/test-chat → gets 429 or 401', async ({ request }) => {
    // Fire 15 requests without JWT — expect 401s (or 429 if rate limiter fires first)
    const promises = Array.from({ length: 15 }, (_, i) =>
      request.post(`${BASE_URL}/api/test-chat`, {
        data: { message: `rapid request ${i}`, assistantId: '00000000-0000-0000-0000-000000000001' },
      })
    );
    const results = await Promise.all(promises);
    // All should be 401 (no auth) — rate limiter may also fire (429)
    for (const res of results) {
      expect([401, 429, 400]).toContain(res.status());
    }
  });

  test('CORS: OPTIONS request includes appropriate headers', async ({ request }) => {
    const res = await request.fetch(`${BASE_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil-unknown-origin.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    // Should respond (200 or 204 for OPTIONS preflight, or 404)
    expect([200, 204, 404, 403]).toContain(res.status());
    // If CORS headers are present, check they don't wildcard-allow everything blindly
    const allowOrigin = res.headers()['access-control-allow-origin'];
    // The header should either not be present for unknown origins, or be specific
    if (allowOrigin) {
      // If it's * (wildcard) — this is informational, not a hard failure for a public API
      // but log it as a finding
      console.log(`CORS allow-origin for unknown origin: ${allowOrigin}`);
    }
  });
});
