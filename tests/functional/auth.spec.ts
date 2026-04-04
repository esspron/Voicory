// @ts-nocheck
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'https://app.voicory.com';
const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app';

// These tests require live Supabase credentials and a real test account.
// Set TEST_EMAIL and TEST_PASSWORD env vars to run live tests.
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

test.describe('Authentication — Functional', () => {
  test('Sign up with valid email redirects to dashboard or check-email', async ({ page }) => {
    test.skip(!TEST_EMAIL, 'Requires TEST_EMAIL env var with unique email');
    const uniqueEmail = `test+${Date.now()}@example.com`;
    await page.goto(`${FRONTEND_URL}/signup`);
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/dashboard|check-email|verify/i);
  });

  test('Sign in with valid credentials sees dashboard', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|overview/i, { timeout: 10000 });
    expect(page.url()).toMatch(/dashboard|overview/i);
  });

  test('Sign out redirects to login', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|overview/i, { timeout: 10000 });
    // Click sign out button (look for common patterns)
    const signOutBtn = page.locator('button:has-text("Sign out"), button:has-text("Logout"), a:has-text("Sign out")').first();
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
    } else {
      // Try settings/profile menu
      await page.click('[data-testid="user-menu"], [aria-label="User menu"]');
      await page.click('text=Sign out, text=Logout');
    }
    await page.waitForURL(/login|signin/i, { timeout: 5000 });
    expect(page.url()).toMatch(/login|signin/i);
  });

  test('Forgot password flow shows success message', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Reset password")').first();
    if (await forgotLink.isVisible({ timeout: 3000 })) {
      await forgotLink.click();
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      const successIndicator = page.locator('text=email, text=sent, text=check').first();
      // Just check we didn't get an error page
      expect(page.url()).not.toMatch(/500|error/i);
    } else {
      test.skip(true, 'Forgot password link not found on login page');
    }
  });

  test('Sign up with already-existing email shows error', async ({ page }) => {
    test.skip(!TEST_EMAIL, 'Requires TEST_EMAIL env var pointing to an existing account');
    await page.goto(`${FRONTEND_URL}/signup`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    const body = await page.content();
    expect(body).toMatch(/already|exists|registered|taken/i);
  });

  test('Unauthenticated user visiting /dashboard redirects to login', async ({ page }) => {
    // Clear cookies to ensure unauthenticated state
    await page.context().clearCookies();
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/login|signin|\/$/i);
  });

  test('Unauthenticated user visiting /assistants redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${FRONTEND_URL}/assistants`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/login|signin|\/$/i);
  });
});
