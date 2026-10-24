import { test, expect } from '@playwright/test';
import { CONTACT_FORM } from './helpers/builtInForms.mjs';

test.use({ screenshot: 'off' });

async function fixture(page, content = {}) {
  const state = { errors: [], writes: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET' && !path.includes('/rpc/')) state.writes.push(path);
    let data = [];
    if (path.endsWith('/page_content'))
      data = Object.entries(content).map(([content_key, content_value]) => ({
        content_key,
        content_value,
      }));
    if (path.endsWith('/rpc/get_public_form')) data = CONTACT_FORM;
    if (path.endsWith('/rpc/get_site_page'))
      data = {
        slug: 'community-study',
        title: 'Community study circle',
        placement: '/education/courses',
        form: { slug: 'contact-us' },
      };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

for (const [theme, width] of [
  ['light', 320],
  ['dark', 390],
]) {
  test(`compact choices preserve labels, visibility, filters and focus in ${theme} at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript((value) => localStorage.setItem('jic-theme', value), theme);
    const state = await fixture(page, {
      site_navigation: JSON.stringify({
        labels: { '/education': 'Learning at JIC', '/education/courses': 'Adult courses' },
      }),
      'page-visibility:/madrassah': 'false',
    });
    await page.goto('/education/');
    const picker = page.locator('.jic-section-picker');
    await expect(picker).toBeVisible();
    await expect(picker.locator('summary')).toContainText('Learning at JIC');
    await expect(page.getByRole('navigation', { name: 'Current section' })).toBeHidden();
    await expect(page.locator('.jic-unified-subnav')).toBeHidden();
    const choices = page.getByRole('navigation', { name: 'Education choices' });
    await expect(choices.locator('a[href="/madrassah"]')).toHaveCount(0);
    await expect(choices.locator('a[href="/education/courses"]')).toContainText('Adult courses');
    const row = choices.locator('a').first();
    await row.focus();
    await expect(row).toHaveCSS('outline-style', 'solid');
    await expect(row).toHaveCSS('backdrop-filter', 'none');
    expect((await row.boundingBox()).height).toBeLessThan(150);
    await picker.locator('summary').click();
    const pages = picker.getByRole('navigation');
    await expect(pages.locator('a[href="/education/courses"]')).toHaveText('Adult courses');
    await pages.locator('a[href="/education/courses"]').click();
    await expect(page).toHaveURL('/education/courses');
    await page.goto('/services');
    const directory = page.locator('.service-explorer--full');
    await expect(directory.locator('a[href="/madrassah"]')).toHaveCount(0);
    await directory.getByRole('searchbox').fill('nikah');
    await expect(directory.locator('.service-explorer-card')).toHaveCount(1);
    await expect(directory.locator('.service-explorer-card')).toContainText('Nikah');
    await directory.getByRole('button', { name: 'Clear service search', exact: true }).click();
    await directory.getByRole('button', { name: /^Learning/ }).click();
    await expect(directory.locator('.service-explorer-card')).toHaveCount(1);
    await expect(directory.locator('.service-explorer-card')).toContainText('Adult learning');
    await page.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' });
    await expect(directory.locator('.service-explorer-card')).toHaveCSS('backdrop-filter', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    expect(state.errors).toEqual([]);
    expect(state.writes).toEqual([]);
  });
}

test('programme form picker keeps its parent and direct programme destination on a trailing-slash URL', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto('/forms/contact-us/?programme=community-study');
  const picker = page.locator('.jic-section-picker');
  await expect(picker.locator('summary')).toContainText('Community study circle · Form');
  await expect(picker.locator('summary')).toContainText('Education');
  await expect(page.getByRole('navigation', { name: 'Current section' })).toBeHidden();
  await picker.locator('summary').click();
  await expect(
    picker.getByRole('link', { name: 'Community study circle', exact: true }),
  ).toHaveAttribute('href', '/pages/community-study');
  await expect(picker.locator('a[href="/education/courses"]')).toHaveAttribute(
    'aria-current',
    'location',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(picker).toBeHidden();
  await expect(page.locator('.jic-unified-subnav')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/donate');
  await expect(page.getByRole('navigation', { name: 'Current section' })).toBeVisible();
  await expect(picker).toHaveCount(0);
  expect(state.errors).toEqual([]);
  expect(state.writes).toEqual([]);
});

for (const [path, width] of [
  ['/services/hall-booking/', 390],
  ['/forms/contact-us/', 390],
  ['/services/hall-booking/', 1440],
  ['/forms/contact-us/', 1440],
]) {
  test(`${path} keeps task controls clear and offers an explicit prayer reveal at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await fixture(page);
    await page.goto(path);
    const dock = page.locator('#jic-prayer-dock');
    const reveal = page.getByRole('button', { name: 'Show prayer times', exact: true });
    await expect(dock).toHaveAttribute('aria-hidden', 'true');
    await expect(dock).toBeHidden();
    await expect(page.locator('.jic-salawat-note')).toHaveCount(0);
    await reveal.click();
    await expect(dock).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Hide prayer times', exact: true }),
    ).toHaveAttribute('aria-expanded', 'true');
    const control = path.startsWith('/forms')
      ? page.getByLabel('Name', { exact: false })
      : page.locator('.hall-calendar button').first();
    await page.keyboard.press('Tab');
    await control.focus();
    await expect(control).toBeFocused();
    await expect(dock).toHaveAttribute('aria-hidden', 'true');
    await expect(dock).toHaveAttribute('inert', '');
    await expect(control).toHaveCSS('outline-style', 'solid');
    await page.evaluate(() => scrollTo(0, 400));
    await page.evaluate(() => scrollTo(0, 0));
    await expect(dock).toBeHidden();
    if (width < 768) {
      await page
        .getByRole('navigation', { name: 'Quick navigation' })
        .getByRole('button', { name: 'Home' })
        .click();
    } else {
      await page
        .getByRole('banner')
        .getByRole('link', { name: 'Jamatia Islamic Centre home', exact: true })
        .click();
    }
    await expect(page).toHaveURL('/');
    await expect(dock).toBeVisible();
    expect(state.errors).toEqual([]);
    expect(state.writes).toEqual([]);
  });
}

test('passive salawat remains readable with reduced motion, contrast and solid appearance', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('jic_glass_enabled', 'false'));
  await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-motion', value: 'reduce' },
      { name: 'prefers-contrast', value: 'more' },
      { name: 'prefers-reduced-transparency', value: 'reduce' },
    ],
  });
  const state = await fixture(page);
  await page.goto('/');
  const note = page.getByRole('complementary', { name: 'Salawat', exact: true });
  await expect(note).toHaveCSS('backdrop-filter', 'none');
  await expect(note).toHaveCSS('animation-name', 'none');
  expect(
    await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches),
  ).toBe(true);
  await note.scrollIntoViewIfNeeded();
  await note.getByRole('button', { name: 'Dismiss salawat' }).focus();
  await expect(note.getByRole('button', { name: 'Dismiss salawat' })).toHaveCSS(
    'outline-style',
    'solid',
  );
  expect(await note.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(state.errors).toEqual([]);
  expect(state.writes).toEqual([]);
});
