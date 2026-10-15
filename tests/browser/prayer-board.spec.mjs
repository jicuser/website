import { test, expect } from '@playwright/test';
import { DEFAULT_TV_SETTINGS } from '../../supabase/functions/_shared/tv.js';
import { withTvBoardLayout } from '../../src/lib/tvBoardLayouts.js';

const row = (d_date) => ({
  d_date,
  fajr_begins: '06:15',
  fajr_jamah: '06:45',
  sunrise: '07:33',
  zuhr_begins: '12:58',
  zuhr_jamah: '13:45',
  asr_begins: '16:20',
  asr_jamah: '17:15',
  maghrib_begins: '18:16',
  maghrib_jamah: '18:20',
  isha_begins: '19:27',
  isha_jamah: '20:15',
  is_ramadan: false,
});

async function setup(page, settings, at = '2026-10-15T12:10:17Z') {
  await page.clock.install({ time: new Date(at) });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', (route) => {
    const url = new URL(route.request().url());
    let data = [];
    if (url.pathname.endsWith('/prayer_times')) data = [row('2026-10-15'), row('2026-10-16')];
    if (url.pathname.endsWith('/functions/v1/tv-control')) {
      const { action } = route.request().postDataJSON();
      data = action === 'display-code'
        ? { code: '123456', expires_at: '2026-10-15T13:00:00Z' }
        : { displayMode: 'normal', settings, paired: false, inputs: [] };
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return errors;
}

for (const orientation of ['landscape', 'portrait']) {
  for (const id of ['classic', 'countdown', 'noticeboard']) {
    test(`${id} board fits ${orientation} and uses the published times`, async ({
      page,
    }, testInfo) => {
      const settings = {
        ...structuredClone(DEFAULT_TV_SETTINGS),
        display_orientation: orientation,
        prayer_enabled: false,
        auto_jummah: false,
        ramadan_calendar: 'off',
        poster_ids: ['community-announcements'],
      };
      settings.display_layouts = withTvBoardLayout(settings, id);
      const errors = await setup(page, settings);
      await page.setViewportSize(
        orientation === 'portrait' ? { width: 720, height: 1280 } : { width: 1280, height: 720 },
      );
      await page.goto('/tv179/mens-main');
      const board = page.locator('.scene-canvas.is-prayer-board');
      await expect(board).toHaveAttribute('data-board-layout', id);
      await expect(board).toContainText('1:45 PM');
      await expect(board.locator('.scene-clock-date')).toContainText('15 October 2026');
      await expect(page.locator('.display-code-number')).toBeVisible();
      await expect(page.locator('.display-code-error')).toHaveCount(0);
      expect(await board.locator('.scene-brand-block img').evaluate((img) => {
        const bounds = img.closest('.scene-layer').getBoundingClientRect();
        const rect = img.getBoundingClientRect();
        return img.complete && img.naturalWidth > 0
          && rect.top >= bounds.top - 1 && rect.left >= bounds.left - 1
          && rect.bottom <= bounds.bottom + 1 && rect.right <= bounds.right + 1;
      })).toBe(true);
      expect(await page.locator('.display-code-number').evaluate((code) => {
        const rect = code.getBoundingClientRect();
        return [...document.querySelectorAll('.scene-layer')].every((layer) => {
          const bounds = layer.getBoundingClientRect();
          return rect.bottom <= bounds.top || rect.top >= bounds.bottom
            || rect.right <= bounds.left || rect.left >= bounds.right;
        });
      })).toBe(true);
      if (id === 'countdown') {
        await expect(board.locator('.scene-countdown')).toBeVisible();
        await expect(board.locator('.scene-next-heading')).toContainText('Dhuhr');
        await expect(board.locator('.scene-source-poster')).toHaveCount(0);
        const seconds = await board.locator('.scene-countdown').getAttribute('aria-label');
        await page.clock.fastForward(2000);
        await expect(board.locator('.scene-countdown')).not.toHaveAttribute('aria-label', seconds);
      } else await expect(board.locator('.announcement-poster')).toBeVisible();
      const overflow = await board.evaluate((element) => {
        const issues = [];
        for (const block of element.querySelectorAll('.scene-layer')) {
          const bounds = block.getBoundingClientRect();
          const range = document.createRange();
          const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            if (!node.textContent.trim()) continue;
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
              if (
                rect.width &&
                (rect.top < bounds.top - 1 ||
                  rect.bottom > bounds.bottom + 1 ||
                  rect.left < bounds.left - 1 ||
                  rect.right > bounds.right + 1)
              )
                issues.push(node.textContent);
            }
          }
        }
        return issues;
      });
      expect(overflow).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${id}-${orientation}.png`) });
      expect(errors).toEqual([]);
    });
  }
}

test('the board moves through countdown, jamaah, dhikr and back to the saved layout', async ({
  page,
}) => {
  const settings = {
    ...structuredClone(DEFAULT_TV_SETTINGS),
    auto_jummah: false,
    ramadan_calendar: 'off',
  };
  settings.display_layouts = withTvBoardLayout(settings, 'countdown');
  const errors = await setup(page, settings, '2026-10-15T12:44:20Z');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/tv179/mens-main');
  await expect(page.locator('.tv-iqamah-countdown')).toContainText('00:');
  await expect(page.getByRole('heading', { name: 'Jama‘ah begins shortly' })).toBeVisible();
  await page.clock.fastForward(45000);
  await expect(page.getByRole('heading', { name: 'It is Jama‘ah time' })).toBeVisible();
  await expect(page.locator('.tv-iqamah-countdown')).toHaveCount(0);
  await page.clock.fastForward(9 * 60000);
  await expect(page.locator('.tv-dhikr')).toBeVisible();
  await page.clock.fastForward(11 * 60000);
  await expect(page.locator('[data-board-layout="countdown"]')).toBeVisible();
  await expect(page.locator('.scene-next-heading')).toContainText('Asr');
  expect(errors).toEqual([]);
});
