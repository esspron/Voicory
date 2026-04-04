// @ts-nocheck
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';
const TEST_JWT = process.env.TEST_JWT;

test.describe('Billing API — Functional', () => {
  test('GET /api/paddle/billing-status with valid JWT returns { creditsBalance }', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.get(`${BASE_URL}/api/paddle/billing-status`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.creditsBalance !== undefined).toBe(true);
  });

  test('GET /api/paddle/billing-status without JWT returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/paddle/billing-status`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/test-chat with zero balance returns 402 insufficient_credits', async ({ request }) => {
    test.skip(!process.env.TEST_JWT_ZERO_BALANCE, 'Requires TEST_JWT_ZERO_BALANCE env var pointing to zero-balance account');
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      headers: { Authorization: `Bearer ${process.env.TEST_JWT_ZERO_BALANCE}` },
      data: { message: 'Hello', assistantId: '00000000-0000-0000-0000-000000000001' },
    });
    expect(res.status()).toBe(402);
    const body = await res.json();
    expect(body.error || body.code).toMatch(/credit|balance|insufficient/i);
  });

  test('POST /api/test-chat with positive balance returns 200 or valid response', async ({ request }) => {
    test.skip(!TEST_JWT || !process.env.TEST_ASSISTANT_ID, 'Requires TEST_JWT and TEST_ASSISTANT_ID env vars');
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { message: 'Say hello in one word', assistantId: process.env.TEST_ASSISTANT_ID },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.response || body.message || body.content).toBeTruthy();
  });

  test('GET /api/paddle/transactions with JWT returns array', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.get(`${BASE_URL}/api/paddle/transactions`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body) || Array.isArray(body.transactions)).toBe(true);
  });

  test('POST /api/paddle/webhook without signature returns 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/paddle/webhook`, {
      data: { event_type: 'transaction.completed', data: {} },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('GET /api/paddle/config returns client token', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/paddle/config`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.clientToken).toBeTruthy();
  });
});
