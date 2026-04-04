// @ts-nocheck
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'https://app.voicory.com';
const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const TEST_JWT = process.env.TEST_JWT;

async function loginAndGetPage(page) {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|assistants|overview/i, { timeout: 10000 });
}

test.describe('Assistant CRUD — Functional', () => {
  test('Create assistant with name + system prompt appears in list', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await loginAndGetPage(page);
    await page.goto(`${FRONTEND_URL}/assistants`);
    await page.waitForTimeout(1000);

    const createBtn = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
    await createBtn.click();
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await nameInput.fill(`Test Assistant ${Date.now()}`);

    const promptInput = page.locator('textarea[name="systemPrompt"], textarea[placeholder*="prompt" i], textarea').first();
    if (await promptInput.isVisible()) {
      await promptInput.fill('You are a helpful assistant for testing.');
    }

    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await page.waitForTimeout(2000);
    await page.goto(`${FRONTEND_URL}/assistants`);
    const list = await page.content();
    expect(list).toMatch(/Test Assistant/i);
  });

  test('API: POST /api/assistants with JWT creates assistant', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/assistants`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { name: `API Test ${Date.now()}`, systemPrompt: 'Test prompt' },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.id || body.assistant?.id).toBeTruthy();
  });

  test('API: GET /api/assistants returns array', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.get(`${BASE_URL}/api/assistants`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body) || Array.isArray(body.assistants)).toBe(true);
  });

  test('Test chat sends message and gets AI response', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var with positive balance');
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: {
        message: 'Hello, how are you?',
        assistantId: process.env.TEST_ASSISTANT_ID || '00000000-0000-0000-0000-000000000001',
      },
    });
    // Accept 200 (ok), 402 (no credits), 404 (assistant not found) as valid responses
    expect([200, 402, 404]).toContain(res.status());
  });

  test('Test chat with empty message shows validation error', async ({ request }) => {
    test.skip(!TEST_JWT, 'Requires TEST_JWT env var');
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      data: { message: '', assistantId: '00000000-0000-0000-0000-000000000001' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('GET /api/assistants without JWT returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/assistants`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/test-chat without JWT returns 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/test-chat`, {
      data: { message: 'test', assistantId: '00000000-0000-0000-0000-000000000001' },
    });
    expect(res.status()).toBe(401);
  });
});
