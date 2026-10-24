import { test, expect } from '@playwright/test';
import { CONTACT_FORM } from './helpers/builtInForms.mjs';

test.use({ screenshot: 'off' });

async function publicContent(page, content, bookings = []) {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/rpc/get_public_form')
      ? {
          ...CONTACT_FORM,
          slug: 'hall-booking',
          schema: {
            fields: [
              { id: 'preferred_date', type: 'date', label: 'Preferred date', required: true },
              ...CONTACT_FORM.schema.fields,
            ],
          },
        }
      : path.endsWith('/page_content')
        ? Object.entries(content).map(([content_key, value]) => ({
            content_key,
            content_value: JSON.stringify(value),
          }))
        : path.endsWith('/hall_bookings')
          ? bookings
          : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
}

test('hall details precede dates and the enquiry carries the chosen available date', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-23T12:00:00Z') });
  await publicContent(
    page,
    {
      hall_details: {
        description: 'Published hall description.',
        capacity: 'Published capacity information.',
        facilities: ['Published facility information.'],
        photos: [{ url: '/jic-aerial-sunset.jpg', alt: 'Saved venue photograph' }],
      },
    },
    [
      { booking_date: '2026-10-24', start_time: null, end_time: null, status: 'available' },
      { booking_date: '2026-10-25', start_time: null, end_time: null, status: 'booked' },
    ],
  );
  await page.goto('/services/hall-booking');
  const details = page.getByRole('region', { name: 'About the hall' });
  await expect(details).toContainText('Published hall description.');
  await expect(details).toContainText('Published capacity information.');
  await expect(details).toContainText('Published facility information.');
  await expect(details.getByRole('img', { name: 'Saved venue photograph' })).toBeVisible();
  const calendar = page.getByRole('region', { name: 'Choose calendar dates' });
  expect(await details.evaluate((node) => node.getBoundingClientRect().bottom)).toBeLessThan(
    await calendar.evaluate((node) => node.getBoundingClientRect().top),
  );
  await page.getByRole('button', { name: '24/10/2026 · Available', exact: true }).click();
  const enquiry = page.getByRole('region', { name: 'Your hall enquiry' });
  await expect(enquiry).toContainText('24 October 2026');
  await expect(enquiry.locator('.smart-form')).toBeVisible();
  await enquiry.getByRole('button', { name: 'Show all questions' }).click();
  await expect(enquiry.getByLabel('Preferred date')).toHaveValue('2026-10-24');
  await expect(page).toHaveURL('/services/hall-booking');
  await page.getByRole('button', { name: '25/10/2026 · Booked', exact: true }).click();
  await expect(enquiry.locator('.smart-form')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test('empty or malformed hall details do not publish guessed venue information', async ({
  page,
}) => {
  await publicContent(page, { hall_details: { capacity: {}, facilities: [null], photos: [null] } });
  await page.goto('/services/hall-booking');
  await expect(page.getByRole('heading', { name: 'Hall booking', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'About the hall' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Choose calendar dates' })).toBeVisible();
});

test('compact previews link to the complete public programme catalogue', async ({ page }) => {
  const posters = Array.from({ length: 6 }, (_, index) => ({
    id: `programme-${index + 1}`,
    title: `Public programme ${index + 1}`,
    subtitle: 'Published programme',
    schedule: 'Ask the centre for details',
    detail: 'Complete published description.',
    image: '/posters/open-quran-circle.png',
    alt: `Programme ${index + 1} poster`,
    website_locations: ['/'],
    to: '/contact',
  }));
  await publicContent(page, {
    programme_posters: [
      ...posters,
      { ...posters[0], id: 'unlisted', title: 'Unlisted programme', website_locations: [] },
    ],
  });
  await page.goto('/');
  const previews = page.locator('.community-programme-feed');
  await expect(previews.getByRole('article')).toHaveCount(6);
  await expect(previews.getByRole('button', { name: 'Previous activities' })).toBeDisabled();
  await previews.getByRole('button', { name: 'Next activities' }).click();
  await expect(previews.getByText('2 / 2', { exact: true })).toBeVisible();
  await expect(previews.getByRole('button', { name: 'Next activities' })).toBeDisabled();
  await previews.getByRole('button', { name: 'Previous activities' }).click();
  await expect(previews.getByText('1 / 2', { exact: true })).toBeVisible();
  const viewAll = previews.getByRole('link', { name: 'View all', exact: true });
  await expect(viewAll).toHaveAttribute('href', '/events');
  await viewAll.click();
  await expect(page).toHaveURL('/events');
  await expect(page.getByRole('heading', { name: 'What’s on', exact: true }).first()).toBeVisible();
  await expect(page.locator('.programme-feed-row')).toHaveCount(6);
  await expect(page.getByText('Unlisted programme', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
