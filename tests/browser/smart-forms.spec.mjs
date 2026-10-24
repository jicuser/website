import { test, expect } from '@playwright/test';

const form = {
  slug: 'guided-enquiry',
  title: 'Guided enquiry',
  description: 'Contact the centre.',
  version: 4,
  schema: {
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true },
      { id: 'email', label: 'Email address', type: 'email', required: true },
      {
        id: 'reason',
        label: 'What would you like to do?',
        type: 'select',
        required: true,
        options: ['New enquiry', 'Existing request'],
      },
      {
        id: 'reference',
        label: 'Request reference',
        type: 'text',
        required: true,
        show_when: { field: 'reason', operator: 'equals', value: 'Existing request' },
      },
      { id: 'message', label: 'Anything else?', type: 'textarea' },
      { id: 'consent', label: 'I confirm these details', type: 'checkbox', required: true },
    ],
  },
};

async function fixture(page, definition = form, handle) {
  const state = { submissions: [], errors: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    try {
      body = route.request().postDataJSON();
    } catch {
      /* Binary attachment. */
    }
    if (handle && (await handle(path, body, route))) return;
    let data = [];
    if (path.endsWith('/get_public_form')) data = definition;
    if (path.endsWith('/custom-forms') && body.action === 'submit') {
      state.submissions.push(body);
      data = { ok: true, id: '00000000-0000-4000-8000-000000000001' };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

for (const [theme, width] of [
  ['light', 320],
  ['dark', 390],
  ['light', 1280],
]) {
  test(`guided questions branch, review and submit once in ${theme} at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript((value) => {
      localStorage.setItem('jic-theme', value);
      sessionStorage.setItem('jic-salawat-shown', '1');
    }, theme);
    const state = await fixture(page);
    await page.goto('/forms/guided-enquiry');
    await expect(page.getByLabel('Your name')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Existing request', exact: true }).check();
    await page.screenshot({ path: info.outputPath('question.png') });
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Request reference is required');
    await expect(page.getByLabel('Request reference')).toBeFocused();
    await page.getByLabel('Request reference').fill('OLD-123');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Your name').fill('Test visitor');
    await page.getByLabel('Email address').fill('visitor@example.org');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('I confirm these details').check();
    await page.getByRole('button', { name: 'Review answers', exact: true }).click();
    await expect(page.locator('.smart-form-review')).toContainText('OLD-123');
    await page
      .getByRole('button', { name: 'Edit What would you like to do?', exact: true })
      .click();
    await page.getByRole('radio', { name: 'New enquiry', exact: true }).check();
    await page.getByRole('button', { name: 'Review answers', exact: true }).click();
    await expect(page.locator('.smart-form-review')).not.toContainText('OLD-123');
    await expect(page.locator('.smart-form-review')).toContainText('visitor@example.org');
    expect(state.submissions).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('review.png') });
    await page.getByRole('button', { name: 'Send response', exact: true }).evaluate((button) => {
      button.click();
      button.click();
    });
    await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
    expect(state.submissions).toHaveLength(1);
    expect(state.submissions[0].answers).toEqual({
      name: 'Test visitor',
      email: 'visitor@example.org',
      reason: 'New enquiry',
      consent: true,
    });
    expect(state.submissions[0].version).toBe(4);
    expect(state.errors).toEqual([]);
  });
}

test('Enter advances a validated step and never skips review', async ({ page }) => {
  const definition = {
    ...form,
    schema: {
      fields: [
        form.schema.fields[0],
        form.schema.fields[1],
        { id: 'message', label: 'Your message', type: 'textarea', required: true },
      ],
    },
  };
  const state = await fixture(page, definition);
  await page.goto('/forms/guided-enquiry');
  await page.getByLabel('Your message').fill('First line');
  await page.getByLabel('Your message').press('End');
  await page.getByLabel('Your message').press('Enter');
  await expect(page.getByLabel('Your message')).toHaveValue('First line\n');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Visitor');
  await page.getByLabel('Email address').fill('invalid');
  await page.getByLabel('Email address').press('Enter');
  await expect(page.getByRole('alert')).toContainText('Check Email address');
  await page.getByLabel('Email address').fill('visitor@example.org');
  await page.getByLabel('Email address').press('Enter');
  await expect(page.getByRole('heading', { name: 'Check before sending' })).toBeVisible();
  expect(state.submissions).toEqual([]);
});

test('changing a branch invalidates a pending upload and omits its claim from review and submission', async ({
  page,
}) => {
  let release,
    started = false;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const definition = {
    ...form,
    schema: {
      fields: [
        form.schema.fields[2],
        {
          id: 'photo',
          label: 'Attach a photograph',
          type: 'image',
          show_when: { field: 'reason', operator: 'equals', value: 'Existing request' },
        },
      ],
    },
  };
  const state = await fixture(page, definition, async (path, body, route) => {
    let data;
    if (path.includes('/storage/v1/object/upload/sign/')) data = { Key: 'preview/path' };
    if (path.endsWith('/custom-forms') && body.action === 'upload_prepare')
      data = {
        upload_id: '00000000-0000-4000-8000-000000000007',
        upload_token: 'private-claim',
        path: 'preview/path',
        token: 'private-signed-token',
      };
    if (path.endsWith('/custom-forms') && body.action === 'upload_finish') {
      started = true;
      await gate;
      data = { ok: true };
    }
    if (data === undefined) return false;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    return true;
  });
  await page.goto('/forms/guided-enquiry');
  await page.getByRole('button', { name: 'Show all questions', exact: true }).click();
  await page.getByLabel('What would you like to do?').selectOption('Existing request');
  await page.getByLabel('Attach a photograph').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, ...Array(16).fill(0)]),
  });
  try {
    await expect.poll(() => started).toBe(true);
    await page.getByLabel('What would you like to do?').selectOption('New enquiry');
    await expect(page.getByLabel('Attach a photograph')).toHaveCount(0);
  } finally {
    release();
  }
  await page.getByRole('button', { name: 'Review answers', exact: true }).click();
  await expect(page.locator('.smart-form-review')).not.toContainText('photo.png');
  await page.getByRole('button', { name: 'Send response', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
  expect(state.submissions[0].answers).toEqual({ reason: 'New enquiry' });
  expect(state.submissions[0].uploads).toEqual([]);
  expect(state.errors).toEqual([]);
});
