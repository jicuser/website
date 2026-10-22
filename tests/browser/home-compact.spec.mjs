import { test, expect } from '@playwright/test';

async function openHome(page, width) {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
}

for (const width of [320, 390, 1280]) {
  test(`What's on previews stay compact and open complete posters at ${width}px`, async ({
    page,
  }) => {
    await openHome(page, width);
    const cards = page.locator('.jic-programme-card');
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
        const poster = node.querySelector('.jic-poster-button');
        const copy = node.querySelector('.jic-programme-copy');
        return {
          height: node.getBoundingClientRect().height,
          sideBySide: poster.getBoundingClientRect().right <= copy.getBoundingClientRect().left + 1,
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
