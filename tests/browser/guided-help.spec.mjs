import { test, expect } from '@playwright/test';
import { GUIDED_JOURNEYS, GUIDANCE_TOPICS } from '../../src/features/guidance/journeys.js';

async function prepare(page, theme = 'light') {
  await page.addInitScript((value) => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    localStorage.setItem('jic-theme', value);
  }, theme);
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: route.request().url().includes('/rpc/get_public_form') ? 'null' : '[]',
    }),
  );
}

test('Hub groups direct services and worship without changing the five-section menu', async ({ page }) => {
  await prepare(page);
  await page.goto('/services');
  await expect(page.getByRole('heading', { name: 'Community Hub', exact: true })).toBeVisible();
  const directory = page.locator('.community-hub-grid');
  await expect(directory.getByRole('link')).toHaveCount(8);
  for (const href of [
    '/services/support',
    '/services/marriage-family',
    '/services/skills-careers',
    '/education',
    '/funerals',
    '/worship',
    '/youth',
    '/services/hall-booking',
  ]) {
    await expect(directory.locator(`a[href="${href}"]`)).toBeVisible();
  }
  await expect(page.locator('.guidance-panel')).toBeVisible();
  await directory.getByRole('link', { name: 'Worship & Adhkar', exact: true }).click();
  await expect(page.locator('.worship-compact-resources a[href="/worship/quran"]')).toBeVisible();
  await expect(page.locator('.worship-compact-resources a[href="/worship/daily-duas"]')).toBeVisible();
  await page.goto('/services');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.locator('#jic-site-menu .jic-unified-menu-row > a')).toHaveCount(5);
});

test('careers questions give a useful result, backtracking clears the branch, and restart resets', async ({
  page,
}) => {
  await prepare(page);
  await page.goto('/services/skills-careers');
  const guide = page.locator('.guidance-panel');
  await page
    .getByRole('group', { name: 'Topics', exact: true })
    .getByRole('button', { name: 'CV & interviews', exact: true })
    .click();
  await guide.getByRole('button', { name: 'My CV', exact: true }).click();
  await expect(guide.getByRole('heading', { name: 'Where are you starting?' })).toBeFocused();
  await guide.getByRole('button', { name: 'I need my first CV' }).click();
  await expect(guide.getByRole('heading', { name: 'Build your first CV' })).toBeVisible();
  await expect(guide.locator('form,input,textarea')).toHaveCount(0);
  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await guide.getByRole('button', { name: 'An interview', exact: true }).click();
  await expect(guide.getByRole('heading', { name: 'Prepare for your interview' })).toBeVisible();
  await expect(guide.getByText('Build your first CV', { exact: true })).toHaveCount(0);
  await guide.getByRole('button', { name: 'Start again' }).click();
  await expect(
    guide.getByRole('heading', { name: 'What would you like help with?' }),
  ).toBeVisible();
});

test('support answers cause no writes, storage or URL changes and clear on leaving', async ({
  page,
}) => {
  await prepare(page);
  await page.goto('/services/support');
  const guide = page.locator('.guidance-panel');
  await expect(page.locator('.guidance-urgent a[href="tel:999"]')).toBeVisible();
  const storage = () =>
    page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const before = await storage();
  const requests = [];
  page.on('request', (request) =>
    requests.push({ url: request.url(), method: request.method(), data: request.postData() }),
  );
  await page.getByRole('button', { name: 'Bereavement', exact: true }).click();
  await guide.getByRole('button', { name: 'Support with bereavement' }).click();
  await expect(guide.getByRole('heading', { name: 'Support through bereavement' })).toBeVisible();
  expect(await storage()).toEqual(before);
  await expect(page).toHaveURL('/services/support');
  expect(requests.filter((request) => request.method !== 'GET')).toEqual([]);
  await page.locator('.guidance-back-link').click();
  await page.locator('.community-hub-grid a[href="/services/support"]').click();
  await expect(guide).toBeVisible();
  await expect(page.getByRole('button', { name: 'Wellbeing', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('every careers, support and family topic reaches its result without a form', async ({
  page,
}) => {
  await prepare(page);
  for (const [id, path] of [
    ['careers', '/services/skills-careers'],
    ['support', '/services/support'],
    ['family', '/services/marriage-family'],
  ]) {
    const journey = GUIDED_JOURNEYS[id];
    await page.goto(path);
    const guide = page.locator('.guidance-panel');
    for (const topic of GUIDANCE_TOPICS[id]) {
      const paths = [];
      function walk(nodeId, choices) {
        const node = journey.nodes[nodeId];
        if (!node.choices) paths.push({ choices, title: node.title });
        else node.choices.forEach((choice) => walk(choice.next, [...choices, choice.label]));
      }
      walk(topic.node, []);
      for (const route of paths) {
        await page
          .getByRole('group', { name: 'Topics', exact: true })
          .getByRole('button', { name: topic.label, exact: true })
          .click();
        for (const name of route.choices)
          await guide.getByRole('button', { name, exact: true }).click();
        await expect(guide.getByRole('heading', { name: route.title, exact: true })).toBeVisible();
        await expect(guide.locator('form,input,textarea')).toHaveCount(0);
        await page.reload();
      }
    }
  }
});

test('service questions and useful details share one page', async ({ page }) => {
  await prepare(page);
  for (const path of ['/services/nikah', '/get-involved/volunteer']) {
    await page.goto(path);
    await expect(page.locator('.service-guided-heading a[href^="tel:"]')).toBeVisible();
    await expect(page.locator('.service-questions')).toBeVisible();
    await page.getByText('What to prepare', { exact: true }).click();
    await expect(page.locator('#prepare')).toHaveAttribute('open', '');
    await expect(page.getByRole('button', { name: 'Guide me', exact: true })).toHaveCount(0);
  }
});

for (const theme of ['light', 'dark']) {
  test(`compact public pages fit phones and desktop in ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await prepare(page, theme);
    for (const width of [320, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of [
        '/',
        '/services',
        '/services/support',
        '/services/skills-careers',
        '/worship',
        '/events',
      ]) {
        await page.goto(path);
        await expect(page.locator('#main-content h1').first()).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${path} at ${width}`,
        ).toBe(true);
        if (width === 390 && ['/', '/services', '/services/skills-careers'].includes(path))
          await page.screenshot({
            path: testInfo.outputPath(`${path.replaceAll('/', '-') || 'home'}-${theme}.png`),
            fullPage: true,
          });
      }
    }
  });
}
