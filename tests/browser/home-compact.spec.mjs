import { test, expect } from '@playwright/test';

async function openHome(page, width) {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
}

for (const width of [320, 390]) {
  for (const theme of ['light', 'dark']) {
    test(`compact home shortcuts and published Jummah times fit at ${width}px in ${theme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.clock.install({ time: new Date('2026-10-15T12:10:00Z') });
      await page.addInitScript((value) => {
        localStorage.setItem('jic-theme', value);
        sessionStorage.setItem('jic-salawat-shown', '1');
      }, theme);
      await page.route('**/preview-api/**', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(
            new URL(route.request().url()).pathname.endsWith('/prayer_times')
              ? [15, 16].map((day) => ({
                  d_date: `2026-10-${day}`,
                  fajr_begins: '06:15',
                  fajr_jamah: '07:00',
                  sunrise: '07:38',
                  zuhr_begins: '12:58',
                  zuhr_jamah: '13:45',
                  asr_begins: '16:14',
                  asr_jamah: '16:45',
                  maghrib_begins: '18:09',
                  maghrib_jamah: '18:09',
                  isha_begins: '19:21',
                  isha_jamah: '20:00',
                  jummah_1_start: '13:05',
                  jummah_1_jamah: '13:20',
                  jummah_2_begins: '14:20',
                  jummah_2_jamah: '14:40',
                }))
              : [],
          ),
        }),
      );
      await page.goto('/');
      const shortcuts = page.getByRole('navigation', { name: 'Services and learning' });
      await expect(shortcuts.getByRole('link')).toHaveCount(6);
      await expect(shortcuts.locator('strong')).toHaveText([
        'Janazah',
        'Nikah',
        'Learning',
        'Get support',
        'Careers',
        'Hall hire',
      ]);
      expect(
        await shortcuts
          .locator('a')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))),
      ).toEqual([
        '/funerals',
        '/services/nikah',
        '/education',
        '/services/support',
        '/services/skills-careers',
        '/services/hall-booking',
      ]);
      expect(
        await shortcuts.locator('a').evaluateAll((nodes) =>
          nodes.every((node) => {
            const rect = node.getBoundingClientRect();
            const title = node.querySelector('strong');
            return (
              rect.height >= 44 &&
              rect.height <= 60 &&
              title.scrollWidth <= title.clientWidth + 1 &&
              title.getBoundingClientRect().height <=
                parseFloat(getComputedStyle(title).lineHeight) + 1
            );
          }),
        ),
      ).toBe(true);
      const card = page.getByRole('complementary', { name: 'Prayer and radio' });
      await expect(card.getByRole('heading', { name: 'Dhuhr', exact: true })).toBeVisible();
      await expect(card.locator('.jic-home-prayer-time')).toContainText('1:45 PM');
      const friday = card.getByRole('group', { name: 'Friday Jummah times' });
      await expect(friday.getByRole('link').nth(0)).toContainText('1:20 PM');
      await expect(friday.getByRole('link').nth(1)).toContainText('2:40 PM');
      await expect(friday.getByRole('link').nth(1)).toHaveAttribute('href', '/prayer-times/jummah');
      await expect(card.getByRole('link', { name: 'Set up Salah alerts' })).toHaveAttribute(
        'href',
        '/prayer-times/reminders',
      );
      await expect(card.getByRole('link', { name: 'Listen to JIC Radio' })).toHaveAttribute(
        'href',
        '/radio',
      );
      const layout = await card.evaluate((node) => ({
        height: node.getBoundingClientRect().height,
        fits: [...node.querySelectorAll('a')].every(
          (link) => link.scrollWidth <= link.clientWidth + 1,
        ),
        pageFits: document.documentElement.scrollWidth <= innerWidth + 1,
      }));
      expect(layout.height).toBeLessThanOrEqual(185);
      expect(layout.fits).toBe(true);
      expect(layout.pageFits).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`slim-home-${theme}-${width}.png`) });
      await friday.getByRole('link').nth(1).click();
      await expect(page).toHaveURL('/prayer-times/jummah');
      if (width === 390 && theme === 'light') {
        await page.clock.setFixedTime(new Date('2026-10-16T12:30:00Z'));
        await page.goto('/');
        await expect(card.getByRole('heading', { name: 'Jummah 2', exact: true })).toBeVisible();
        await expect(card.locator('.jic-home-prayer-time')).toContainText('2:40 PM');
        await expect(friday.getByRole('link').nth(0)).toContainText('1:20 PM');
      }
    });
  }
}

for (const width of [320, 390, 1280]) {
  test(`What's on previews stay compact and open complete posters at ${width}px`, async ({
    page,
  }) => {
    await openHome(page, width);
    const cards = page.locator('.home-whats-on .whats-on-row');
    await expect(cards.first()).toBeVisible();
    await cards.first().scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        cards
          .first()
          .locator('img')
          .evaluate((image) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    const layout = await cards.evaluateAll((nodes) =>
      nodes.map((node) => {
        const poster = node.querySelector('.whats-on-poster');
        const copy = node.querySelector(':scope > div');
        return {
          height: node.getBoundingClientRect().height,
          sideBySide: copy.getBoundingClientRect().right <= poster.getBoundingClientRect().left + 1,
          contentFits: copy.scrollWidth <= copy.clientWidth + 1,
        };
      }),
    );
    for (const card of layout) {
      expect(card.height).toBeLessThan(300);
      expect(card.sideBySide).toBe(true);
      expect(card.contentFits).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await cards
      .first()
      .getByRole('button', { name: /View .* poster/ })
      .click();
    const viewer = page.getByRole('dialog');
    await expect(viewer).toBeVisible();
    await expect(viewer.getByRole('link', { name: 'Open full-size poster' })).toBeVisible();
    await expect(viewer.locator('img')).toHaveCSS('object-fit', 'contain');
    await viewer.getByRole('button', { name: /Close/ }).click();
    await expect(viewer).toBeHidden();
  });
}

test('mobile prayer overview is a labelled link to the full timetable', async ({ page }) => {
  await openHome(page, 390);
  await page.goto('/services');
  const overview = page.getByRole('link', { name: /Today.s prayer times:.*View full timetable/ });
  await expect(overview).toBeVisible();
  await expect(overview).toContainText('Full timetable');
  await overview.click();
  await expect(page).toHaveURL('/prayer-times');
});

test('a compact announcement opens its complete text at a readable size', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  const body =
    'The centre will hold a community meeting on Friday.\nPlease arrive after the evening prayer to discuss the plans.';
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        new URL(route.request().url()).pathname.endsWith('/page_content')
          ? [
              {
                content_key: 'programme_posters',
                content_value: JSON.stringify([
                  {
                    id: 'community-meeting',
                    kind: 'announcement',
                    title: 'Community meeting',
                    body,
                    images: [],
                    groups: ['home'],
                    to: '/contact',
                  },
                ]),
              },
            ]
          : [],
      ),
    }),
  );
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Read Community meeting announcement' });
  await expect(button).toBeVisible();
  await button.click();
  const viewer = page.getByRole('dialog', { name: 'Community meeting' });
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText(
    'Please arrive after the evening prayer to discuss the plans.',
  );
  await expect(viewer.locator('.jic-announcement-reading')).toHaveCSS('font-size', '16px');
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(button).toBeFocused();
});
