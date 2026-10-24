import { test, expect } from '@playwright/test';
import { CONTACT_FORM, CONTACT_RECEIPT } from './helpers/builtInForms.mjs';

const services = [
  ['/funerals', 'Janazah & funeral support', 'funeral-enquiry'],
  ['/services/nikah', 'Nikah at JIC', 'nikah-enquiry'],
  ['/services/community#enquire', 'Community support at JIC', 'community-enquiry'],
  ['/services/community/#enquire', 'Community support at JIC', 'community-enquiry'],
  ['/services/nikah/', 'Nikah at JIC', 'nikah-enquiry'],
  ['/funerals/', 'Janazah & funeral support', 'funeral-enquiry'],
];

function publishedService(slug) {
  return {
    ...CONTACT_FORM,
    slug,
    title: `Published ${slug}`,
    version: 7,
    schema: {
      fields: [
        { id: 'name', type: 'text', label: 'Your name', required: true },
        { id: 'email', type: 'email', label: 'Reply email', required: true },
        { id: 'request', type: 'textarea', label: 'Service details', required: true },
        {
          id: 'reply_method',
          type: 'select',
          label: 'Reply preference',
          options: ['Email', 'Phone'],
          required: true,
        },
      ],
    },
  };
}

async function serviceFixture(page, { closed = false } = {}) {
  const state = { writes: [], reads: [], errors: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path.endsWith('/rpc/get_public_form')) {
      const { p_slug } = route.request().postDataJSON();
      state.reads.push(p_slug);
      data = p_slug === 'contact-us' ? CONTACT_FORM : closed ? null : publishedService(p_slug);
    }
    if (path.endsWith('/functions/v1/custom-forms')) {
      state.writes.push(route.request().postDataJSON());
      data = { ok: true, id: CONTACT_RECEIPT };
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

for (const [path, title, slug] of services) {
  test(`${path}: ${slug} uses the same published schema and version inline and directly`, async ({
    page,
  }) => {
    const state = await serviceFixture(page);
    for (const destination of [path, `/forms/${slug}`]) {
      await page.goto(destination);
      if (destination === path) {
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
        if (slug === 'funeral-enquiry') {
          await page.getByRole('link', { name: 'Arrange a funeral', exact: true }).click();
          await expect(page.locator('.funeral-call')).toHaveAttribute('href', 'tel:01217786612');
        } else await expect(page.locator('.service-questions')).toBeVisible();
      }
      if (destination !== path)
        await expect(
          page.getByRole('heading', { name: `Published ${slug}`, exact: true }),
        ).toBeVisible();
      await page.getByRole('button', { name: 'Show all questions', exact: true }).click();
      await page.getByLabel('Your name', { exact: false }).fill('Example visitor');
      await page.getByLabel('Reply email', { exact: false }).fill('visitor@example.test');
      await page.getByLabel('Service details', { exact: false }).fill('Please contact me.');
      await page.getByLabel('Reply preference', { exact: false }).selectOption('Email');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await page.getByRole('button', { name: 'Review answers', exact: true }).click();
      await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
      if (['nikah-enquiry', 'funeral-enquiry'].includes(slug))
        await expect(page.getByText('This does not confirm a booking or date.')).toBeVisible();
    }
    expect(state.reads.length).toBeGreaterThanOrEqual(2);
    expect([...new Set(state.reads)]).toEqual([slug]);
    expect(state.writes).toHaveLength(2);
    for (const write of state.writes) {
      expect(write.slug).toBe(slug);
      expect(write.version).toBe(7);
      expect(write.answers).toEqual({
        name: 'Example visitor',
        email: 'visitor@example.test',
        request: 'Please contact me.',
        reply_method: 'Email',
      });
    }
    expect(state.errors).toEqual([]);
  });

  test(`${path}: ${slug} stays closed inline and directly when the managed form is unpublished`, async ({
    page,
  }) => {
    const state = await serviceFixture(page, { closed: true });
    for (const destination of [path, `/forms/${slug}`]) {
      await page.goto(destination);
      if (destination === path && slug === 'funeral-enquiry')
        await page.getByRole('link', { name: 'Arrange a funeral', exact: true }).click();
      await expect(page.getByRole('heading', { name: /is currently closed/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Send enquiry', exact: true })).toHaveCount(0);
      await expect(
        page
          .locator('.public-custom-form')
          .getByRole('link', { name: 'Contact the centre', exact: true }),
      ).toHaveAttribute('href', '/contact');
    }
    expect(state.reads.length).toBeGreaterThanOrEqual(2);
    expect([...new Set(state.reads)]).toEqual([slug]);
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

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
  await page.getByRole('button', { name: 'Show all questions', exact: true }).click();
  await expect(page.getByLabel('Preferred date')).toHaveValue('2026-10-28');
  await page.getByLabel('Your name').fill('Test visitor');
  await expect(page.locator('#jic-prayer-dock')).toHaveAttribute('aria-hidden', 'true');
  await page.getByLabel('Email for our reply').fill('visitor@example.org');
  await page.getByLabel('How can we help?').fill('Please check the hall for a community meeting.');
  await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeVisible();
  await expect(page.locator('.jic-menu-word')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('service-enquiry.png') });
  await page.getByRole('button', { name: 'Review answers', exact: true }).click();
  await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
  await expect(page.getByText('This does not confirm a booking or date.')).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].answers.preferred_date).toBe('2026-10-28');
  expect(errors).toEqual([]);
});
