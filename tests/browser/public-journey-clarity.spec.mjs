import { test, expect } from '@playwright/test';
import { DEFAULT_STAGES } from '../../src/features/projects/model.js';

test.use({ screenshot: 'off' });

async function fixture(page, content = {}) {
  const state = { errors: [], writes: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET' && !path.includes('/rpc/')) state.writes.push(path);
    const data = path.endsWith('/page_content')
      ? Object.entries(content).map(([content_key, content_value]) => ({
          content_key,
          content_value,
        }))
      : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

for (const [theme, width] of [
  ['light', 320],
  ['dark', 390],
]) {
  test(`unpublished project areas stay selectable without implying zero progress in ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
    await page.addInitScript((value) => localStorage.setItem('jic-theme', value), theme);
    const state = await fixture(page);
    await page.goto('/projects');
    const summary = page.locator('.project-summary');
    await expect(summary).toHaveText('Project progress has not been published yet.');
    await expect(page.locator('.project-map-tile')).toHaveCount(4);
    await expect(page.locator('.project-map-tile')).toContainText(
      Array(4).fill('Details not published'),
    );
    for (const stage of DEFAULT_STAGES) {
      const choice = page.locator('.project-map-tile').filter({ hasText: stage.title });
      await choice.click();
      await expect(page.locator(`#stage-${stage.id}`)).toBeInViewport();
      await expect(page.locator('.project-map-tile[aria-pressed="true"]')).toHaveCount(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    expect(state.errors).toEqual([]);
    expect(state.writes).toEqual([]);
  });
}

test('project completion denominator counts visible areas with explicitly published statuses', async ({
  page,
}) => {
  const stages = DEFAULT_STAGES.map((stage, index) => ({
    ...stage,
    status: ['completed', 'planned', 'update_pending', 'completed'][index],
    visible: index !== 3,
  }));
  const state = await fixture(page, { masjid_project_stages: JSON.stringify(stages) });
  await page.goto('/projects');
  await expect(page.locator('.project-summary')).toHaveText(
    '1 of 2 areas with published progress marked complete',
  );
  await expect(page.locator('.project-map-tile')).toHaveCount(3);
  await expect(
    page.locator('.project-map-tile').filter({ hasText: 'Details not published' }),
  ).toHaveCount(1);
  expect(state.errors).toEqual([]);
  expect(state.writes).toEqual([]);
});

test('thin youth and Madrassah pages explain the next step and preserve saved page content', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  const state = await fixture(page, {
    'page:/youth/trips-events': JSON.stringify({
      title: 'Saved trips information',
      body: 'Published guidance from our youth team.',
    }),
  });
  for (const [path, description, label, destination] of [
    ['/youth/projects', 'Ask about current youth projects', 'Ask about youth projects', '/contact'],
    [
      '/youth/activities',
      'Explore the types of youth activities',
      'Explore youth activities',
      '/youth',
    ],
    [
      '/youth/volunteering',
      'Tell the team how you would like to help',
      'Ask about volunteering',
      '/get-involved/volunteer',
    ],
    [
      '/youth/classes-skills',
      'Explore published classes',
      'Explore classes & programmes',
      '/education/programmes',
    ],
    [
      '/madrassah/contact',
      'Ask the Madrassah team about classes',
      'Send a Madrassah enquiry',
      '/forms/madrassah-enquiry',
    ],
    [
      '/madrassah/policies',
      'Ask the Madrassah team for the current policies',
      'Ask about Madrassah policies',
      '/madrassah/contact',
    ],
    [
      '/madrassah/student-portal',
      'Information for current pupils and parents',
      'Contact Madrassah',
      '/madrassah/contact',
    ],
  ]) {
    await page.goto(path);
    await expect(page.locator('.managed-page-copy')).toContainText(description);
    const action = page.locator('main').getByRole('link', { name: label, exact: true });
    await expect(action).toHaveAttribute('href', destination);
    expect((await action.boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  await page.goto('/youth/trips-events');
  await expect(page.getByRole('heading', { name: 'Saved trips information' })).toBeVisible();
  await expect(page.locator('.managed-page-copy')).toContainText(
    'Published guidance from our youth team.',
  );
  await expect(
    page.locator('main').getByRole('link', { name: 'Ask about trips & events', exact: true }),
  ).toHaveAttribute('href', '/contact');
  expect(state.errors).toEqual([]);
  expect(state.writes).toEqual([]);
});
