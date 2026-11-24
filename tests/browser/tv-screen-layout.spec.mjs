import { test, expect } from '@playwright/test';
import { TV_SCREENS } from '../../supabase/functions/_shared/tv.js';
import { openTvAdmin } from './helpers/tvAdmin.mjs';

for (const width of [320, 390, 1280]) {
  test(`all four TV cards have separate visible click targets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { writes, errors } = await openTvAdmin(page);
    const cards = page.locator('.tv-screen-overview-card');
    await expect(cards).toHaveCount(4);
    await expect(cards.locator('.tv-screen-miniature')).toHaveCount(4);

    const layout = await cards.evaluateAll((elements) =>
      elements.map((card) => {
        const box = card.getBoundingClientRect();
        const button = card.querySelector('.tv-screen-open').getBoundingClientRect();
        const preview = card.querySelector('.tv-screen-miniature').getBoundingClientRect();
        const body = card.querySelector('.tv-screen-overview-body').getBoundingClientRect();
        return {
          label: card.querySelector('.tv-screen-open').getAttribute('aria-label'),
          left: box.left,
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
          buttonContained:
            button.left >= box.left - 1 &&
            button.right <= box.right + 1 &&
            button.top >= box.top - 1 &&
            button.bottom <= box.bottom + 1,
          previewBesideLabel: preview.right <= body.left + 1,
        };
      }),
    );
    for (const [index, card] of layout.entries()) {
      expect(card.width, card.label).toBeGreaterThan(200);
      expect(card.height, card.label).toBeGreaterThanOrEqual(44);
      expect(card.height, card.label).toBeLessThan(240);
      expect(card.buttonContained, card.label).toBe(true);
      expect(card.previewBesideLabel, card.label).toBe(true);
      for (const other of layout.slice(index + 1)) {
        const separate =
          card.right <= other.left ||
          other.right <= card.left ||
          card.bottom <= other.top ||
          other.bottom <= card.top;
        expect(separate, `${card.label} must not overlap ${other.label}`).toBe(true);
      }
    }
    expect(
      await page
        .locator('.tv-screen-overview-grid')
        .evaluate((grid) => grid.scrollWidth <= grid.clientWidth + 1),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );

    for (const screen of TV_SCREENS) {
      const open = page.getByRole('button', { name: `Open ${screen.label} display`, exact: true });
      await open.scrollIntoViewIfNeeded();
      expect(
        await open.evaluate((button) => {
          const box = button.getBoundingClientRect();
          return button.contains(
            document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
          );
        }),
        `${screen.label} must receive its own pointer events`,
      ).toBe(true);
      await open.click();
      await expect(
        page
          .locator('.stream-setup-heading')
          .getByRole('heading', { name: screen.label, exact: true }),
      ).toBeVisible();
      await expect(page.locator('.tv-workspace')).toBeVisible();
      await page.locator('.tv-screen-back').click();
      await expect(cards).toHaveCount(4);
    }
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}
