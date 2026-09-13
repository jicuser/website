import { test, expect } from '@playwright/test';

const pageErrors = new WeakMap();
test.beforeEach(({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

// Only external data is stubbed. The actual router, hooks and UI run in the browser.
async function setup(page, { welcome = false } = {}) {
  if (!welcome) {
    await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  }
  let holdRequests = false;
  let releaseRequests;
  const gate = new Promise((resolve) => {
    releaseRequests = resolve;
  });
  await page.route('**/preview-api/**', async (route) => {
    if (holdRequests) await gate;
    const url = new URL(route.request().url());
    const date = url.searchParams.get('d_date')?.replace('eq.', '') || '2026-09-13';
    const row = {
      d_date: date,
      fajr_begins: '05:15',
      fajr_jamah: '06:00',
      sunrise: '06:35',
      zuhr_begins: '13:05',
      zuhr_jamah: '13:30',
      asr_begins: '16:15',
      asr_jamah: '17:00',
      maghrib_begins: '19:25',
      maghrib_jamah: '19:25',
      isha_begins: '20:40',
      isha_jamah: '21:00',
      is_ramadan: false,
    };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(url.pathname.endsWith('/prayer_times') ? [row] : []),
    });
  });
  await page.goto('/');
  await expect(page.locator('.jic-prayer-dock')).toContainText('5:15');
  return {
    hold: () => {
      holdRequests = true;
    },
    release: releaseRequests,
  };
}

for (const target of ['card', 'background']) {
  test(`salawat closes immediately when tapping the ${target}`, async ({ page }, testInfo) => {
    await setup(page, { welcome: true });
    const welcome = page.getByRole('dialog', { name: 'Salawat' });
    await expect(welcome).toBeVisible();
    await expect(welcome).not.toContainText(/seconds/i);
    if (target === 'card') await page.screenshot({ path: testInfo.outputPath('welcome.png') });
    if (target === 'card') await page.locator('.jic-salawat-arabic').tap();
    else await welcome.tap({ position: { x: 8, y: 100 } });
    await expect(welcome).toBeHidden({ timeout: 500 });
    await page.reload();
    await expect(welcome).toBeHidden();
  });
}

test('a scroll gesture dismisses salawat without trapping the page', async ({ page }) => {
  await setup(page, { welcome: true });
  const welcome = page.getByRole('dialog', { name: 'Salawat' });
  await expect(welcome).toBeVisible();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 190, y: 650 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 190, y: 480 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(welcome).toBeHidden({ timeout: 500 });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test('quick Menu stays open until a slow Prayer Times route is ready', async ({ page }) => {
  await setup(page);
  let releaseChunk;
  const gate = new Promise((resolve) => {
    releaseChunk = resolve;
  });
  await page.route('**/src/pages/PrayerTimesPage.jsx*', async (route) => {
    await gate;
    await route.continue();
  });
  await page.getByRole('banner').getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('navigation', { name: 'Main pages' });
  const loading = page.waitForRequest('**/src/pages/PrayerTimesPage.jsx*');
  await menu.getByRole('link', { name: 'Prayer Times', exact: true }).click();
  await loading;
  try {
    await expect(menu).toBeVisible();
    await expect(page.locator('.jic-page-loading')).toHaveCount(0);
  } finally {
    releaseChunk();
  }
  await expect(
    page.getByRole('heading', { name: "Today's Prayer Times", exact: true }),
  ).toBeVisible();
  await expect(menu).toBeHidden();
});

test('Prayer Times shows already loaded times without another loading flash', async ({
  page,
}, testInfo) => {
  const api = await setup(page);
  api.hold();
  try {
    await page.getByRole('banner').getByRole('button', { name: 'Menu', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Main pages' })
      .getByRole('link', { name: 'Prayer Times', exact: true })
      .click();
    await expect(page).toHaveURL('/prayer-times');
    await expect(
      page.getByRole('heading', { name: "Today's Prayer Times", exact: true }),
    ).toBeVisible({ timeout: 1000 });
    await expect(
      page.getByRole('table', { name: "Today's prayer start and congregation times" }),
    ).toContainText('5:15');
    await page.screenshot({ path: testInfo.outputPath('prayer-times.png') });
    await page
      .getByRole('navigation', { name: 'Prayer Times sections' })
      .getByRole('link', { name: 'Monthly Timetable', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Monthly Timetable', exact: true })).toBeVisible(
      { timeout: 1000 },
    );
  } finally {
    api.release();
  }
});

test('selecting the current page still closes the quick Menu', async ({ page }) => {
  await setup(page);
  await page.getByRole('banner').getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('navigation', { name: 'Main pages' });
  await menu.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(menu).toBeHidden({ timeout: 500 });
});

test('returning to the top for Prayer Times does not fade out the daily reminder', async ({
  page,
}) => {
  await setup(page);
  await page.mouse.wheel(0, 750);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const reminder = page.getByRole('complementary', { name: 'Daily reminder' });
  await expect(reminder).not.toHaveClass(/is-scrolling/);
  await expect(reminder).toHaveCSS('opacity', '1');
  await page
    .getByRole('navigation', { name: 'Quick navigation' })
    .getByRole('button', { name: 'Menu', exact: true })
    .click();
  await page
    .locator('#jic-site-menu')
    .getByRole('link', { name: 'Prayer Times', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: "Today's Prayer Times", exact: true }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(reminder).not.toHaveClass(/is-scrolling/, { timeout: 100 });
  await expect(reminder).toHaveCSS('opacity', '1', { timeout: 100 });
});
