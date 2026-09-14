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
async function setup(page, { admin = true, formData = form, pageData = content } = {}) {
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
    else if (path.endsWith('/rpc/admin_form_catalogue')) data = [formData];
    else if (
      path.endsWith('/rpc/custom_form_members') ||
      path.endsWith('/rpc/custom_form_assignees')
    )
      data = [owner];
    else if (path.endsWith('/custom_form_staff'))
      data = [{ form_id: form.id, user_id: owner.id, role: 'responsible' }];
    else if (path.endsWith('/content_pages'))
      data =
        new URL(route.request().url()).searchParams.get('select') === '*' ? pageData : [pageData];
    else if (path.endsWith('/rpc/list_content_pages')) data = [pageData];
    else if (path.endsWith('/rpc/get_content_page')) data = pageData;
    else if (path.endsWith('/rpc/get_public_form'))
      data = formData.enabled ? { ...formData, version: 1 } : null;
    else if (path.endsWith('/rpc/search_form_submissions'))
      data = { rows: [], total: 0, new_count: 0, done_count: 0 };
    else if (path.endsWith('/rpc/save_custom_form')) {
      writes.push({ path, body });
      data = form.id;
    } else if (path.endsWith('/rpc/publish_custom_form')) {
      writes.push({ path, body });
      data = 2;
    } else if (path.endsWith('/functions/v1/custom-forms')) {
      writes.push({ path, body });
      data = { ok: true, id: 'test-response' };
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
  await expect(page.getByRole('article').getByText('Live', { exact: true })).toBeVisible();
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

test('form creation requires an assignee before publishing, and preview makes no submission', async ({
  page,
}, testInfo) => {
  const writes = await setup(page);
  await page.goto('/admin?section=forms');
  await page.getByRole('button', { name: 'Create form', exact: true }).click();
  const editor = page.locator('.custom-form-editor');
  await editor.getByLabel('Form title', { exact: true }).fill('New course enquiries');
  await editor.getByLabel('Form address', { exact: true }).fill('new-course-enquiries');
  await editor.getByRole('button', { name: 'Save and publish', exact: true }).click();
  await expect(
    editor.getByText('Choose at least one responsible person before publishing.'),
  ).toBeVisible();
  expect(writes).toHaveLength(0);
  await editor
    .getByRole('group', { name: 'Responsible people', exact: true })
    .getByRole('checkbox')
    .check();
  await editor.getByRole('button', { name: 'Preview questions', exact: true }).click();
  expect(writes).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath('form-preview.png') });
  await editor.getByRole('button', { name: 'Save and publish', exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[0].body.p_form.responsible_ids).toEqual([owner.id]);
  expect(writes[1].path).toContain('publish_custom_form');
});

test('closing form acceptance saves without publishing or deleting responses', async ({ page }) => {
  const writes = await setup(page);
  await page.goto(`/admin?section=forms&form=${form.id}`);
  await page.getByRole('button', { name: 'Edit form & assignments', exact: true }).click();
  const editor = page.locator('.custom-form-editor');
  await editor.getByLabel('Accept responses when published').uncheck();
  await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].body.p_form.enabled).toBe(false);
  expect(writes[0].path).toContain('save_custom_form');
});

test('page publication switch preserves a linked form and stable address', async ({ page }) => {
  const writes = await setup(page);
  await page.goto('/admin?section=posters');
  await page.locator('.admin-poster-picker button').first().click();
  await page.getByRole('button', { name: 'Page settings', exact: true }).click();
  const editor = page.locator('.content-fields');
  await editor.getByLabel('Page live after saving').uncheck();
  await editor.getByRole('button', { name: 'Save page', exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].body.p_page.published).toBe(false);
  expect(writes[0].body.p_page.form_id).toBe(form.id);
  expect(writes[0].body.p_page.slug).toBe(content.slug);
});

test('a public interest form submits only when requested and never promises a place', async ({
  page,
}) => {
  const writes = await setup(page, { admin: false });
  await page.goto('/forms/course-application');
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
  await page.getByLabel('Your name').fill('Test visitor');
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Send response', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].body.answers).toEqual({ name: 'Test visitor' });
  await expect(page.getByText(/does not confirm a place/)).toBeVisible();
});

test('a closed course form leaves the information page visible without an active Apply button', async ({
  page,
}) => {
  await setup(page, {
    admin: false,
    formData: { ...form, enabled: false },
    pageData: { ...content, accepting: false },
  });
  await page.goto('/pages/course-details');
  await expect(page.getByRole('heading', { name: 'Course details', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apply', exact: true })).toHaveCount(0);
  await expect(page.getByText(/closed/i)).toBeVisible();
});
