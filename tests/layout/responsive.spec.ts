// @ts-nocheck
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'https://app.voicory.com';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

const PAGES = [
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
];

// Pages requiring auth — skip layout tests on those
const AUTH_PAGES = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'assistants', path: '/assistants' },
  { name: 'customers', path: '/customers' },
  { name: 'billing', path: '/billing' },
];

async function checkNoHorizontalScroll(page, tolerance = 5) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  return scrollWidth <= clientWidth + tolerance;
}

test.describe('Responsive Layout — Public Pages', () => {
  for (const vp of VIEWPORTS) {
    for (const pg of PAGES) {
      test(`${pg.name} at ${vp.name} (${vp.width}px) — no horizontal scroll`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${FRONTEND_URL}${pg.path}`);
        await page.waitForTimeout(1500);

        const noScroll = await checkNoHorizontalScroll(page);
        if (!noScroll) {
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          console.warn(`⚠️ Horizontal scroll detected on ${pg.name} at ${vp.width}px: scrollWidth=${scrollWidth}`);
        }
        expect(noScroll).toBe(true);
      });

      test(`${pg.name} at ${vp.name} (${vp.width}px) — page loads successfully`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const res = await page.goto(`${FRONTEND_URL}${pg.path}`);
        await page.waitForTimeout(1000);
        // Should load (200) or redirect (301/302)
        expect([200, 301, 302]).toContain(res?.status() || 200);
        const content = await page.content();
        expect(content).not.toMatch(/500 Internal Server Error/i);
      });
    }
  }

  test('Login page at mobile (375px) — form inputs are usable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check inputs are not clipped (width > 0)
    const emailBox = await emailInput.boundingBox();
    const passwordBox = await passwordInput.boundingBox();

    expect(emailBox?.width).toBeGreaterThan(100);
    expect(passwordBox?.width).toBeGreaterThan(100);
  });

  test('Login page at tablet (768px) — submit button is fully visible', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForTimeout(1000);

    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();

    const box = await submitBtn.boundingBox();
    expect(box?.width).toBeGreaterThan(50);
    expect(box?.height).toBeGreaterThan(20);
    // Should be within viewport
    expect((box?.x || 0) + (box?.width || 0)).toBeLessThanOrEqual(780);
  });

  test('Signup page at mobile (375px) — no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/signup`);
    await page.waitForTimeout(1500);

    const noScroll = await checkNoHorizontalScroll(page);
    expect(noScroll).toBe(true);
  });
});

test.describe('Responsive Layout — Auth-Required Pages (redirect check)', () => {
  for (const vp of VIEWPORTS) {
    for (const pg of AUTH_PAGES) {
      test(`${pg.name} at ${vp.name} (${vp.width}px) — redirects to login when unauthenticated`, async ({ page }) => {
        await page.context().clearCookies();
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${FRONTEND_URL}${pg.path}`);
        await page.waitForTimeout(2000);
        // Should redirect to login
        expect(page.url()).toMatch(/login|signin|\/$/i);
      });
    }
  }
});
