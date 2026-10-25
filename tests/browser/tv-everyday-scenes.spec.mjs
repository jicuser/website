import { test, expect } from '@playwright/test';
import { DEFAULT_TV_SETTINGS } from '../../supabase/functions/_shared/tv.js';
import { openTvAdmin, openTvScreen, TV_TEST_REVISION } from './helpers/tvAdmin.mjs';

test.use({ screenshot: 'off' });

for (const width of [390, 1280]) {
  test(`fixed sponsorship scenes and rotations save through the existing screen endpoint at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { writes, errors } = await openTvAdmin(page);
    await expect(page.locator('.tv-screen-miniature')).toHaveCount(4);
    const workspace = await openTvScreen(page);
    await workspace.getByRole('button', { name: 'Edit display', exact: true }).click();
    await workspace.getByRole('tab', { name: 'Content', exact: true }).click();
    const everyday = page.getByRole('region', { name: 'Everyday content', exact: true });
    await everyday
      .getByRole('combobox', { name: 'Scene to keep on screen' })
      .selectOption('daily-giving');
    await expect(everyday.locator('figcaption')).toContainText('Draft · Daily Giving');
    await everyday.getByText('Preview everyday content', { exact: true }).click();
    const display = everyday.frameLocator('iframe');
    await expect(display.locator('.ramadan-board[aria-label="Daily Giving"]')).toBeVisible();
    await expect(display.getByText('Day 1', { exact: true })).toBeVisible();
    expect(writes).toEqual([]);
    await everyday.getByRole('button', { name: 'Rotate scenes' }).click();
    await everyday.getByRole('button', { name: '+ Add scene', exact: true }).click();
    await everyday.getByRole('combobox', { name: 'Scene 2', exact: true }).selectOption('suhoor');
    await everyday
      .getByRole('combobox', { name: 'Show Suhoor sponsorships for', exact: true })
      .selectOption('90');
    await everyday.getByRole('button', { name: 'Move Suhoor sponsorships earlier' }).click();
    await everyday.getByText('Keep items visible across scenes', { exact: false }).click();
    await everyday.getByRole('checkbox', { name: 'Prayer timetable', exact: true }).check();
    await everyday.getByRole('checkbox', { name: 'Clock', exact: true }).check();
    await expect(
      everyday.getByRole('list', { name: 'Scene rotation order' }).locator('li'),
    ).toHaveCount(2);
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page
      .locator('.tv-workspace-publish')
      .getByRole('button', { name: 'Publish changes', exact: true })
      .click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].action).toBe('save-background');
    expect(writes[0].expectedUpdatedAt).toBe(TV_TEST_REVISION);
    expect(writes[0].settings.everyday_display).toEqual({
      mode: 'rotation',
      fixed_scene: 'daily-giving',
      rotation: [
        { kind: 'suhoor', duration_seconds: 90 },
        { kind: 'classic', duration_seconds: 20 },
      ],
      persistent_layer_ids: { landscape: ['standby-times', 'standby-clock'], portrait: [] },
    });
    expect(writes[0].settings.display_layouts).toEqual(DEFAULT_TV_SETTINGS.display_layouts);
    await expect(page.getByText('All changes published', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('phone screen choices keep saved thumbnails beside their own controls', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const { writes, errors } = await openTvAdmin(page);
  const cards = page.locator('.tv-screen-overview-card');
  await expect(cards).toHaveCount(4);
  await expect(cards.getByRole('button', { name: /^Open .* display$/ })).toHaveCount(4);
  expect(
    await cards.evaluateAll((nodes) =>
      nodes.every((node) => {
        const preview = node.querySelector('.tv-screen-miniature').getBoundingClientRect();
        const body = node.querySelector('.tv-screen-overview-body').getBoundingClientRect();
        return preview.right <= body.left && node.getBoundingClientRect().height < 240;
      }),
    ),
  ).toBe(true);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  await page.screenshot({ path: testInfo.outputPath('tv-screen-picker-320.png'), fullPage: true });
  const workspace = await openTvScreen(page, 'shoe-area');
  await expect(workspace.getByRole('button', { name: 'Go live', exact: true })).toHaveCount(0);
  await workspace.getByRole('button', { name: 'Edit display', exact: true }).click();
  await expect(
    workspace.getByRole('combobox', { name: 'Display moment', exact: true }).locator('option'),
  ).toHaveCount(1);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
