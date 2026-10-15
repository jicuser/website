import { test, expect } from '@playwright/test';

async function openTimetable(page) {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(hostname) ? route.continue() : route.abort();
  });
  await page.route('**/preview-api/**', async (route) => {
    const url = new URL(route.request().url());
    const dates = url.searchParams.getAll('d_date');
    const month = dates.find((value) => value.startsWith('gte.'))?.slice(4, 11) || '2026-10';
    const day = (date) => ({
      d_date: date,
      fajr_begins: '06:14',
      fajr_jamah: '06:45',
      sunrise: '07:31',
      zuhr_begins: '12:59',
      zuhr_jamah: '13:45',
      asr_begins: '16:22',
      asr_jamah: '17:15',
      maghrib_begins: '18:18',
      maghrib_jamah: '18:18',
      isha_begins: '19:29',
      isha_jamah: '20:15',
    });
    const data = url.pathname.endsWith('/prayer_times')
      ? dates.some((value) => value.startsWith('gte.'))
        ? Array.from({ length: 31 }, (_, i) => day(`${month}-${String(i + 1).padStart(2, '0')}`))
        : [day(dates[0]?.replace('eq.', '') || '2026-10-14')]
      : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/prayer-times/monthly');
  await expect(
    page.getByRole('button', { name: 'Preview phone wallpaper', exact: true }),
  ).toBeVisible();
}

async function pageGeometry(page) {
  return page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    scale: visualViewport.scale,
    x: scrollX,
    y: scrollY,
    bodyOverflow: document.body.style.overflow,
  }));
}

for (const width of [320, 390]) {
  test(`timetable previews keep the page and controls within ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openTimetable(page);
    const table = page.locator('.monthly-timetable-scroll');
    // Screen-reader time labels must scroll with their cells, not escape to the page.
    expect(await table.locator('.sr-only').evaluateAll((nodes) =>
      nodes.every((node) => node.closest('.monthly-timetable-scroll').contains(node.offsetParent)),
    )).toBe(true);
    await table.evaluate((node) => {
      node.scrollLeft = 240;
    });
    for (const format of ['monthly timetable', 'phone wallpaper']) {
      const trigger = page.getByRole('button', { name: `Preview ${format}`, exact: true });
      await trigger.scrollIntoViewIfNeeded();
      const before = await pageGeometry(page);
      expect(before.width).toBeLessThanOrEqual(width);
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const bounds = await dialog.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const image = node.querySelector('img').getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          scroll: node.scrollWidth,
          client: node.clientWidth,
          imageLeft: image.left,
          imageRight: image.right,
        };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width);
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
      expect(bounds.imageLeft).toBeGreaterThanOrEqual(bounds.left);
      expect(bounds.imageRight).toBeLessThanOrEqual(bounds.right);
      await page.screenshot({ path: testInfo.outputPath(`${format.replaceAll(' ', '-')}.png`) });
      await page.getByRole('button', { name: 'Close image preview', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect.poll(async () => (await pageGeometry(page)).y).toBeCloseTo(before.y, 0);
      const after = await pageGeometry(page);
      expect(after.width).toBeLessThanOrEqual(width);
      expect(after.scale).toBe(before.scale);
      expect(after.bodyOverflow).toBe(before.bodyOverflow);
      expect(await table.evaluate((node) => node.scrollLeft)).toBe(240);
      await expect(trigger).toBeFocused();
    }
    expect(errors).toEqual([]);
  });
}
