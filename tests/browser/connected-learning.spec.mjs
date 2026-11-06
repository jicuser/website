import { test, expect } from '@playwright/test';
import { sitewideFixture, staffId } from './helpers/sitewideFixture.mjs';
const courseId = '20000000-0000-4000-8000-000000000001';
const studentId = '30000000-0000-4000-8000-000000000001';
const admissionId = '40000000-0000-4000-8000-000000000001';
const baseTables = () => ({
  get_learning_access: true,
  learning_courses: [
    {
      id: courseId,
      title: 'Adult Qur’an class',
      department: 'adult',
      archived: false,
      capacity: 10,
    },
  ],
  learning_students: [{ id: studentId, display_name: 'Test learner', guardian_id: staffId }],
  learning_staff: [],
  learning_enrolments: [],
  learning_admissions: [],
  learning_course_forms: [],
  list_learning_admissions: { rows: [], total: 0 },
  task_assignees: [{ id: staffId, display_name: 'Owner' }],
  admin_forms_overview: [],
});
for (const width of [390, 1280])
  test(`owner reviews a class place without activating it at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    const tables = baseTables();
    const state = await sitewideFixture(page, { signedIn: true, tables });
    let submitted;
    await page.route('**/rpc/review_learning_admission', async (route) => {
      submitted = route.request().postDataJSON();
      tables.learning_admissions = [
        {
          id: admissionId,
          course_id: courseId,
          student_id: studentId,
          state: 'approved',
          amount_minor: 0,
          fee_id: null,
        },
      ];
      tables.list_learning_admissions = { rows: tables.learning_admissions, total: 1 };
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(admissionId) });
    });
    await page.goto('/portal?tab=admissions');
    await expect(
      page.getByRole('heading', { name: 'Admissions & places', exact: true }),
    ).toBeVisible();
    const review = page.getByRole('form', { name: 'Review an application' });
    await review.getByRole('combobox', { name: 'Class', exact: true }).selectOption(courseId);
    await review.getByRole('combobox', { name: 'Student', exact: true }).selectOption(studentId);
    await review.getByLabel('Admission fee (£)').fill('0');
    await review.getByLabel('Review note').fill('Walk-in registration and consent checked');
    await review.getByLabel('I have checked the student, class and any required consent.').check();
    await review.getByRole('button', { name: 'Approve application' }).click();
    await expect(page.getByText('Approved · ready to enrol', { exact: true })).toBeVisible();
    expect(submitted.p_amount_minor).toBe(0);
    expect(submitted.p_student_id).toBe(studentId);
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('admissions.png'), fullPage: true });
  });
test('server-off learning stays unavailable even through an owner deep link', async ({ page }) => {
  const tables = { ...baseTables(), get_learning_access: false };
  let privateReads = 0;
  await sitewideFixture(page, { signedIn: true, tables });
  page.on('request', (req) => {
    if (/rest\/v1\/learning_/.test(req.url())) privateReads++;
  });
  await page.goto('/portal?tab=admissions');
  await expect(page.getByRole('heading', { name: 'Welcome, Design test' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Admissions & places' })).toHaveCount(0);
  expect(privateReads).toBe(0);
});
test('parent account gets family records without management or receipt-confirmation controls', async ({
  page,
}) => {
  const tables = baseTables();
  tables.learning_enrolments = [{ course_id: courseId, student_id: studentId, active: true }];
  const state = await sitewideFixture(page, { signedIn: true, owner: false, tables });
  await page.goto('/portal?tab=family');
  await expect(page.getByRole('heading', { name: 'Test learner', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admissions & places', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Manage learning', exact: true })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
for (const [kind, end, expected] of [
  ['time', null, '11:46'],
  ['interval', '12:02', '11:46 – 12:02'],
]) {
  test(`public extra times retain sunrise, Ishraq and the published Zawal ${kind} without inferring sunset`, async ({
    page,
  }, info) => {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
    await sitewideFixture(page, {
      tables: {
        prayer_times: [
          {
            d_date: date,
            fajr_begins: '05:30',
            fajr_jamah: '06:00',
            sunrise: '07:00',
            zuhr_begins: '12:10',
            zuhr_jamah: '13:00',
            asr_begins: '14:30',
            asr_jamah: '15:00',
            maghrib_begins: '16:30',
            maghrib_jamah: '16:35',
            isha_begins: '18:00',
            isha_jamah: '19:00',
          },
        ],
        prayer_day_details: {
          d_date: date,
          sunset: null,
          zawwal_start: '11:46',
          zawwal_end: end,
          source: 'Approved November timetable',
          published: true,
          revision: 1,
        },
      },
    });
    await page.goto('/prayer-times');
    const details = page.locator('.salah-daily-card .jic-card-extra-times');
    await expect(details).toBeVisible();
    await expect(details.locator('.jic-card-shuroq dd')).toHaveText('07:00');
    await expect(details.locator('.jic-card-ishraq dd')).toHaveText('07:20');
    await expect(details.locator('.jic-card-zawal dd')).toHaveText(expected);
    await expect(details.locator('.jic-card-sunset')).toHaveCount(0);
    const source = page.locator('.salah-daily-card .jic-extra-times-source');
    await source.getByText('Timetable source', { exact: true }).click();
    await expect(source).toContainText('Approved November timetable');
    const information = page.locator('.salah-information');
    await information.getByText('About these times', { exact: true }).click();
    await expect(information).toContainText('20 minutes after sunrise');
    await page.screenshot({ path: info.outputPath('additional-times.png'), fullPage: true });
  });
}
test('extra-time editor publishes only a checked revision and retains a conflicting draft', async ({
  page,
}, info) => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  await sitewideFixture(page, { signedIn: true, tables: { prayer_day_details: null } });
  let saves = 0;
  await page.route('**/rpc/save_prayer_day_details', async (route) => {
    const body = route.request().postDataJSON();
    saves++;
    if (saves === 1) {
      expect(body.p_expected_revision).toBe(0);
      expect(body.p_published).toBe(true);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          d_date: date,
          sunset: body.p_sunset,
          zawwal_start: null,
          zawwal_end: null,
          source: body.p_source,
          published: true,
          revision: 1,
        }),
      });
    } else
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'P0001',
          message: 'These times changed in another editor. Reload before saving',
        }),
      });
  });
  await page.goto('/admin?section=prayer');
  await page.getByRole('button', { name: 'Sunset & Zawal', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Additional prayer times editor' });
  await editor.getByLabel('Sunset fallback (optional)', { exact: true }).fill('4:32 PM');
  await editor.getByLabel('Source / approval reference').fill('Approved November timetable');
  await editor.getByLabel('Show these confirmed times on the website').check();
  await editor.getByRole('button', { name: 'Save extra times', exact: true }).click();
  await expect(editor.getByText('Extra times published.', { exact: true })).toBeVisible();
  await editor.getByLabel('Sunset fallback (optional)', { exact: true }).fill('4:33 PM');
  await editor.getByRole('button', { name: 'Save extra times', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('changed in another editor');
  await expect(editor.getByLabel('Sunset fallback (optional)', { exact: true })).toHaveValue(
    '4:33',
  );
  await expect(editor.getByLabel('Sunset fallback (optional) AM or PM')).toHaveValue('PM');
  await page.screenshot({ path: info.outputPath('extra-time-editor.png'), fullPage: true });
});
