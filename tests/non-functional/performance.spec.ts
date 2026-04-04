// @ts-nocheck
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';
const TEST_JWT = process.env.TEST_JWT;

test.describe('Performance — Non-Functional', () => {
  test('Health endpoint responds in < 500ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE_URL}/health`);
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  test('GET /api/paddle/config responds in < 500ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE_URL}/api/paddle/config`);
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  test('GET /api/paddle/billing-status responds in < 1000ms', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const start = Date.now();
    const res = await request.get(`${BASE_URL}/api/paddle/billing-status`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    const elapsed = Date.now() - start;
    expect([200, 401]).toContain(res.status());
    expect(elapsed).toBeLessThan(1000);
  });

  test('GET /api/customers responds in < 1000ms', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const start = Date.now();
    const res = await request.get(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    const elapsed = Date.now() - start;
    expect([200]).toContain(res.status());
    expect(elapsed).toBeLessThan(1000);
  });

  test('POST /api/test-chat responds in < 10000ms (AI latency allowed)', async ({ request }) => {
    test.skip(!TEST_JWT || !process.env.TEST_ASSISTANT_ID, 'Requires TEST_JWT and TEST_ASSISTANT_ID');
    const start = Date.now();
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { message: 'Hello', assistantId: process.env.TEST_ASSISTANT_ID },
      timeout: 15000,
    });
    const elapsed = Date.now() - start;
    expect([200, 201, 402]).toContain(res.status());
    expect(elapsed).toBeLessThan(10000);
  });

  test('Health endpoint under 5 concurrent requests — all succeed', async ({ request }) => {
    const promises = Array.from({ length: 5 }, () =>
      request.get(`${BASE_URL}/health`)
    );
    const results = await Promise.all(promises);
    for (const res of results) {
      expect(res.status()).toBe(200);
    }
  });

  test('Health endpoint under 10 concurrent requests — all succeed or graceful', async ({ request }) => {
    const promises = Array.from({ length: 10 }, () =>
      request.get(`${BASE_URL}/health`)
    );
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status() === 200).length;
    // At least 80% should succeed
    expect(successCount).toBeGreaterThanOrEqual(8);
  });
});
