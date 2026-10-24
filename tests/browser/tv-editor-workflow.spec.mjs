import { test, expect } from '@playwright/test';
import { DEFAULT_TV_SETTINGS } from '../../supabase/functions/_shared/tv.js';

for (const [width, theme] of [[390, 'dark'], [1280, 'light']]) {
  test(`TV sections, colours and saved comparison stay in the draft at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [], writes = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((value) => {
      localStorage.setItem('jic-theme', value);
      sessionStorage.setItem('jic-salawat-shown', '1');
    }, theme);
    const actor = {
      id: '10000000-0000-4000-8000-000000000001', display_name: 'Centre owner',
      is_owner: true, is_active: true, permissions: [], staff_kinds: [],
    };
    let state = {
      settings: structuredClone(DEFAULT_TV_SETTINGS), updated_at: '2026-10-14T10:00:00Z',
      presentation: null, templates: [], inputs: [], devices: [], relayConfigured: false,
    };
    await page.route('**/preview-api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path.includes('/auth/v1/token')) {
        const expires = Math.floor(Date.now() / 1000) + 3600;
        const user = {
          id: actor.id, email: 'staff@example.invalid', role: 'authenticated', aud: 'authenticated',
          user_metadata: {}, app_metadata: {},
        };
        const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
        data = {
          user, access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: actor.id, exp: expires })}.test`,
          refresh_token: 'local-test-only', token_type: 'bearer', expires_in: 3600, expires_at: expires,
        };
      } else if (path.endsWith('/rpc/get_my_profile')) data = actor;
      else if (path.endsWith('/functions/v1/tv-control')) {
        const body = route.request().postDataJSON();
        if (body.action === 'save-background') {
          writes.push(body);
          state = { ...state, settings: body.settings, updated_at: '2026-10-18T12:00:00Z' };
        } else if (!['admin', 'status', 'public'].includes(body.action)) writes.push(body);
        data = { ...state, id: body.screenId };
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill('staff@example.invalid');
    await page.locator('input[type="password"]').fill('Local testing passphrase');
    await page.locator('form button[type="submit"], form > button').first().click();
    await expect(page.locator('.admin-toolbar')).toBeVisible();
    await page.goto('/admin?section=tv');
    await page.getByRole('button', { name: 'Edit automatic display', exact: true }).first().click();
    const workspace = page.locator('.tv-workspace');
    const displayTab = workspace.getByRole('tab', { name: 'Display', exact: true });
    const scenesTab = workspace.getByRole('tab', { name: 'Scenes', exact: true });
    const scheduleTab = workspace.getByRole('tab', { name: 'Schedule', exact: true });
    const settingsTab = workspace.getByRole('tab', { name: 'Settings', exact: true });
    await expect(displayTab).toHaveAttribute('aria-selected', 'true');
    await expect(workspace.locator('.tv-workspace-preview iframe')).toBeVisible();
    await expect(workspace.locator('.tv-layout-editor')).toHaveCount(0);
    await expect(workspace.getByRole('group', { name: 'Orientation', exact: true })).toBeHidden();
    await expect(workspace.getByRole('heading', { name: 'Scheduled overrides' })).toBeHidden();
    await expect(workspace.locator('.tv-workspace-publish button')).toBeDisabled();
    const tabHeights = await workspace.locator('[role="tab"]').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(Math.min(...tabHeights)).toBeGreaterThanOrEqual(44);
    expect(await workspace.getByRole('combobox', { name: 'Layout', exact: true }).evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    await page.screenshot({ path: testInfo.outputPath(`tv-display-${width}.png`), fullPage: true });
    await workspace.getByRole('button', { name: 'Edit display', exact: true }).click();
    const editor = workspace.locator('.tv-workspace-editor');
    await expect(editor.locator('.tv-layout-editor .scene-player')).toBeVisible();
    await expect(editor.getByRole('group', { name: 'Items on this screen', exact: true })).toBeHidden();
    await editor.getByText('Layout templates', { exact: true }).click();
    const designs = editor.locator('.tv-board-picker');
    await designs.getByRole('button', { name: /^Countdown A large/ }).click();
    if (width > 700) {
      await designs.getByRole('button', { name: 'Side by side', exact: true }).click();
      await expect(designs.locator('iframe')).toHaveCount(2);
      await expect(designs.locator('iframe').nth(1).contentFrame().locator('[data-board-layout="countdown"]')).toBeVisible();
    } else {
      await expect(designs.getByRole('button', { name: 'Side by side', exact: true })).toBeHidden();
      await expect(designs.locator('iframe')).toHaveCount(1);
    }
    expect(writes).toEqual([]);
    await designs.getByRole('button', { name: 'Close preview', exact: true }).click();
    await editor.getByText('Layout templates', { exact: true }).click();
    const sections = workspace.getByRole('combobox', { name: 'Layout', exact: true });
    await expect(sections.locator('option')).toHaveCount(6);
    await sections.selectOption('before');
    await workspace.getByRole('button', { name: 'Edit display', exact: true }).click();
    await expect(editor.getByRole('region', { name: 'Before prayer layout editor' })).toBeVisible();
    await editor.getByText('Edit an item', { exact: true }).click();
    await editor.getByRole('group', { name: 'Items on this screen', exact: true }).getByRole('button', { name: 'Before prayer message', exact: true }).click();
    await expect(editor.getByRole('group', { name: 'Before prayer message settings' })).toBeVisible();
    await editor.getByText('Colours & appearance', { exact: true }).click();
    await editor.getByRole('group', { name: 'TV colour schemes' }).getByRole('button', { name: /^Pearl/ }).click();
    await expect(editor.locator('.tv-layout-editor .scene-player')).toHaveAttribute('data-tv-theme', 'pearl');
    await scheduleTab.click();
    await expect(workspace.getByLabel('Show the reminder before Jama‘ah')).toBeVisible();
    await expect(workspace.getByRole('heading', { name: 'Scheduled overrides' })).toBeVisible();
    await expect(editor).toBeHidden();
    await settingsTab.click();
    await expect(workspace.getByRole('group', { name: 'Orientation', exact: true })).toBeVisible();
    await expect(workspace.getByLabel('Layout name', { exact: true })).toHaveValue('Before prayer');
    await displayTab.focus();
    await displayTab.press('ArrowRight');
    await expect(scenesTab).toBeFocused();
    await expect(scenesTab).toHaveAttribute('aria-selected', 'true');
    await displayTab.click();
    await expect(editor.getByRole('group', { name: 'Before prayer message settings' })).toBeVisible();
    await expect(editor.locator('.tv-layout-editor .scene-player')).toHaveAttribute('data-tv-theme', 'pearl');
    await workspace.getByText('Review your changes before saving', { exact: true }).click();
    const review = workspace.locator('.tv-draft-review');
    await expect(review.getByRole('list', { name: 'Changed settings' })).toContainText('Colour scheme');
    await review.getByRole('button', { name: 'Before · saved display' }).click();
    await expect(review.frameLocator('iframe').locator('.scene-player')).toHaveAttribute('data-tv-theme', 'midnight');
    await review.getByRole('button', { name: 'After · your changes' }).click();
    await expect(review.frameLocator('iframe').locator('.scene-player')).toHaveAttribute('data-tv-theme', 'pearl');
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await workspace.locator('.tv-workspace-publish').getByRole('button', { name: 'Publish changes', exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].settings.display_theme).toBe('pearl');
    expect(writes[0].expectedUpdatedAt).toBe('2026-10-14T10:00:00Z');
    expect(writes[0].settings.display_layouts).toEqual(DEFAULT_TV_SETTINGS.display_layouts);
    await expect(review).toHaveCount(0);
    await expect(workspace.getByText('All changes published', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
