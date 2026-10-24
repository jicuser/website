import { test, expect } from '@playwright/test';
import { funeralForm } from '../helpers/funeralForm.mjs';

async function fixture(page, { theme = 'light', closed = false, content = [] } = {}) {
  const state = { writes: [], reads: [], errors: [] };
  await page.addInitScript((theme) => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    localStorage.setItem('jic-theme', theme);
  }, theme);
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path.endsWith('/page_content')) data = content;
    if (path.endsWith('/get_public_form')) {
      state.reads.push(route.request().postDataJSON());
      data = closed ? null : funeralForm;
    }
    if (path.endsWith('/custom-forms')) {
      state.writes.push(route.request().postDataJSON());
      data = { ok: true, id: '00000000-0000-4000-8000-000000000001' };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

for (const [width, theme] of [
  [320, 'light'],
  [390, 'dark'],
  [1280, 'light'],
]) {
  test(`Janazah shortcuts and facility cards fit ${width}px in ${theme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await fixture(page, { theme });
    await page.goto('/funerals');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Janazah & funeral support' }),
    ).toBeVisible();
    await expect(page.locator('.funeral-call')).toHaveAttribute('href', 'tel:01217786612');
    const links = page.getByRole('navigation', { name: 'Janazah information' });
    await expect(links.getByRole('link')).toHaveCount(3);
    await expect(links.getByRole('link', { name: 'Prayer times', exact: true })).toHaveAttribute(
      'href',
      '/prayer-times',
    );
    await expect(links.getByRole('link', { name: 'Janazah prayer guide' })).toHaveAttribute(
      'href',
      '/worship/janazah-guide',
    );
    await expect(page.locator('.funeral-facility')).toHaveCount(5);
    await expect(page.locator('.guidance-panel, .smart-form')).toHaveCount(0);
    expect(state.reads).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    if (width === 390)
      await page.screenshot({ path: info.outputPath('janazah-mobile.png'), fullPage: true });
    await page.getByRole('link', { name: 'Arrange a funeral', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'What do you need help with?', exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guide me', exact: true })).toHaveCount(0);
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
    if (width === 390)
      await page.screenshot({
        path: info.outputPath('janazah-booking-mobile.png'),
        fullPage: true,
      });
  });
}

test('one booking journey reviews answers, clears changed branches and submits once', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto('/funerals#enquire');
  const form = page.locator('.smart-form');
  await expect(form).toBeVisible();
  const storage = () =>
    page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const before = await storage();
  const next = () => form.getByRole('button', { name: 'Continue', exact: true }).click();
  await form.getByRole('radio', { name: 'Collection or transport', exact: true }).check();
  await next();
  await form.getByRole('radio', { name: 'Today', exact: true }).check();
  await next();
  await form.getByRole('radio', { name: 'Hospital', exact: true }).check();
  await form.getByLabel('Place or area (optional)', { exact: true }).fill('Example hospital');
  await next();
  await form.getByRole('radio', { name: 'Yes', exact: true }).check();
  await next();
  await form.getByRole('radio', { name: 'Both', exact: true }).check();
  await next();
  await next();
  await form.getByLabel('Your name', { exact: false }).fill('Example visitor');
  await form.getByLabel('Phone number', { exact: false }).fill('0121 000 0000');
  await form.getByRole('button', { name: 'Review answers', exact: true }).click();
  await expect(form.locator('.smart-form-review')).toContainText('Example hospital');
  expect(state.writes).toEqual([]);
  expect(await storage()).toEqual(before);
  await expect(page).toHaveURL('/funerals#enquire');
  await form.getByRole('button', { name: 'Edit What do you need help with?', exact: true }).click();
  await form.getByRole('radio', { name: 'Advice or planning ahead', exact: true }).check();
  await form.getByRole('button', { name: 'Review answers', exact: true }).click();
  await expect(form.locator('.smart-form-review')).not.toContainText('Example hospital');
  await form.getByRole('button', { name: 'Send enquiry', exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
  await expect(page.getByText('This does not confirm a booking or date.')).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].version).toBe(2);
  expect(state.writes[0].answers).toEqual({
    request: 'Advice or planning ahead',
    name: 'Example visitor',
    phone: '0121 000 0000',
  });
  expect(state.errors).toEqual([]);
});

test('published facility photos, visibility and closed booking state are respected', async ({
  page,
}) => {
  const state = await fixture(page, {
    closed: true,
    content: [
      {
        content_key: 'funeral_facilities',
        content_value: JSON.stringify([
          { id: 'ambulance', image: '/jic-aerial-sunset.jpg', alt: 'Test facility photo' },
          { id: 'cold-room', visible: false },
        ]),
      },
    ],
  });
  await page.goto('/funerals');
  await expect(page.locator('.funeral-facility')).toHaveCount(4);
  await expect(page.getByRole('img', { name: 'Test facility photo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cold room', exact: true })).toHaveCount(0);
  await page.goto('/funerals/contact-support');
  await expect(page.getByRole('heading', { name: /is currently closed/ })).toBeVisible();
  await expect(page.locator('.funeral-call')).toBeVisible();
  await expect(page.locator('.smart-form')).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
