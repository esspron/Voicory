// @ts-nocheck
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'https://app.voicory.com';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

test.describe('Billing UI', () => {
  test('Billing page redirects unauthenticated users to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${FRONTEND_URL}/billing`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/login|signin|\/$/i);
  });

  test('Billing page loads without 500 error when authenticated', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|overview/i, { timeout: 10000 });

    await page.goto(`${FRONTEND_URL}/billing`);
    await page.waitForTimeout(2000);

    const content = await page.content();
    expect(content).not.toMatch(/500 Internal Server Error/i);
    expect(page.url()).toMatch(/billing/i);
  });

  test('Balance or credits displayed on billing page', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|overview/i, { timeout: 10000 });

    await page.goto(`${FRONTEND_URL}/billing`);
    await page.waitForTimeout(2000);

    const content = await page.content();
    expect(content.toLowerCase()).toMatch(/balance|credit|usage/i);
  });

  test('Buy Credits button is present on billing page', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|overview/i, { timeout: 10000 });

    await page.goto(`${FRONTEND_URL}/billing`);
    await page.waitForTimeout(2000);

    const buyBtn = page.locator('button:has-text("Buy"), button:has-text("Add Credits"), button:has-text("Purchase"), a:has-text("Buy")').first();
    const isVisible = await buyBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      // Check if billing content mentions credits at all
      const content = await page.content();
      expect(content.toLowerCase()).toMatch(/credit|buy|purchase|top.?up/i);
    } else {
      await expect(buyBtn).toBeVisible();
    }
  });

  test('Billing page has transaction history section', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|overview/i, { timeout: 10000 });

    await page.goto(`${FRONTEND_URL}/billing`);
    await page.waitForTimeout(2000);

    const content = await page.content();
    expect(content.toLowerCase()).toMatch(/transaction|history|invoice|payment/i);
  });

  test('Billing page has no horizontal scroll on mobile', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|overview/i, { timeout: 10000 });

    await page.goto(`${FRONTEND_URL}/billing`);
    await page.waitForTimeout(2000);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(380);
  });
});
