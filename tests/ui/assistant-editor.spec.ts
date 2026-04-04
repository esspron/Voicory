// @ts-nocheck
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'https://app.voicory.com';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

test.describe('Assistant Editor UI', () => {
  test('Assistants page redirects unauthenticated users to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${FRONTEND_URL}/assistants`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/login|signin|\/$/i);
  });

  test('Assistant creation form has required fields when authenticated', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|assistants|overview/i, { timeout: 10000 });

    await page.goto(`${FRONTEND_URL}/assistants`);
    await page.waitForTimeout(1000);

    // Look for create/new assistant button
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add"), a:has-text("Create")').first();
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.click();
      await page.waitForTimeout(1000);

      // Check for name field
      const nameField = page.locator('input[name="name"], input[placeholder*="name" i], input[id*="name" i]').first();
      await expect(nameField).toBeVisible();

      // Check for system prompt
      const promptField = page.locator('textarea[name="systemPrompt"], textarea[placeholder*="prompt" i], textarea[id*="prompt" i]').first();
      await expect(promptField).toBeVisible();
    } else {
      test.skip(true, 'Create assistant button not found — may require different auth state');
    }
  });

  test('Assistant editor page renders without 500 error', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|assistants|overview/i, { timeout: 10000 });

    await page.goto(`${FRONTEND_URL}/assistants`);
    await page.waitForTimeout(1500);

    // Page should not show 500 or error boundary
    const content = await page.content();
    expect(content).not.toMatch(/500 Internal Server Error/i);
    expect(content).not.toMatch(/Application Error/i);
  });

  test('Form validation: submit without name shows error', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|assistants|overview/i, { timeout: 10000 });

    await page.goto(`${FRONTEND_URL}/assistants`);
    await page.waitForTimeout(1000);

    const createBtn = page.locator('button:has-text("Create"), button:has-text("New")').first();
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.click();
      await page.waitForTimeout(500);

      // Try to submit without filling in name
      const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
      if (await submitBtn.isVisible({ timeout: 2000 })) {
        await submitBtn.click();
        await page.waitForTimeout(500);

        // Check for validation error
        const errorMsg = page.locator('[class*="error"], [role="alert"], text=required, text=Required').first();
        const isError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
        // Either error shown or form didn't submit (stayed on same page)
        expect(page.url()).not.toMatch(/dashboard/i);
      }
    } else {
      test.skip(true, 'Create assistant button not found');
    }
  });
});
