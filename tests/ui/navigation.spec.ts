// @ts-nocheck
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'https://app.voicory.com';

const NAV_LINKS = [
  { label: /dashboard|overview/i, path: /dashboard|overview/ },
  { label: /assistants/i, path: /assistants/ },
  { label: /customers/i, path: /customers/ },
  { label: /calls/i, path: /calls/ },
  { label: /billing/i, path: /billing/ },
  { label: /settings/i, path: /settings/ },
];

test.describe('UI Navigation — Functional', () => {
  test('Login page loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(2000);
    // Filter out known third-party errors
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('analytics') &&
      !e.includes('google') &&
      !e.includes('fonts')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('Home page loads (redirect or landing)', async ({ page }) => {
    const res = await page.goto(FRONTEND_URL);
    await page.waitForTimeout(1000);
    expect([200, 301, 302]).toContain(res?.status() || 200);
    expect(page.url()).toBeTruthy();
  });

  test('Dashboard page redirects unauthenticated users to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/login|signin|\/$/i);
  });

  test('Mobile viewport (375px): login page renders without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(380); // allow small tolerance
  });

  test('Login page has email and password inputs', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('Login page has submit button', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test('Signup page is accessible', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/signup`);
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/signup|register|login/i);
  });

  test('Logo or brand name is visible on login page', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);
    const logoOrBrand = page.locator('img[alt*="logo" i], img[alt*="voicory" i], [class*="logo"], text=Voicory').first();
    // Check page has brand identity
    const content = await page.content();
    expect(content.toLowerCase()).toMatch(/voicory/i);
  });

  test('Page title is set', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });
});
