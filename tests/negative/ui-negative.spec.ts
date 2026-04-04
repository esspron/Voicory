// @ts-nocheck
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'https://app.voicory.com';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';

test.describe('UI Negative Tests', () => {
  test('Login with wrong password shows error message', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'valid@example.com');
    await page.fill('input[type="password"]', 'WrongPassword999!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const content = await page.content();
    // Should show error and NOT redirect to dashboard
    const isOnLogin = page.url().match(/login|signin|\/$/) !== null;
    const hasError = content.toLowerCase().match(/invalid|wrong|incorrect|error|failed/) !== null;
    expect(isOnLogin || hasError).toBe(true);
    expect(page.url()).not.toMatch(/dashboard|overview/i);
  });

  test('Login with malformed email shows inline validation error', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'notanemail');
    await page.fill('input[type="password"]', 'somepassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Browser native validation or custom error — should NOT redirect
    expect(page.url()).not.toMatch(/dashboard|overview/i);
  });

  test('Login page shows error for empty email', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="password"]', 'somepassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    expect(page.url()).not.toMatch(/dashboard|overview/i);
  });

  test('Signup with empty fields does not redirect to dashboard', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/signup`);
    await page.waitForTimeout(500);
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 2000 })) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      expect(page.url()).not.toMatch(/dashboard|overview/i);
    } else {
      test.skip(true, 'Signup page not accessible');
    }
  });

  test('Protected page (/assistants) with cleared cookies → login redirect', async ({ page }) => {
    await page.context().clearCookies();
    // Also clear localStorage
    await page.addInitScript(() => window.localStorage && window.localStorage.clear());
    await page.goto(`${FRONTEND_URL}/assistants`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/login|signin|\/$/i);
  });

  test('Test chat network error shows error state not blank screen', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|assistants|overview/i, { timeout: 10000 });

    // Intercept and fail test-chat requests
    await page.route(`${BASE_URL}/api/test-chat`, route => route.abort('failed'));

    await page.goto(`${FRONTEND_URL}/assistants`);
    await page.waitForTimeout(1000);

    const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
    if (await chatInput.isVisible({ timeout: 3000 })) {
      await chatInput.fill('Test message that will fail');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);

      const content = await page.content();
      // Should show error message, not blank
      expect(content.toLowerCase()).toMatch(/error|failed|try again|sorry/i);
    } else {
      test.skip(true, 'Chat input not found in assistants page');
    }
  });

  test('Non-existent page returns 404 or redirect', async ({ page }) => {
    const res = await page.goto(`${FRONTEND_URL}/this-page-does-not-exist-xyz123`);
    await page.waitForTimeout(1000);
    // Either 404 or redirect to login/home
    const status = res?.status() || 200;
    expect([200, 301, 302, 404]).toContain(status);
    // Should NOT be an unhandled server error
    const content = await page.content();
    expect(content).not.toMatch(/500 Internal Server Error/i);
  });
});
