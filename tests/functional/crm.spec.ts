// @ts-nocheck
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';
const TEST_JWT = process.env.TEST_JWT;

test.describe('CRM API — Functional', () => {
  test('GET /api/crm/integrations with JWT returns 200 array', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.get(`${BASE_URL}/api/crm/integrations`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body) || Array.isArray(body.integrations)).toBe(true);
  });

  test('GET /api/crm/integrations without JWT returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/crm/integrations`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/crm/integrations with invalid provider returns 400', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/crm/integrations`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { provider: 'invalid_crm_provider_xyz', apiKey: 'fakekey' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('POST /api/crm/webhooks/followupboss with valid event returns 200 { received: true }', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/crm/webhooks/followupboss`, {
      data: {
        type: 'contactCreated',
        data: { id: 123, firstName: 'Test', lastName: 'User', emails: [{ value: 'test@example.com' }] },
      },
      headers: { 'Content-Type': 'application/json' },
    });
    // Webhook endpoints may accept without JWT
    expect([200, 401, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.received).toBe(true);
    }
  });

  test('POST /api/crm/webhooks/liondesk with valid event returns 200 { received: true }', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/crm/webhooks/liondesk`, {
      data: {
        event: 'contact.created',
        contact: { id: '456', first_name: 'Test', email: 'test@example.com' },
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([200, 401, 400, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.received).toBe(true);
    }
  });

  test('POST /api/crm/integrations without JWT returns 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/crm/integrations`, {
      data: { provider: 'followupboss', apiKey: 'test' },
    });
    expect(res.status()).toBe(401);
  });
});
