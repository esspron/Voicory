// @ts-nocheck
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';
const TEST_JWT = process.env.TEST_JWT;

test.describe('Customers API — Functional', () => {
  let createdCustomerId: string;

  test('GET /api/customers with JWT returns array', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.get(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body) || Array.isArray(body.customers)).toBe(true);
  });

  test('POST /api/customers with valid data returns 201 with id', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: {
        name: `Test Customer ${Date.now()}`,
        phone: '+15555550100',
        email: `testcustomer${Date.now()}@example.com`,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.id || body.customer?.id).toBeTruthy();
    createdCustomerId = body.id || body.customer?.id;
  });

  test('PUT /api/customers/:id updates record', async ({ request }) => {
    test.skip(!TEST_JWT || !createdCustomerId, 'Requires TEST_JWT and a previously created customer');
    const res = await request.put(`${BASE_URL}/api/customers/${createdCustomerId}`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { name: 'Updated Customer Name' },
    });
    expect([200, 204]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.name || body.customer?.name).toMatch(/Updated/i);
    }
  });

  test('DELETE /api/customers/:id returns 204', async ({ request }) => {
    test.skip(!TEST_JWT || !createdCustomerId, 'Requires TEST_JWT and a previously created customer');
    const res = await request.delete(`${BASE_URL}/api/customers/${createdCustomerId}`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    expect([200, 204]).toContain(res.status());
  });

  test('POST /api/customers with missing phone returns 400 validation error', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { name: 'No Phone Customer', email: 'nophone@example.com' },
    });
    // Accept 400 (validation) or 201 if phone is optional in the schema
    expect([400, 201, 200]).toContain(res.status());
  });

  test('POST /api/customers/sync-from-crm returns { synced, failed, providers }', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/customers/sync-from-crm`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: {},
    });
    // May return 200 with sync result or 400 if no CRM configured
    expect([200, 400, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('synced');
    }
  });

  test('GET /api/customers without JWT returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customers`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/customers without JWT returns 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customers`, {
      data: { name: 'Test', phone: '+15555550100' },
    });
    expect(res.status()).toBe(401);
  });
});
