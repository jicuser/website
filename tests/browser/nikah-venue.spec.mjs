import { test, expect } from '@playwright/test';

const image = '/jic-aerial-sunset.jpg';
const venue = {
  mens_hall: {
    description: 'Men’s hall information.',
    photos: [
      { url: image, alt: 'Men’s hall photo' },
      { url: image, alt: 'Men’s hall second photo' },
    ],
  },
  ladies_hall: {
    description: 'Ladies’ hall information.',
    photos: [{ url: image, alt: 'Ladies’ hall photo' }],
  },
  kitchen: { description: 'Kitchen arrangements to confirm with the team.' },
  decorations: { photos: [{ url: image, alt: 'Previous wedding setup' }] },
  parking: {
    description: 'Confirm the arrival point for your booking.',
    photos: [{ url: image, alt: 'Parking arrival point' }],
  },
};
const fields = [
  { id: 'preferred_date', type: 'date', label: 'Preferred date' },
  { id: 'message', type: 'textarea', label: 'How can we help?', required: true },
  { id: 'name', type: 'text', label: 'Your name', required: true },
  { id: 'email', type: 'email', label: 'Email', required: true },
];

async function fixture(page, { admin = false, closed = false } = {}) {
  const state = { writes: [], errors: [], content: { nikah_venue: JSON.stringify(venue) } };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript((admin) => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    if (admin)
      sessionStorage.setItem(
        'sb-127-auth-token',
        JSON.stringify({
          access_token: 'preview-token',
          refresh_token: 'test-refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: { id: '10000000-0000-4000-8000-000000000001', email: 'editor@example.invalid' },
        }),
      );
  }, admin);
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data = [];
    if (path.endsWith('/page_content')) {
      if (request.method() === 'POST') {
        const body = request.postDataJSON();
        state.writes.push(body);
        state.content[body.content_key] = body.content_value;
        data = [{ content_key: body.content_key }];
      } else
        data = Object.entries(state.content).map(([content_key, content_value]) => ({
          content_key,
          content_value,
        }));
    }
    if (path.endsWith('/rpc/get_my_profile'))
      data = {
        id: '10000000-0000-4000-8000-000000000001',
        display_name: 'Editor',
        is_owner: true,
        is_active: true,
        permissions: [],
        staff_kinds: [],
      };
    if (path.endsWith('/rpc/get_public_form'))
      data = closed
        ? null
        : {
            slug: request.postDataJSON().p_slug,
            title: 'Booking enquiry',
            version: 7,
            schema: { fields },
          };
    if (path.endsWith('/functions/v1/custom-forms')) {
      state.writes.push(request.postDataJSON());
      data = { ok: true, id: '10000000-0000-4000-8000-000000000041' };
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

for (const [theme, width] of [
  ['dark', 390],
  ['light', 320],
  ['light', 1280],
]) {
  test(`compact Nikah facilities, examples and parking in ${theme} at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript((value) => localStorage.setItem('jic-theme', value), theme);
    const state = await fixture(page);
    await page.goto('/services/nikah');
    await expect(page.getByRole('heading', { name: 'Nikah at JIC', exact: true })).toBeVisible();
    await expect(page.locator('.nikah-heading .managed-page-content')).toHaveCount(0);
    await expect(page.locator('.nikah-page a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('.nikah-heading')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('.nikah-venue-card')).toHaveCount(3);
    await expect(page.locator('.nikah-booking')).toBeHidden();
    await page.getByRole('button', { name: 'Next Men’s hall photo', exact: true }).click();
    await expect(
      page.getByRole('img', { name: 'Men’s hall second photo', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Enlarge Men’s hall photo' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Enlarge Men’s hall photo' })).toBeFocused();
    await page.getByRole('button', { name: 'Decorated examples', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Previous wedding setup' })).toBeVisible();
    await page.getByRole('button', { name: 'Parking', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Parking arrival point' })).toBeVisible();
    await page.getByRole('button', { name: 'Facilities', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.locator('.nikah-page').screenshot({ path: testInfo.outputPath('nikah-page.png') });
    expect(state.errors).toEqual([]);
    expect(state.writes).toEqual([]);
  });
}

test('one booking flow preserves drafts between choices and submits combined Nikah and hall details', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto('/services/nikah');
  await page.getByRole('button', { name: 'Book Nikah', exact: true }).click();
  await page.getByRole('button', { name: 'Nikah & hall', exact: true }).click();
  await page.getByRole('button', { name: 'Show all questions', exact: true }).click();
  const form = page.locator('.nikah-booking .smart-form:visible');
  await form.getByLabel('Preferred date').fill('2027-03-20');
  await form.getByLabel('Approximate number of guests').fill('80');
  await form
    .getByLabel('Which spaces would you like?')
    .selectOption(['Ladies’ hall', 'Kitchen & serving area']);
  await form.getByLabel('How can we help?').fill('Please check the day.');
  await form.getByLabel('Your name').fill('Example visitor');
  await form.getByLabel('Email', { exact: false }).fill('visitor@example.test');
  await page.getByRole('button', { name: 'Hall only', exact: true }).click();
  await page.getByRole('button', { name: 'Nikah & hall', exact: true }).click();
  await expect(form.getByLabel('Your name')).toHaveValue('Example visitor');
  await form.getByRole('button', { name: 'Review answers', exact: true }).click();
  await expect(form.getByText('Booking: Nikah & hall')).toBeVisible();
  await form.getByRole('button', { name: 'Send enquiry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].slug).toBe('nikah-enquiry');
  expect(state.writes[0].version).toBe(7);
  expect(state.writes[0].answers.message).toContain('Booking: Nikah & hall');
  expect(state.writes[0].answers.message).toContain('Approximate number of guests: 80');
  expect(state.writes[0].answers.message).toContain('Ladies’ hall, Kitchen & serving area');
  expect(state.writes[0].answers.preferred_date).toBe('2027-03-20');
  expect(state.writes[0].answers).not.toHaveProperty('jic_booking_guests');
  expect(state.errors).toEqual([]);
});

test('published closure is respected by the booking buttons and existing enquiry anchor', async ({
  page,
}) => {
  const state = await fixture(page, { closed: true });
  await page.goto('/services/nikah#enquire');
  await expect(
    page.getByRole('heading', { name: 'Nikah enquiry is currently closed' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send enquiry' })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test('admin edits the venue, previews parking and saves only the venue content', async ({
  page,
}) => {
  const state = await fixture(page, { admin: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin?section=content&page=%2Fservices%2Fnikah');
  await page
    .getByRole('tablist', { name: 'Page editing steps' })
    .getByRole('tab', { name: 'Venue', exact: true })
    .click();
  const editor = page.locator('.nikah-venue-editor');
  await expect(editor).toBeVisible();
  await editor.locator('summary').filter({ hasText: 'Parking on the day' }).click();
  await editor
    .getByLabel('Information about Parking on the day')
    .fill('Updated parking instructions for guests.');
  const preview = page.frameLocator('iframe[src="/services/nikah?preview=1"]');
  await preview.getByRole('button', { name: 'Parking', exact: true }).click();
  await expect(preview.getByText('Updated parking instructions for guests.')).toBeVisible();
  await editor.getByRole('button', { name: 'Save facilities & photos', exact: true }).click();
  await expect(editor.getByRole('status')).toHaveText('Nikah facilities and photos saved.');
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].content_key).toBe('nikah_venue');
  expect(JSON.parse(state.writes[0].content_value).parking.description).toBe(
    'Updated parking instructions for guests.',
  );
  expect(state.errors).toEqual([]);
});
