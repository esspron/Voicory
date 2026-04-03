import { test, expect } from '@playwright/test';

const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';

test.describe('Backend Health & Public Endpoints', () => {
  test('GET /health returns 200 with status healthy', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  test('GET /api/paddle/config returns 200 with clientToken', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/paddle/config`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.clientToken).toBeTruthy();
    expect(body.configured).toBe(true);
  });

  test('POST /api/paddle/webhook without valid signature returns 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/paddle/webhook`, {
      data: { test: 1 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/twilio/webhook (non-existent route) returns 404', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/twilio/webhook`, {
      form: { test: '1' },
    });
    // Route doesn't exist — expect 404, not an HTML 500
    expect(res.status()).toBe(404);
  });
});
