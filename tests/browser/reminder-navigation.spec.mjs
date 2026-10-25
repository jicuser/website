import { test, expect } from '@playwright/test';

const pageErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

const homeLink = (page) =>
  page.getByRole('banner').getByRole('link', { name: 'Jamatia Islamic Centre home', exact: true });
const timetableLink = (page) =>
  page
    .getByRole('complementary', { name: 'Daily prayer timetable' })
    .getByRole('link', { name: 'Timetable', exact: true });
const menuButton = (page) =>
  page.getByRole('banner').getByRole('button', { name: 'Open navigation menu', exact: true });

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
    const filters = url.searchParams.getAll('d_date');
    const first = filters.find((value) => value.startsWith('gte.'))?.slice(4);
    const last = filters.find((value) => value.startsWith('lte.'))?.slice(4);
    const date =
      filters.find((value) => value.startsWith('eq.'))?.slice(3) || first || '2026-09-13';
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
    const rows = [];
    for (
      let day = new Date(`${date}T12:00:00Z`);
      day.toISOString().slice(0, 10) <= (last || date);
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      rows.push({ ...row, d_date: day.toISOString().slice(0, 10) });
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(url.pathname.endsWith('/prayer_times') ? rows : []),
    });
  });
  await page.goto('/');
  await expect(page.locator('.jic-home-prayer')).toContainText('5:15');
  return {
    hold: () => {
      holdRequests = true;
    },
    release: releaseRequests,
  };
}

test('home shortcuts fit small phones and the prayer card opens the timetable', async ({
  page,
}, testInfo) => {
  await setup(page);
  const dock = page.locator('#jic-prayer-dock');
  const details = page.locator('#jic-prayer-details');
  await expect(details).toBeHidden();
  await expect(dock).toHaveCount(0);
  expect(
    await page
      .locator('.jic-home-prayer')
      .evaluate(
        (node) =>
          node.querySelector('.jic-home-prayer-footer').getBoundingClientRect().bottom -
          node.querySelector('.jic-prayer-browser-grid').getBoundingClientRect().top,
      ),
  ).toBeLessThanOrEqual(240);
  await timetableLink(page).click();
  await expect(page).toHaveURL('/prayer-times');
  await expect(
    page.getByRole('heading', { name: "Today's Prayer Times", exact: true }),
  ).toBeVisible();
  await expect(details).toBeHidden();
  await homeLink(page).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.jic-hero')).toBeVisible();

  await expect(
    page.locator('.jic-hero').getByRole('link', { name: /My account|Sign in|portal/i }),
  ).toHaveCount(0);
  await expect(
    page.locator('.jic-home-prayer').getByRole('link', { name: 'Salah alerts' }),
  ).toHaveAttribute('href', '/prayer-times/reminders');
  await expect(page.locator('.jic-header-portal')).toHaveCount(0);
  await menuButton(page).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Navigation menu' })
      .getByRole('link', { name: 'Portal login' }),
  ).toHaveAttribute('href', '/portal');
  await page.keyboard.press('Escape');

  for (const width of [320, 390, 767]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.jic-home-shortcuts').getByRole('link')).toHaveCount(6);
    await page.evaluate(() => window.scrollTo(0, 0));
    const servicePositions = await page.locator('.jic-home-shortcuts').evaluate((nav) => {
      const links = [...nav.querySelectorAll('a')];
      const prayer = document.querySelector('.jic-home-prayer').getBoundingClientRect();
      return {
        firstLinks: links.slice(0, 2).map((link) => link.getAttribute('href')),
        servicesVisible: links.slice(0, 2).every((link) => {
          const box = link.getBoundingClientRect();
          return box.top >= 0 && box.bottom < innerHeight;
        }),
        servicesBeforePrayer: nav.getBoundingClientRect().bottom < prayer.top,
      };
    });
    expect(servicePositions.firstLinks).toEqual(['/funerals', '/services/nikah']);
    expect(servicePositions.servicesVisible, 'Janazah and Nikah visible without scrolling').toBe(
      true,
    );
    expect(servicePositions.servicesBeforePrayer).toBe(true);
    const overflow = await page
      .locator('.jic-home-shortcuts')
      .evaluate(
        (node) =>
          node.scrollWidth > node.clientWidth + 1 ||
          document.documentElement.scrollWidth > innerWidth + 1,
      );
    expect(overflow, `Home overflow at ${width}px`).toBe(false);
    await page.locator('.jic-home-shortcuts').scrollIntoViewIfNeeded();
    await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scroll to top', exact: true })).toBeHidden();
    if (width === 390)
      await page.screenshot({ path: testInfo.outputPath('homepage-grouped-mobile.png') });
  }
  await page
    .locator('.jic-home-shortcuts')
    .getByRole('link', { name: /Janazah/ })
    .click();
  await expect(page).toHaveURL('/funerals');
});

test('desktop timetable keeps all five prayers aligned and links to the full timetable', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-15T09:00:00Z'));
  await setup(page);
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const dock = page.locator('.jic-home-prayer');
    await expect(page.locator('#jic-prayer-dock')).toHaveCount(0);
    await expect(dock).toBeVisible();
    const prayers = dock.locator('.jic-prayer-browser-item');
    await expect(prayers.locator('strong')).toHaveText(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
    await expect(prayers.filter({ hasText: 'Dhuhr' }).locator('b')).toHaveText('1:30 PM');
    await expect(timetableLink(page)).toHaveAttribute('href', '/prayer-times');
    const sizes = await dock.evaluate((node) => ({
      timetableHeight:
        node.querySelector('.jic-home-prayer-footer').getBoundingClientRect().bottom -
        node.querySelector('.jic-prayer-browser-grid').getBoundingClientRect().top,
      dateControlsHeight:
        node.querySelector('.jic-prayer-browser-controls').getBoundingClientRect().bottom -
        node.querySelector('.jic-prayer-browser-heading').getBoundingClientRect().top,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      cellsFit: [...node.querySelectorAll('.jic-prayer-browser-item')].every((cell) =>
        [...cell.children].every((child) => child.scrollWidth <= cell.clientWidth + 1),
      ),
      alignedRows: ['small', 'b'].map(
        (selector) =>
          new Set(
            [...node.querySelectorAll('.jic-prayer-browser-item')].map(
              (cell) => cell.querySelector(selector).getBoundingClientRect().top,
            ),
          ).size,
      ),
    }));
    expect(sizes.timetableHeight).toBeLessThanOrEqual(240);
    expect(sizes.dateControlsHeight).toBeLessThanOrEqual(120);
    expect(sizes.overflow).toBe(false);
    expect(sizes.cellsFit).toBe(true);
    expect(sizes.alignedRows).toEqual([1, 1]);
    if (width === 1440)
      await page.screenshot({ path: testInfo.outputPath('homepage-compact-desktop.png') });
  }
});

test('Nikah and Salah alert setup open the intended public pages', async ({ page }) => {
  await setup(page);
  await page.locator('.jic-home-shortcuts').getByRole('link', { name: /Nikah/ }).click();
  await expect(page).toHaveURL('/services/nikah');
  await page.goto('/');
  await page.locator('.jic-home-prayer').getByRole('link', { name: 'Salah alerts' }).click();
  await expect(page).toHaveURL('/prayer-times/reminders');
  await expect(page.getByRole('heading', { name: 'Salah alerts', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Add JIC to your Home Screen', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable Salah alerts', exact: true })).toHaveCount(
    0,
  );
});

test('salawat closes automatically and stays dismissed for the visit', async ({ page }) => {
  await page.clock.install();
  await setup(page, { welcome: true });
  const welcome = page.getByRole('complementary', { name: 'Salawat', exact: true });
  await expect(welcome).toBeVisible();
  await expect(welcome).toHaveCSS('position', 'fixed');
  const offset = await welcome.evaluate((node) => {
    const r = node.getBoundingClientRect();
    return {
      x: Math.abs(r.x + r.width / 2 - document.documentElement.clientWidth / 2),
      y: Math.abs(r.y + r.height / 2 - innerHeight / 2),
    };
  });
  expect(offset.x).toBeLessThanOrEqual(1);
  expect(offset.y).toBeLessThanOrEqual(1);
  await page.clock.fastForward(6000);
  await expect(welcome).toHaveCount(0);
  await page.reload();
  await expect(welcome).toHaveCount(0);
});

for (const method of ['cross', 'outside', 'escape']) {
  test(`salawat can be dismissed with ${method}`, async ({ page }) => {
    await setup(page, { welcome: true });
    const welcome = page.getByRole('complementary', { name: 'Salawat', exact: true });
    await expect(welcome).toBeVisible();
    if (method === 'cross') await welcome.getByRole('button', { name: 'Dismiss salawat' }).click();
    if (method === 'outside') await page.mouse.click(5, 5);
    if (method === 'escape') await page.keyboard.press('Escape');
    await expect(welcome).toHaveCount(0);
  });
}

test('mobile footer stays uncovered and Home returns to the prayer card', async ({
  page,
}, testInfo) => {
  await setup(page);
  await expect(
    page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('button'),
  ).toHaveCount(2);
  await page.locator('.jic-site-footer').scrollIntoViewIfNeeded();
  const dock = page.locator('#jic-prayer-dock');
  await expect(dock).toHaveCount(0);
  await page.waitForTimeout(800);
  await expect(dock).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Scroll to top', exact: true })).toHaveCount(0);
  const iconPositions = await page
    .locator('.jic-footer-icons a')
    .evaluateAll((icons) => icons.map((icon) => Math.round(icon.getBoundingClientRect().top)));
  expect(iconPositions).toHaveLength(9);
  expect(new Set(iconPositions).size).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('compact-mobile-footer.png') });
  await homeLink(page).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(dock).toHaveCount(0);
  await expect(page.locator('.jic-home-prayer')).toBeVisible();
});

test('Home cancels a prayer timetable navigation while its page is still loading', async ({
  page,
}) => {
  await setup(page);
  let releaseChunk;
  const gate = new Promise((resolve) => {
    releaseChunk = resolve;
  });
  await page.route('**/src/pages/PrayerTimesPage.jsx*', async (route) => {
    await gate;
    await route.continue();
  });
  const loading = page.waitForRequest('**/src/pages/PrayerTimesPage.jsx*');
  await timetableLink(page).click();
  await loading;
  await expect(page).toHaveURL('/prayer-times');
  try {
    await homeLink(page).click();
    await expect(page).toHaveURL('/');
  } finally {
    releaseChunk();
  }
  await expect(page.locator('.jic-hero')).toBeVisible();
});

test('header Menu stays open until a slow Prayer Times route is ready', async ({ page }) => {
  await setup(page);
  let releaseChunk;
  const gate = new Promise((resolve) => {
    releaseChunk = resolve;
  });
  await page.route('**/src/pages/PrayerTimesPage.jsx*', async (route) => {
    await gate;
    await route.continue();
  });
  await menuButton(page).click();
  const menu = page.getByRole('dialog', { name: 'Navigation menu' });
  const loading = page.waitForRequest('**/src/pages/PrayerTimesPage.jsx*');
  await menu.getByRole('link', { name: 'Salah timetable', exact: true }).click();
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
    await menuButton(page).click();
    await page
      .getByRole('dialog', { name: 'Navigation menu' })
      .getByRole('link', { name: 'Salah timetable', exact: true })
      .click();
    await expect(page).toHaveURL('/prayer-times');
    await expect(
      page.getByRole('heading', { name: "Today's Prayer Times", exact: true }),
    ).toBeVisible({ timeout: 1000 });
    await expect(
      page.getByRole('table', { name: "Today's prayer start and congregation times" }),
    ).toContainText('5:15');
    await page.screenshot({ path: testInfo.outputPath('prayer-times.png') });
    await page.locator('.jic-section-picker > summary').click();
    await page
      .getByRole('navigation', { name: 'Salah Times pages' })
      .getByRole('link', { name: 'Monthly Timetable', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Monthly Timetable', exact: true })).toBeVisible(
      { timeout: 1000 },
    );
  } finally {
    api.release();
  }
});

test('selecting the current page still closes the header Menu', async ({ page }) => {
  await setup(page);
  await menuButton(page).click();
  const menu = page.getByRole('dialog', { name: 'Navigation menu' });
  await menu.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(menu).toBeHidden({ timeout: 500 });
});

test('the slim daily reminder follows Salah bar scrolling and restores on navigation', async ({
  page,
}) => {
  await setup(page);
  const reminder = page.locator('.jic-daily-reminder');
  await expect(reminder).toHaveCSS('opacity', '1');
  const originalHeight = await reminder.evaluate((node) => node.getBoundingClientRect().height);
  expect(originalHeight).toBeLessThan(76);
  await page.mouse.wheel(0, 750);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await expect(page.locator('html')).toHaveAttribute('data-prayer-dock-hidden', 'true');
  await expect(reminder).toHaveCSS('visibility', 'hidden');
  await expect(reminder).toHaveCSS('opacity', '0');
  await page.mouse.wheel(0, -120);
  await expect(page.locator('html')).not.toHaveAttribute('data-prayer-dock-hidden', 'true');
  await expect(reminder).toHaveCSS('visibility', 'visible');
  await expect(reminder).toHaveCSS('opacity', '1');
  const reminderTop = await reminder.evaluate((node) => node.getBoundingClientRect().top);
  expect(reminderTop).toBeGreaterThanOrEqual(0);
  expect(reminderTop).toBeLessThan(100);
  await menuButton(page).click();
  await page
    .locator('#jic-site-menu')
    .getByRole('link', { name: 'Salah timetable', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: "Today's Prayer Times", exact: true }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(reminder).toHaveCSS('opacity', '1', { timeout: 100 });
});

for (const theme of ['light', 'dark']) {
  test(`daily reminder is compact and transparent in ${theme} mode with a high-contrast fallback`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      localStorage.setItem('jic-theme', mode);
      localStorage.setItem('jic_glass_enabled', 'true');
    }, theme);
    await setup(page);
    const reminder = page.locator('.jic-daily-reminder > button');
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const style = await reminder.evaluate((node) => ({
        height: node.getBoundingClientRect().height,
        background: getComputedStyle(node).backgroundColor,
        fits:
          document.documentElement.scrollWidth <= innerWidth &&
          node.scrollWidth <= node.clientWidth,
      }));
      expect(style.height).toBeGreaterThanOrEqual(44);
      expect(style.height).toBeLessThan(80);
      expect(Number(style.background.match(/[\d.]+/g)?.[3] ?? 1)).toBeLessThan(0.5);
      expect(style.fits).toBe(true);
    }
    await page.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' });
    await expect(reminder).toHaveCSS('backdrop-filter', 'none');
    const background = await reminder.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(Number(background.match(/[\d.]+/g)?.[3] ?? 1)).toBe(1);
    const duration = await page
      .locator('.jic-daily-reminder')
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).transitionDuration));
    expect(duration).toBeLessThanOrEqual(0.001);
  });
}
