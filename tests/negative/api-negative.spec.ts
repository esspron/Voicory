// @ts-nocheck
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';
const TEST_JWT = process.env.TEST_JWT;

test.describe('API Negative Tests — Edge Cases', () => {
  test('POST /api/customers with empty body → 400', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${TEST_JWT}`, 'Content-Type': 'application/json' },
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test('POST /api/customers with email missing @ → 400', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { name: 'Test', phone: '+15555550100', email: 'notanemail' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('GET /api/customers/:id with non-existent UUID → 404', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.get(`${BASE_URL}/api/customers/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    expect([404, 400]).toContain(res.status());
  });

  test('DELETE /api/customers/:id belonging to another user → 403 or 404', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    // Use a plausible but non-owned UUID
    const res = await request.delete(`${BASE_URL}/api/customers/11111111-1111-1111-1111-111111111111`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    expect([403, 404]).toContain(res.status());
  });

  test('POST /api/test-chat with message > 10000 chars → 400', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const longMessage = 'A'.repeat(10001);
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { message: longMessage, assistantId: '00000000-0000-0000-0000-000000000001' },
    });
    expect([400, 413, 422]).toContain(res.status());
  });

  test('POST /api/test-chat with invalid assistantId (not UUID) → 400', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { message: 'hello', assistantId: 'not-a-uuid' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('POST /api/test-chat with assistantId belonging to another user → 403 or 404', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { message: 'hello', assistantId: '22222222-2222-2222-2222-222222222222' },
    });
    expect([403, 404, 400]).toContain(res.status());
  });

  test('Malformed JSON body → 400', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_JWT}`,
        'Content-Type': 'application/json',
      },
      body: '{ this is not valid json !!!',
    });
    expect([400, 415, 422]).toContain(res.status());
  });

  test('POST /api/paddle/webhook with tampered signature → 400 or 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/paddle/webhook`, {
      headers: {
        'Content-Type': 'application/json',
        'Paddle-Signature': 'ts=1234567890;h1=tamperedsignaturevalue',
      },
      data: {
        event_type: 'transaction.completed',
        data: { id: 'txn_fake_123' },
      },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('GET /api/customers with malformed Authorization header → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customers`, {
      headers: { Authorization: 'NotBearer token' },
    });
    expect(res.status()).toBe(401);
  });

  test('PUT /api/customers/:id with non-existent UUID → 404', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.put(`${BASE_URL}/api/customers/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { name: 'Updated Name' },
    });
    expect([403, 404]).toContain(res.status());
  });
});
