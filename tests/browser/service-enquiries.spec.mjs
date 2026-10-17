import { test, expect } from '@playwright/test';

test('service guides explain the journey and accept an enquiry without an account', async ({ page }, testInfo) => {
  const writes = [], errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/functions/v1/submit-form')) {
      writes.push(route.request().postDataJSON());
      return route.fulfill({ contentType: 'application/json', body: '{"ok":true}' });
    }
    return route.fulfill({ contentType: 'application/json', body: '[]' });
  });
  for (const [path, title] of [['/funerals', 'Janazah & funeral support'], ['/services/nikah', 'Nikah at JIC'], ['/services/community', 'Community support at JIC']]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'How it works' }).locator('li')).toHaveCount(3);
    await expect(page.locator('.service-centre-photo img')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show location map' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.goto('/funerals');
  await page.locator('#name').fill('Example family');
  await page.locator('#email').fill('family@example.test');
  await page.locator('#question').fill('Please contact us about Janazah arrangements.');
  await page.getByRole('button', { name: 'Send Message', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Enquiry received' })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].kind).toBe('contact');
  expect(writes[0].payload.question).toContain('Janazah / funeral support');
  await page.screenshot({ path: testInfo.outputPath('janazah-journey-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('hall enquiry keeps the selected date, hides prayer controls while typing, and shows a receipt', async ({
  page,
}, testInfo) => {
  const errors = [];
  const writes = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path.endsWith('/rpc/get_public_form'))
      data = {
        slug: 'hall-booking',
        title: 'Hall booking enquiry',
        version: 1,
        description: 'Send your preferred date. This is an enquiry, not a confirmed booking.',
        schema: {
          fields: [
            { id: 'name', type: 'text', label: 'Your name', required: true },
            { id: 'email', type: 'email', label: 'Email for our reply', required: true },
            { id: 'preferred_date', type: 'date', label: 'Preferred date', required: true },
            { id: 'message', type: 'textarea', label: 'How can we help?', required: true },
          ],
        },
      };
    if (path.endsWith('/functions/v1/custom-forms')) {
      writes.push(route.request().postDataJSON());
      data = { ok: true, id: '10000000-0000-4000-8000-000000000041' };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/forms/hall-booking?date=2026-10-28');
  await expect(
    page.getByRole('heading', { name: 'Hall booking enquiry', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Preferred date')).toHaveValue('2026-10-28');
  await page.getByLabel('Your name').fill('Test visitor');
  await expect(page.locator('#jic-prayer-dock')).toHaveAttribute('aria-hidden', 'true');
  await page.getByLabel('Email for our reply').fill('visitor@example.org');
  await page.getByLabel('How can we help?').fill('Please check the hall for a community meeting.');
  const pageControls = page.getByRole('navigation', { name: 'Page controls' });
  await expect(pageControls).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('service-enquiry.png') });
  await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
  await expect(page.getByText('This does not confirm a booking or date.')).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].answers.preferred_date).toBe('2026-10-28');
  expect(errors).toEqual([]);
});
