import { test, expect } from '@playwright/test';
import { sitewideFixture, staffId } from './helpers/sitewideFixture.mjs';
const courseId = '20000000-0000-4000-8000-000000000001';
const tables = {
  learning_courses: [
    {
      id: courseId,
      title: 'Test Madrassah class',
      description: 'Private course information',
      department: 'madrassah',
    },
  ],
  learning_students: [{ id: 'student-1', display_name: 'Test pupil', guardian_id: staffId }],
  learning_enrolments: [{ course_id: courseId, student_id: 'student-1', active: true }],
};
for (const width of [320, 390, 1280]) {
  test(`learning keeps drafts and keyboard navigation at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => localStorage.setItem('jic-theme', 'dark'));
    const state = await sitewideFixture(page, { signedIn: true, tables });
    await page.goto('/portal?tab=learning');
    await expect(page.getByRole('heading', { name: 'My learning', exact: true })).toBeVisible();
    await page
      .getByRole('combobox', { name: 'Learning area', exact: true })
      .selectOption('madrassah');
    await page.getByRole('combobox', { name: 'Course', exact: true }).selectOption(courseId);
    const progress = page.getByRole('tabpanel', { name: 'Progress & plans' });
    await expect(progress).toBeVisible();
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await progress.getByLabel('Title', { exact: true }).fill('Draft progress note');
    await page.getByRole('tab', { name: 'Resources', exact: true }).click();
    await expect(progress).toBeHidden();
    await page.getByRole('tab', { name: 'Progress & plans', exact: true }).click();
    await expect(progress.getByLabel('Title', { exact: true })).toHaveValue('Draft progress note');
    await page.getByRole('tab', { name: 'Progress & plans', exact: true }).press('End');
    await expect(page.getByRole('tab', { name: 'Fees', exact: true })).toBeFocused();
    await expect(page.getByText('Choose a student above to see their course fees.')).toBeVisible();
    await page.getByRole('tab', { name: 'Fees', exact: true }).press('Home');
    await expect(page.getByRole('tab', { name: 'Progress & plans', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('learning-progress.png'), fullPage: true });
    await page.getByRole('combobox', { name: 'Course', exact: true }).selectOption('');
    await page.getByRole('combobox', { name: 'Course', exact: true }).selectOption(courseId);
    await expect(progress.getByLabel('Title', { exact: true })).toHaveValue('');
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test('a parent never receives teacher editing controls in learning panels', async ({ page }) => {
  const state = await sitewideFixture(page, { signedIn: true, owner: false, tables });
  await page.goto('/portal?tab=learning');
  await page
    .getByRole('combobox', { name: 'Learning area', exact: true })
    .selectOption('madrassah');
  await page.getByRole('combobox', { name: 'Course', exact: true }).selectOption(courseId);
  await expect(page.getByRole('heading', { name: 'Add a learning record' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Attendance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Schedule a class' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Meetings', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Student (optional filter)', exact: true })
    .selectOption('student-1');
  await expect(page.getByRole('heading', { name: 'Request a meeting' })).toBeVisible();
  expect(state.errors).toEqual([]);
});
