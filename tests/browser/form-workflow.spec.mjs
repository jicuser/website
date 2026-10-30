import { test, expect } from '@playwright/test';
test.use({ screenshot: 'off' });

const id = (n) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const timestamp = '2026-10-23T10:00:00Z';
const contact = {
  id: id(2),
  slug: 'contact-us',
  built_in_kind: 'contact',
  title: 'Contact Us',
  description: 'Contact our team.',
  enabled: true,
  published_version: 1,
  task_title: 'Reply to message',
  due_hours: 48,
  updated_at: timestamp,
  schema: {
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true },
      { id: 'email', label: 'Email address', type: 'email', required: true },
      { id: 'question', label: 'Your message', type: 'textarea', required: true },
    ],
  },
};
const summary = (form, canManage = true) => ({
  ...form,
  can_manage: canManage,
  new_count: 3,
  done_count: 2,
  open_actions: 0,
  people: [{ user_id: id(1), display_name: 'Form colleague', role: 'responsible', active: true }],
  pages: [],
});

async function fixture(
  page,
  {
    permissions = ['forms_manage', 'content', 'forms_contact'],
    forms = [contact],
    signedIn = true,
    canManage = true,
    failSave = false,
    linkedDraftPage = false,
  } = {},
) {
  const state = { writes: [], errors: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript(
    ({ signedIn, userId }) => {
      if (window.top !== window) return;
      sessionStorage.setItem('jic-salawat-shown', '1');
      if (signedIn)
        sessionStorage.setItem(
          'sb-127-auth-token',
          JSON.stringify({
            access_token: 'preview-token',
            refresh_token: 'test-refresh',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: { id: userId, email: 'colleague@example.invalid' },
          }),
        );
    },
    { signedIn, userId: id(1) },
  );
  await page.route('**/preview-api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.split('/').at(-1);
    const body = req.method() === 'POST' ? req.postDataJSON() : {};
    let data = [];
    if (path === 'get_my_profile')
      data = {
        id: id(1),
        display_name: 'Form colleague',
        is_active: true,
        is_owner: false,
        permissions,
        staff_kinds: [],
      };
    else if (path === 'admin_forms_overview') data = forms.map((form) => summary(form, canManage));
    else if (path === 'custom_forms')
      data = forms.find((form) => url.searchParams.get('id') === `eq.${form.id}`) || forms;
    else if (path === 'custom_form_staff') data = [{ user_id: id(1), role: 'responsible' }];
    else if (path === 'custom_form_members') data = [{ id: id(1), display_name: 'Form colleague' }];
    else if (path === 'site_pages')
      data = [
        {
          id: id(20),
          title: 'Existing programme',
          slug: 'existing-programme',
          placement: '/education',
          kind: 'page',
          registration: 'none',
          form_id: null,
          published: !linkedDraftPage,
          updated_at: timestamp,
          ...(linkedDraftPage ? { form_id: contact.id, registration: 'interest' } : {}),
        },
      ];
    else if (path === 'get_public_form') data = { ...contact, version: 1 };
    else if (path === 'search_form_submissions')
      data = { rows: [], new_count: 3, done_count: 2, total: 5 };
    else if (path === 'save_form_workflow') {
      state.writes.push(body);
      if (failSave)
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'This page changed in another session. Reload before saving.',
          }),
        });
      data = {
        form: {
          ...body.p_form,
          id: body.p_form.id || id(30),
          published_version: body.p_publish ? 1 : null,
          updated_at: timestamp,
        },
        page: body.p_page
          ? { ...body.p_page, id: body.p_page.id || id(31), updated_at: timestamp }
          : null,
      };
      const index = forms.findIndex((form) => form.id === data.form.id);
      if (index >= 0) forms[index] = data.form;
      else forms.push(data.form);
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

test('mobile form catalogue exposes status counts and edits a live built-in form', async ({
  page,
}) => {
  const draft = {
    ...contact,
    id: id(3),
    slug: 'draft-registration',
    title: 'Draft registration',
    built_in_kind: null,
    published_version: null,
  };
  const closed = {
    ...contact,
    id: id(4),
    slug: 'closed-registration',
    title: 'Closed registration',
    built_in_kind: null,
    enabled: false,
  };
  const state = await fixture(page, {
    permissions: ['forms_manage', 'forms_contact', 'forms_madrassah', 'forms_itikaaf'],
    forms: [contact, draft, closed],
  });
  await page.goto('/admin?section=forms');
  await expect(page.getByRole('heading', { name: 'Forms', exact: true })).toBeVisible({
    timeout: 15000,
  });
  const tabs = page.getByRole('navigation', { name: 'Form status' });
  await expect(tabs.getByRole('button', { name: 'Live 3', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await tabs.getByRole('button', { name: 'Draft 1', exact: true }).click();
  await expect(page.locator('.content-form-card')).toHaveCount(1);
  await expect(page.locator('.content-form-card')).toContainText('Draft registration');
  await tabs.getByRole('button', { name: 'Closed 1', exact: true }).click();
  await expect(page.locator('.content-form-card')).toContainText('Closed registration');
  await tabs.getByRole('button', { name: 'Live 3', exact: true }).click();
  await page
    .locator('.content-form-card')
    .filter({ hasText: 'Contact Us' })
    .getByRole('button', { name: 'Edit form', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Edit form', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish changes', exact: true })).toBeVisible();
  await page.getByText('Form address & availability', { exact: true }).click();
  await expect(page.getByLabel('Form address', { exact: true })).toHaveAttribute('readonly', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('form and named page publish in one request with a chosen menu section', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/admin?section=forms');
  await page.getByRole('button', { name: 'New form', exact: true }).click();
  await page.getByLabel('Form title', { exact: true }).fill('Community volunteers');
  await page.getByLabel('Website location').selectOption('new');
  await page.getByLabel('Page name', { exact: true }).fill('Volunteer with us');
  await page.getByRole('combobox', { name: 'Menu section', exact: true }).selectOption('/youth');
  await page
    .getByRole('tablist', { name: 'Form setup steps' })
    .getByRole('tab', { name: 'Responses', exact: true })
    .click();
  await page.locator('.custom-form-members-primary').getByLabel('Form colleague').check();
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(page.getByRole('button', { name: 'Edit form & assignments' })).toBeVisible();
  expect(state.writes[0].p_publish).toBe(true);
  expect(state.writes[0].p_form.slug).toBe('community-volunteers');
  expect(state.writes[0].p_page).toMatchObject({
    title: 'Volunteer with us',
    slug: 'volunteer-with-us',
    placement: '/youth',
    published: true,
  });
  expect(state.errors).toEqual([]);
});

test('an existing-page conflict preserves the new form and page selection for retry', async ({
  page,
}) => {
  const state = await fixture(page, { failSave: true });
  await page.goto('/admin?section=forms');
  await page.getByRole('button', { name: 'New form', exact: true }).click();
  await page.getByLabel('Form title', { exact: true }).fill('Community volunteers');
  await page.getByLabel('Website location').selectOption('existing');
  await page.getByRole('combobox', { name: 'Existing page', exact: true }).selectOption(id(20));
  await page
    .getByRole('tablist', { name: 'Form setup steps' })
    .getByRole('tab', { name: 'Responses', exact: true })
    .click();
  await page.locator('.custom-form-members-primary').getByLabel('Form colleague').check();
  await page.getByRole('button', { name: 'Save and publish', exact: true }).click();
  await expect(page.locator('.custom-form-notice')).toContainText('another session');
  await page
    .getByRole('tablist', { name: 'Form setup steps' })
    .getByRole('tab', { name: 'Basics', exact: true })
    .click();

  await expect(page.getByLabel('Form title', { exact: true })).toHaveValue('Community volunteers');
  await expect(page.getByRole('combobox', { name: 'Existing page', exact: true })).toHaveValue(
    id(20),
  );
  expect(state.writes[0].p_page).toMatchObject({
    id: id(20),
    expected_updated_at: timestamp,
    published: true,
  });
  expect(state.errors).toEqual([]);
});

test('form managers without content access create a direct form and cannot select pages', async ({
  page,
}) => {
  const state = await fixture(page, { permissions: ['forms_manage'] });
  await page.goto('/admin?section=forms');
  await page.getByRole('button', { name: 'New form', exact: true }).click();
  await expect(page.getByLabel('Website location').locator('option')).toHaveText([
    'Direct form link',
  ]);
  await page.getByLabel('Form title', { exact: true }).fill('Direct form');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].p_page).toBeNull();
  expect(state.writes[0].p_publish).toBe(false);
  expect(state.errors).toEqual([]);
});

test('a website editor can publish a linked draft page when returning to a form later', async ({
  page,
}) => {
  const state = await fixture(page, { linkedDraftPage: true });
  await page.goto(`/admin?section=forms&form=${contact.id}&edit=1`);
  await page.getByLabel('Publish linked page with this form').check();
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].p_page).toMatchObject({
    id: id(20),
    form_id: contact.id,
    published: true,
    expected_updated_at: timestamp,
  });
  expect(state.writes[0].p_publish).toBe(true);
  expect(state.errors).toEqual([]);
});

test('response-only contact staff see their inbox without question-editing controls', async ({
  page,
}) => {
  const state = await fixture(page, { permissions: ['forms_contact'], canManage: false });
  await page.goto('/contact');
  await expect(page.getByLabel('Your message')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit this form', exact: true })).toHaveCount(0);
  await page.goto('/admin?section=forms');
  await expect(page.getByRole('button', { name: 'New form', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit form', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Contact Us: review responses', exact: true }).click();
  await expect(page).toHaveURL(/tab=responses/);
  await expect(page.getByRole('heading', { name: 'Responses', exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

for (const width of [320, 1280]) {
  test(`form preview is a focused view and preserves drafts and preview answers at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await fixture(page);
    await page.goto(`/admin?section=forms&form=${contact.id}&edit=1`);
    const views = page.getByRole('navigation', { name: 'Form editor view' });
    await expect(views.getByRole('button', { name: 'Edit questions' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByLabel('Form title', { exact: true }).fill('Contact our team');
    await views.getByRole('button', { name: 'Preview questions' }).click();
    await expect(page.getByLabel('Form title', { exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Save form draft', exact: true })).toBeEnabled();
    const preview = page.locator('.custom-form-editor .workspace-card.workspace-form');
    await expect(preview.getByRole('heading', { name: 'Contact our team' })).toBeVisible();
    await preview.getByRole('button', { name: 'Show all questions', exact: true }).click();
    await preview.getByLabel('Your name', { exact: false }).fill('Preview only');
    await views.getByRole('button', { name: 'Edit questions' }).click();
    await expect(page.getByLabel('Form title', { exact: true })).toHaveValue('Contact our team');
    await expect(page.getByRole('button', { name: 'Save form draft', exact: true })).toBeEnabled();
    await views.getByRole('button', { name: 'Preview questions' }).click();
    await preview.getByRole('button', { name: 'Show all questions', exact: true }).click();
    await expect(preview.getByLabel('Your name', { exact: false })).toHaveValue('Preview only');
    await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(1);
    expect(state.writes[0].p_publish).toBe(true);
    expect(state.writes[0].p_form.title).toBe('Contact our team');
    expect(state.writes[0].p_form.responsible_ids).toEqual([id(1)]);
    expect(state.writes[0].p_form.schema).toEqual(contact.schema);
    expect(state.writes[0]).not.toHaveProperty('answers');
    expect(state.errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test('built-in contact renders published questions and only managers see edit controls', async ({
  page,
}) => {
  let state = await fixture(page, { signedIn: false });
  await page.goto('/contact');
  await expect(page.getByLabel('Your message')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Staff form controls' })).toHaveCount(0);
  expect(state.errors).toEqual([]);
  await page.unroute('**/preview-api/**');
  state = await fixture(page);
  await page.goto('/contact');
  await expect(page.getByRole('link', { name: 'Edit this form', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Responses', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`form=${contact.id}`));
  await expect(page.getByRole('button', { name: 'Responses (5)', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('staff can start a guided enquiry and preview both branches without publishing', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto('/admin?section=forms');
  await page.getByRole('button', { name: 'New form', exact: true }).click();
  await page.getByRole('button', { name: 'Guided enquiry', exact: true }).click();
  await page.getByRole('button', { name: 'Preview questions', exact: true }).click();
  const preview = page.locator('.custom-form-editor .smart-form');
  await preview.getByRole('radio', { name: 'Follow up an existing request', exact: true }).check();
  await preview.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(preview.getByLabel('Your reference, if you have one')).toBeVisible();
  await preview.getByRole('button', { name: 'Back', exact: true }).click();
  await preview.getByRole('radio', { name: 'Start a new enquiry', exact: true }).check();
  await preview.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(preview.getByLabel('How can we help?')).toBeVisible();
  await expect(preview.getByLabel('Your reference, if you have one')).toHaveCount(0);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('guided form steps retain edits and support keyboard navigation without saving', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto('/admin?section=forms');
  await page.getByRole('button', { name: 'New form', exact: true }).click();
  await page.getByLabel('Form title', { exact: true }).fill('A retained draft');
  const steps = page.getByRole('tablist', { name: 'Form setup steps' });
  await steps.getByRole('tab', { name: 'Questions', exact: true }).click();
  await expect(page.getByLabel('Form title', { exact: true })).toBeHidden();
  await steps.getByRole('tab', { name: 'Questions', exact: true }).press('End');
  await expect(steps.getByRole('tab', { name: 'Responses', exact: true })).toBeFocused();
  await steps.getByRole('tab', { name: 'Responses', exact: true }).press('Home');
  await expect(page.getByLabel('Form title', { exact: true })).toHaveValue('A retained draft');
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});
