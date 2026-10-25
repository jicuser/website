import { test, expect } from '@playwright/test';
import { sitewideFixture } from './helpers/sitewideFixture.mjs';

for (const [theme, width] of [
  ['dark', 390],
  ['light', 320],
  ['dark', 1280],
]) {
  test(`shared public design is readable and fits ${width}px ${theme}`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript((theme) => localStorage.setItem('jic-theme', theme), theme);
    const state = await sitewideFixture(page);
    for (const path of [
      '/education',
      '/contact',
      '/team',
      '/madrassah',
      '/madrassah/classes-courses',
      '/education/courses',
      '/education/enrolment',
      '/youth',
      '/events',
      '/education/programmes',
      '/get-involved',
      '/services',
      '/services/support',
      '/services/marriage-family',
      '/services/skills-careers',
      '/services/hall-booking',
      '/about',
      '/projects',
      '/funerals',
      '/services/nikah',
      '/donate',
      '/fundraise',
      '/ramadan',
      '/ramadan/iftar',
      '/worship',
      '/worship/daily-duas',
      '/worship/prayer-guide',
      '/worship/janazah-guide',
      '/prayer-times',
      '/prayer-times/monthly',
      '/privacy',
    ]) {
      await page.goto(path);
      await expect(page.locator('#main-content h1').first(), path).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        path,
      ).toBe(true);
      for (const choice of await page.locator('.jic-page-choice.is-featured').all()) {
        expect(
          await choice.evaluate((node) => {
            const sample = document.createElement('span');
            sample.style.color = 'var(--jic-gold)';
            node.append(sample);
            const gold = getComputedStyle(sample).color;
            sample.remove();
            return getComputedStyle(node).borderTopColor === gold;
          }),
          `${path}: featured action keeps its gold border`,
        ).toBe(true);
      }
      if (['/madrassah', '/madrassah/classes-courses', '/education', '/services'].includes(path)) {
        await page.screenshot({
          path: info.outputPath(`${path.replaceAll('/', '-')}.png`),
          fullPage: true,
        });
      }
    }
    await page.goto('/education');
    await page.getByText('Help choosing a class', { exact: true }).click();
    await expect(page.locator('.guidance-panel')).toBeVisible();
    await page.goto('/madrassah/classes-courses');
    await expect(page.getByRole('tab', { name: 'Adults', exact: true })).toHaveCount(0);
    await expect(page.locator('#main-content a[href="/education/courses"]').first()).toBeVisible();
    expect(state.errors).toEqual([]);
    expect(state.writes).toEqual([]);
  });
}

test('staff finder respects permissions and fits small screens', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const state = await sitewideFixture(page, {
    signedIn: true,
    owner: false,
    permissions: ['forms_custom'],
  });
  await page.goto('/admin?section=forms');
  const finder = page.locator('.admin-quick-find');
  await finder.locator('summary').click();
  await expect(finder.getByRole('searchbox')).toBeFocused();
  await expect(finder.locator('.admin-quick-find-results button')).toHaveCount(1);
  await expect(finder.locator('.admin-quick-find-results button')).toContainText('Forms');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath('staff-tool-finder.png'), fullPage: true });
  await finder.getByRole('searchbox').fill('finance');
  await expect(finder.getByText('No matching tools. Try a different word.')).toBeVisible();
  await finder.getByRole('searchbox').press('Escape');
  await expect(finder.locator('summary')).toBeFocused();
  await expect(finder).not.toHaveAttribute('open', '');
  expect(state.errors).toEqual([]);
});

test('finder does not bypass the staff unsaved-change warning', async ({ page }, info) => {
  const state = await sitewideFixture(page, { signedIn: true });
  await page.goto('/admin?section=prayer');
  await page.getByLabel('Asr Jama’ah', { exact: true }).fill('16:20');
  const finder = page.locator('.admin-quick-find');
  await finder.locator('summary').click();
  await finder.getByRole('searchbox').fill('notices');
  page.once('dialog', (dialog) => dialog.dismiss());
  await finder.getByRole('button', { name: /Notices/ }).click();
  await expect(page).toHaveURL(/section=prayer/);
  await expect(page.getByLabel('Asr Jama’ah', { exact: true })).toHaveValue('16:20');
  page.once('dialog', (dialog) => dialog.accept());
  await finder.getByRole('button', { name: /Notices/ }).click();
  await expect(page).toHaveURL(/section=announcements/);
  await expect(finder).not.toHaveAttribute('open', '');
  await page.goto('/admin?section=dashboard');
  await expect(page.locator('.admin-overview')).toBeVisible();
  await page.screenshot({ path: info.outputPath('staff-overview.png'), fullPage: true });
  expect(state.errors).toEqual([]);
  expect(state.writes).toEqual([]);
});
