import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { prayerMarkup } from '../helpers/prayer-widget-fixture.mjs';

const css = await readFile(new URL('../../src/styles/tv.css', import.meta.url), 'utf8');

for (const layout of ['horizontal', 'vertical', 'compact', 'clock-table']) {
  test(`${layout} keeps prayer text inside short, tall and normal-sized blocks`, async ({ page }) => {
    for (const [width, height] of [[1920, 108], [900, 500], [540, 900], [300, 80]]) {
      await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:Arial}${css}</style>
        <div class="scene-source-times" style="width:${width}px;height:${height}px">${prayerMarkup(layout)}</div>`);
      const overflows = await page.locator('.scene-source-times').evaluate((block) => {
        const issues = [];
        for (const cell of block.querySelectorAll('.scene-timetable-prayers > div, .scene-prayer-table-row, .scene-prayer-table-head, .scene-jummah-row > span, .scene-salah-clock')) {
          const box = cell.getBoundingClientRect();
          const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
          let text;
          while ((text = walker.nextNode())) {
            if (!text.textContent.trim() || getComputedStyle(text.parentElement).display === 'none') continue;
            const range = document.createRange();
            range.selectNode(text);
            for (const rect of range.getClientRects()) {
              if (rect.width && (rect.top < box.top - 1 || rect.bottom > box.bottom + 1 || rect.left < box.left - 1 || rect.right > box.right + 1)) {
                issues.push(text.textContent);
              }
            }
          }
        }
        return issues;
      });
      expect(overflows, `${layout} at ${width} × ${height}`).toEqual([]);
    }
  });
}

test('a fixed-size TV table renders the same columns on phone and desktop browsers', async ({ page }) => {
  const columns = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.setContent(`<style>*{box-sizing:border-box}${css}</style><div class="scene-source-times" style="width:900px;height:500px">${prayerMarkup('clock-table')}</div>`);
    columns.push(await page.locator('.scene-prayer-table-head > span').evaluateAll((cells) => cells.filter((cell) => getComputedStyle(cell).display !== 'none').map((cell) => cell.textContent)));
  }
  expect(columns[0]).toEqual(columns[1]);
});
