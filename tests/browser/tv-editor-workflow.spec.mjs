import { test, expect } from '@playwright/test';
import { DEFAULT_TV_SETTINGS } from '../../supabase/functions/_shared/tv.js';
import { openTvAdmin, openTvScreen, TV_TEST_REVISION, TV_TEST_USER } from './helpers/tvAdmin.mjs';

for (const [width, theme] of [
  [390, 'dark'],
  [1280, 'light'],
]) {
  test(`TV layout, content and timing stay in a scoped draft at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const { writes, errors } = await openTvAdmin(page, { theme });
    const workspace = await openTvScreen(page);
    const displayTab = workspace.getByRole('tab', { name: 'Display', exact: true });
    const scheduleTab = workspace.getByRole('tab', { name: 'Schedule', exact: true });
    const settingsTab = workspace.getByRole('tab', { name: 'Settings', exact: true });
    await expect(displayTab).toHaveAttribute('aria-selected', 'true');
    await expect(workspace.locator('.tv-workspace-preview iframe')).toBeVisible();
    await expect(
      workspace.locator('.tv-workspace-preview').frameLocator('iframe').locator('.scene-player'),
    ).toBeVisible();
    await expect(workspace.locator('.tv-layout-editor')).toHaveCount(0);
    await expect(workspace.getByRole('heading', { name: 'Scheduled overrides' })).toBeHidden();
    await expect(
      workspace
        .locator('.tv-workspace-publish')
        .getByRole('button', { name: 'Publish changes', exact: true }),
    ).toHaveCount(0);
    const previewBox = await workspace
      .locator('.tv-workspace-preview .admin-tv-preview')
      .boundingBox();
    expect(previewBox.width / previewBox.height).toBeCloseTo(16 / 9, 1);
    const tabHeights = await workspace
      .locator('[role="tab"]')
      .evaluateAll((elements) =>
        elements
          .filter((element) => element.getClientRects().length)
          .map((element) => element.getBoundingClientRect().height),
      );
    expect(Math.min(...tabHeights)).toBeGreaterThanOrEqual(44);
    await displayTab.focus();
    await displayTab.press('ArrowRight');
    await expect(scheduleTab).toBeFocused();
    await expect(scheduleTab).toHaveAttribute('aria-selected', 'true');
    await scheduleTab.press('End');
    await expect(settingsTab).toBeFocused();
    await displayTab.click();
    await expect(
      workspace.locator('.tv-workspace-preview').frameLocator('iframe').locator('.scene-player'),
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`tv-display-${width}.png`), fullPage: true });

    await workspace.getByRole('button', { name: 'Edit display', exact: true }).click();
    const editor = workspace.locator('.tv-workspace-editor');
    const editorTabs = workspace.getByRole('tablist', { name: 'Edit display', exact: true });
    const layoutTab = editorTabs.getByRole('tab', { name: 'Layout', exact: true });
    const contentTab = editorTabs.getByRole('tab', { name: 'Content', exact: true });
    const timingTab = editorTabs.getByRole('tab', { name: 'Timing', exact: true });
    await expect(layoutTab).toHaveAttribute('aria-selected', 'true');
    await expect(editor.locator('.tv-layout-editor .scene-player')).toBeVisible();
    await layoutTab.focus();
    await layoutTab.press('ArrowRight');
    await expect(contentTab).toBeFocused();
    await expect(
      workspace.getByRole('region', { name: 'Everyday content', exact: true }),
    ).toBeVisible();
    await contentTab.press('End');
    await expect(timingTab).toBeFocused();
    await expect(workspace.getByLabel('Show the reminder before Jama‘ah')).toBeVisible();
    await expect(workspace.getByRole('heading', { name: 'Scheduled overrides' })).toBeVisible();
    await layoutTab.click();
    const designs = editor.locator('.tv-board-picker');
    await expect(designs).toBeVisible();
    await designs.getByRole('button', { name: /^Countdown A large/ }).click();
    if (width > 700) {
      await designs.getByRole('button', { name: 'Side by side', exact: true }).click();
      await expect(designs.locator('iframe')).toHaveCount(2);
      await expect(
        designs.locator('iframe').nth(1).contentFrame().locator('[data-board-layout="countdown"]'),
      ).toBeVisible();
    } else {
      await expect(designs.getByRole('button', { name: 'Side by side', exact: true })).toBeHidden();
      await expect(designs.locator('iframe')).toHaveCount(1);
    }
    expect(writes).toEqual([]);
    await designs.getByRole('button', { name: 'Close preview', exact: true }).click();

    const moments = workspace.getByRole('combobox', { name: 'Display moment', exact: true });
    await expect(moments.locator('option')).toHaveCount(6);
    await moments.selectOption('before');
    await expect(editor.getByRole('region', { name: 'Before prayer layout editor' })).toBeVisible();
    await editor.getByText('Colours & appearance', { exact: true }).click();
    await editor
      .getByRole('group', { name: 'TV colour schemes' })
      .getByRole('button', { name: /^Pearl/ })
      .click();
    await expect(editor.locator('.tv-layout-editor .scene-player')).toHaveAttribute(
      'data-tv-theme',
      'pearl',
    );
    await page.screenshot({ path: testInfo.outputPath(`tv-editor-${width}.png`), fullPage: true });
    await workspace.getByRole('button', { name: 'Done editing', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await workspace.getByText('Review before publishing', { exact: true }).click();
    const review = workspace.locator('.tv-draft-review');
    await expect(review.getByRole('list', { name: 'Changed settings' })).toContainText(
      'Colour scheme',
    );
    await review.getByRole('button', { name: 'Before · saved display' }).click();
    await expect(review.frameLocator('iframe').locator('.scene-player')).toHaveAttribute(
      'data-tv-theme',
      'midnight',
    );
    await review.getByRole('button', { name: 'After · your changes' }).click();
    await expect(review.frameLocator('iframe').locator('.scene-player')).toHaveAttribute(
      'data-tv-theme',
      'pearl',
    );
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await workspace
      .locator('.tv-workspace-publish')
      .getByRole('button', { name: 'Publish changes', exact: true })
      .click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].screenId).toBe('mens-main');
    expect(writes[0].settings.display_theme).toBe('pearl');
    expect(writes[0].expectedUpdatedAt).toBe(TV_TEST_REVISION);
    expect(writes[0].settings.display_layouts).toEqual(DEFAULT_TV_SETTINGS.display_layouts);
    await expect(review).toHaveCount(0);
    await expect(workspace.getByText('All changes published', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('saved draft survives refresh only for its selected screen and publishes once', async ({
  page,
}) => {
  const { writes, errors, states } = await openTvAdmin(page);
  const workspace = await openTvScreen(page);
  await workspace.getByRole('tab', { name: 'Settings', exact: true }).click();
  await workspace
    .getByRole('group', { name: 'Orientation', exact: true })
    .getByRole('button', { name: 'Portrait', exact: true })
    .click();
  await workspace
    .locator('.tv-workspace-publish')
    .getByRole('button', { name: 'Save draft', exact: true })
    .click();
  await expect(workspace.getByText('Draft saved in this tab', { exact: true })).toBeVisible();
  const key = `jic-tv-display-draft:${TV_TEST_USER}:mens-main`;
  expect(await page.evaluate((key) => Boolean(sessionStorage.getItem(key)), key)).toBe(true);
  expect(writes).toEqual([]);
  page.on('dialog', (dialog) => dialog.accept());
  await page.reload();
  await openTvScreen(page, 'ladies-upstairs');
  await expect(workspace.locator('.tv-workspace-preview .admin-tv-preview')).not.toHaveClass(
    /is-portrait/,
  );
  await page.getByRole('button', { name: 'TV screens', exact: true }).click();
  await openTvScreen(page);
  await expect(workspace.locator('.tv-workspace-preview .admin-tv-preview')).toHaveClass(
    /is-portrait/,
  );
  const preview = await workspace.locator('.tv-workspace-preview .admin-tv-preview').boundingBox();
  expect(preview.width / preview.height).toBeCloseTo(9 / 16, 1);
  expect(writes).toEqual([]);
  await workspace
    .locator('.tv-workspace-publish')
    .getByRole('button', { name: 'Publish changes', exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].screenId).toBe('mens-main');
  expect(writes[0].expectedUpdatedAt).toBe(TV_TEST_REVISION);
  expect(states['mens-main'].settings.display_orientation).toBe('portrait');
  expect(states['ladies-upstairs'].settings.display_orientation).toBe('landscape');
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull();
  expect(errors).toEqual([]);
});

test('Go live opens the selected hall setup and returns without starting a session', async ({
  page,
}, testInfo) => {
  const { writes, errors } = await openTvAdmin(page);
  const workspace = await openTvScreen(page, 'ladies-upstairs');
  await workspace.getByRole('button', { name: 'Go live', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Back to display', exact: true })).toBeVisible();
  await expect(page.locator('.stream-setup-heading')).toContainText('Ladies’ Upstairs Hall');
  await expect(
    page.getByRole('button', { name: 'Start live on Ladies’ Upstairs Hall', exact: true }),
  ).toBeDisabled();
  const sources = page.getByRole('group', { name: 'Live content source', exact: true });
  await expect(sources.getByRole('button')).toHaveCount(6);
  await page.screenshot({ path: testInfo.outputPath('tv-go-live-390.png'), fullPage: true });
  await sources.getByRole('button', { name: 'Message', exact: true }).click();
  const content = page.getByRole('dialog');
  await expect(content.getByRole('textbox', { name: 'Notice', exact: true })).toBeVisible();
  await content
    .getByRole('textbox', { name: 'Notice', exact: true })
    .fill('Please keep the doorway clear.');
  await content.getByRole('button', { name: 'Close content editor', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Start live on Ladies’ Upstairs Hall', exact: true }),
  ).toBeDisabled();
  expect(writes).toEqual([]);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Back to display', exact: true }).click();
  await expect(workspace.getByRole('tab', { name: 'Display', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.stream-setup-heading')).toContainText('Ladies’ Upstairs Hall');
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test('reverting a saved draft protects the newer settings until the tab draft is cleared', async ({
  page,
}) => {
  const { writes, errors } = await openTvAdmin(page);
  const workspace = await openTvScreen(page);
  await workspace.getByRole('tab', { name: 'Settings', exact: true }).click();
  const orientation = workspace.getByRole('group', { name: 'Orientation', exact: true });
  await orientation.getByRole('button', { name: 'Portrait', exact: true }).click();
  await workspace
    .locator('.tv-workspace-publish')
    .getByRole('button', { name: 'Save draft', exact: true })
    .click();
  const key = `jic-tv-display-draft:${TV_TEST_USER}:mens-main`;
  expect(
    await page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem(key)).form.display_orientation,
      key,
    ),
  ).toBe('portrait');
  await orientation.getByRole('button', { name: 'Landscape', exact: true }).click();
  await workspace.getByRole('tab', { name: 'Display', exact: true }).click();
  const confirmations = [];
  page.once('dialog', async (dialog) => {
    confirmations.push(dialog.message());
    await dialog.dismiss();
  });
  await workspace.getByRole('button', { name: 'Go live', exact: true }).click();
  await expect(workspace).toBeVisible();
  expect(confirmations).toHaveLength(1);
  page.once('dialog', async (dialog) => {
    confirmations.push(dialog.message());
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'TV screens', exact: true }).click();
  await expect(workspace).toBeVisible();
  expect(confirmations).toHaveLength(2);
  await workspace
    .locator('.tv-workspace-publish')
    .getByRole('button', { name: 'Save draft', exact: true })
    .click();
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull();
  await page.getByRole('button', { name: 'TV screens', exact: true }).click();
  await openTvScreen(page);
  await expect(workspace.locator('.tv-workspace-preview .admin-tv-preview')).not.toHaveClass(
    /is-portrait/,
  );
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
