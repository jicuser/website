import { test, expect } from '@playwright/test';
const owner = {
  id: '00000000-0000-4000-8000-000000000001',
  display_name: 'Owner',
  is_owner: true,
  is_active: true,
  permissions: [],
  staff_kinds: [],
};
const form = {
  id: '00000000-0000-4000-8000-000000000010',
  slug: 'course-application',
  title: 'Course applications',
  description: 'Application details',
  schema: { fields: [{ id: 'name', type: 'text', label: 'Your name', required: true }] },
  published_version: 1,
  enabled: true,
  task_title: 'Review application',
  due_hours: 48,
  can_manage: true,
  responsible: [owner],
  response_count: 2,
  new_count: 1,
  open_actions: 1,
  updated_at: '2026-09-14T00:00:00Z',
};
const content = {
  id: '00000000-0000-4000-8000-000000000020',
  slug: 'course-details',
  title: 'Course details',
  body: 'Read about this course.',
  schedule: 'Fridays',
  image_url: '',
  placement: '/education/courses',
  kind: 'course',
  registration: 'application',
  form_id: form.id,
  source_poster_id: 'open-quran-circle',
  published: true,
  form_slug: form.slug,
  accepting: true,
  updated_at: '2026-09-14T00:00:00Z',
};
async function setup(page, { admin = true } = {}) {
  const writes = [];
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON();
    let data = [];
    if (path.includes('/auth/v1/token')) {
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const enc = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
      data = {
        user: {
          id: owner.id,
          email: 'staff@example.invalid',
          role: 'authenticated',
          aud: 'authenticated',
        },
        access_token: `${enc({ alg: 'HS256' })}.${enc({ sub: owner.id, exp: expiry })}.test`,
        refresh_token: 'local',
        expires_in: 3600,
        expires_at: expiry,
      };
    } else if (path.endsWith('/rpc/get_my_profile')) data = owner;
    else if (path.endsWith('/rpc/admin_form_catalogue')) data = [form];
    else if (
      path.endsWith('/rpc/custom_form_members') ||
      path.endsWith('/rpc/custom_form_assignees')
    )
      data = [owner];
    else if (path.endsWith('/custom_form_staff'))
      data = [{ form_id: form.id, user_id: owner.id, role: 'responsible' }];
    else if (path.endsWith('/content_pages')) data = [content];
    else if (path.endsWith('/rpc/list_content_pages')) data = [content];
    else if (path.endsWith('/rpc/get_content_page')) data = content;
    else if (path.endsWith('/rpc/get_public_form')) data = { ...form, version: 1 };
    else if (path.endsWith('/rpc/search_form_submissions'))
      data = { rows: [], total: 0, new_count: 0, done_count: 0 };
    else if (path.endsWith('/rpc/save_custom_form')) {
      writes.push({ path, body });
      data = form.id;
    } else if (path.endsWith('/rpc/save_content_page')) {
      writes.push({ path, body });
      data = { ...content, ...body.p_page };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  if (admin) {
    await page.goto('/admin/login');
    await page.locator('input[type=email]').fill('staff@example.invalid');
    await page.locator('input[type=password]').fill('Local test passphrase');
    await page.locator('form button').last().click();
    await expect(page.locator('.admin-toolbar')).toBeVisible();
  }
  return writes;
}
test('Admin Forms shows live definitions, people, response counts and actions in one place', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/admin?section=forms');
  await expect(page.getByRole('heading', { name: 'Forms', exact: true })).toBeVisible();
  await expect(page.getByText('Course applications', { exact: true })).toBeVisible();
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
  await expect(page.getByText(/Responsible: Owner/)).toBeVisible();
  await page.getByRole('button', { name: 'Manage form', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Responses', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actions', exact: true })).toBeVisible();
});
test('poster selection opens linked page and form management without leaving admin', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/admin?section=posters');
  await page.locator('.admin-poster-picker button').first().click();
  await expect(page.getByRole('heading', { name: 'Linked page & registration' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Responses', exact: true })).toHaveAttribute(
    'href',
    new RegExp(`section=forms.*form=${form.id}`),
  );
});
test('public course detail page explains registration and links the same form', async ({
  page,
}) => {
  await setup(page, { admin: false });
  await page.goto('/pages/course-details');
  await expect(page.getByRole('heading', { name: 'Course details', exact: true })).toBeVisible();
  await expect(page.getByText('Application required', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apply', exact: true })).toHaveAttribute(
    'href',
    '/forms/course-application',
  );
});
