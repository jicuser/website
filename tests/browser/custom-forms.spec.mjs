import { test, expect } from '@playwright/test';

const owner = '00000000-0000-4000-8000-000000000001';
const formId = '00000000-0000-4000-8000-000000000002';
const responseId = '00000000-0000-4000-8000-000000000003';
const form = {
  id: formId,
  slug: 'volunteer-registration',
  title: 'Volunteer registration',
  description: 'Tell us how you would like to help.',
  version: 1,
  schema: {
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true },
      {
        id: 'contact_by',
        label: 'Contact by',
        type: 'select',
        required: true,
        options: ['Phone', 'Email'],
      },
      {
        id: 'phone',
        label: 'Telephone number',
        type: 'phone',
        required: true,
        show_when: { field: 'contact_by', operator: 'equals', value: 'Phone' },
      },
      {
        id: 'email',
        label: 'Email address',
        type: 'email',
        required: true,
        show_when: { field: 'contact_by', operator: 'equals', value: 'Email' },
      },
    ],
  },
};

async function setup(page, { signedIn = false, handle = () => undefined } = {}) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(
    ({ signedIn, owner }) => {
      sessionStorage.setItem('jic-salawat-shown', '1');
      if (signedIn)
        sessionStorage.setItem(
          'sb-127-auth-token',
          JSON.stringify({
            access_token: 'preview-jwt',
            refresh_token: 'preview-refresh',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: { id: owner, email: 'owner@example.org' },
          }),
        );
    },
    { signedIn, owner },
  );
  await page.route('**/preview-api/**', async (route) => {
    const url = new URL(route.request().url());
    let body = null;
    try {
      body = route.request().postDataJSON();
    } catch {
      /* Reads have no body. */
    }
    const custom = await handle(url.pathname, body, route);
    if (custom === true) return;
    const path = url.pathname.split('/').at(-1);
    const data =
      {
        get_public_form: form,
        list_fee_requests: { rows: [], total: 0, outstanding_by_currency: {} },
        form_email_capability: { enabled: false },
        get_my_profile: {
          id: owner,
          display_name: 'Preview owner',
          is_owner: true,
          is_active: true,
          permissions: [],
        },
        custom_forms: [],
        custom_form_staff: [],
        list_public_forms: [],
        custom_form_members: [{ id: owner, display_name: 'Preview owner' }],
        search_form_submissions: { rows: [], total: 0, new_count: 0, done_count: 0 },
      }[path] ?? [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return errors;
}

test('public form hides stale conditional answers and reuses its retry key', async ({
  page,
}, testInfo) => {
  const attempts = [];
  const errors = await setup(page, {
    handle: async (path, body, route) => {
      if (!path.endsWith('/custom-forms')) return;
      attempts.push(body);
      await route.fulfill({
        status: attempts.length === 1 ? 503 : 200,
        contentType: 'application/json',
        body: JSON.stringify(
          attempts.length === 1 ? { error: 'Please try again.' } : { ok: true, id: responseId },
        ),
      });
      return true;
    },
  });
  await page.goto('/forms/volunteer-registration');
  await expect(
    page.getByRole('heading', { name: 'Volunteer registration', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Your name').fill('Example volunteer');
  await page.getByLabel('Contact by').selectOption('Phone');
  await page.getByLabel('Telephone number').fill('0123456789');
  await page.getByLabel('Contact by').selectOption('Email');
  await expect(page.getByLabel('Telephone number')).toHaveCount(0);
  await page.getByLabel('Email address').fill('volunteer@example.org');
  await page.screenshot({ path: testInfo.outputPath('public-form.png'), fullPage: true });
  await page.getByRole('button', { name: 'Send response', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Please try again.');
  await page.getByRole('button', { name: 'Send response', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[0].answers.phone).toBeUndefined();
  expect(attempts[0].idempotency_key).toBe(attempts[1].idempotency_key);
  expect(attempts[1].answers.email).toBe('volunteer@example.org');
  expect(errors).toEqual([]);
});

test('owner builds a draft and publishes with responsible people and task routing', async ({
  page,
}, testInfo) => {
  const saved = [];
  const published = [];
  const errors = await setup(page, {
    signedIn: true,
    handle: async (path, body, route) => {
      if (path.endsWith('/save_custom_form')) {
        saved.push(body.p_form);
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(formId) });
        return true;
      }
      if (path.endsWith('/publish_custom_form')) {
        published.push(body);
        await route.fulfill({ contentType: 'application/json', body: '1' });
        return true;
      }
    },
  });
  await page.goto('/portal?tab=forms');
  await page.getByRole('button', { name: 'Create form', exact: true }).click();
  await page.getByLabel('Form title', { exact: true }).fill('Volunteer registration');
  await page.getByLabel('Form address', { exact: true }).fill('volunteer-registration');
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Choose at least one responsible person');
  await page
    .getByRole('group', { name: 'Responsible people', exact: true })
    .getByLabel('Preview owner')
    .check();
  await page.getByLabel('Automatic action').fill('Call back');
  await page.getByLabel('Due within (hours)').fill('24');
  await page.getByRole('button', { name: 'Preview questions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Question preview', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('builder.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click();
  await expect(page.locator('.custom-form-notice')).toContainText('Published version 1');
  expect(saved).toHaveLength(1);
  expect(saved[0].responsible_ids).toEqual([owner]);
  expect(saved[0].task_title).toBe('Call back');
  expect(saved[0].due_hours).toBe(24);
  expect(published).toEqual([{ p_form_id: formId }]);
  expect(errors).toEqual([]);
});

test('response inbox searches server-side, posts portal reply and assigns action', async ({
  page,
}, testInfo) => {
  const queries = [],
    replies = [],
    tasks = [];
  const row = {
    id: responseId,
    kind: 'custom',
    custom_form_id: formId,
    form_version: 1,
    schema_snapshot: { title: form.title, fields: form.schema.fields },
    submitter_id: owner,
    created_at: '2026-09-13T10:00:00Z',
    status: 'new',
    payload: { name: 'Example volunteer', email: 'volunteer@example.org' },
  };
  const errors = await setup(page, {
    signedIn: true,
    handle: async (path, body, route) => {
      let data;
      if (path.endsWith('/search_form_submissions')) {
        queries.push(body);
        data = { rows: [row], total: 1, new_count: 1, done_count: 0 };
      }
      if (path.endsWith('/custom_form_assignees'))
        data = [{ id: owner, display_name: 'Preview owner' }];
      if (path.endsWith('/reply_custom_form')) {
        replies.push(body);
        data = responseId;
      }
      if (path.endsWith('/assign_custom_form_task')) {
        tasks.push(body);
        data = responseId;
      }
      if (data !== undefined) {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
        return true;
      }
    },
  });
  await page.goto('/portal?tab=forms&mine=true');
  await page.getByLabel('Search all answers').fill('Example');
  await expect.poll(() => queries.some((query) => query.p_search === 'Example')).toBe(true);
  await page.locator('.custom-response summary').click();
  await page
    .getByLabel('Reply in the portal')
    .fill('Thank you. When would be a good time to call?');
  await page.getByRole('button', { name: 'Send portal reply', exact: true }).click();
  await expect.poll(() => replies.length).toBe(1);
  expect(replies[0].p_internal).toBe(false);
  await page.getByRole('button', { name: 'Assign action', exact: true }).click();
  await page.getByRole('combobox', { name: 'Responsible person', exact: true }).selectOption(owner);
  await page.getByRole('button', { name: 'Assign action', exact: true }).last().click();
  await expect.poll(() => tasks.length).toBe(1);
  expect(tasks[0].p_submission_id).toBe(responseId);
  await page.screenshot({ path: testInfo.outputPath('responses.png'), fullPage: true });
  expect(errors).toEqual([]);
});
