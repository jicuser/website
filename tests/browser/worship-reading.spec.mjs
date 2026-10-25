import { test, expect } from '@playwright/test';
import { QURAN_SURAHS } from '../../src/content/quranSurahs.js';

async function publicSite(page) {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: route.request().url().includes('/auth/v1/settings')
        ? '{"external":{"google":false}}'
        : '[]',
    }),
  );
}

async function mockQuran(page, delayedSurah = null) {
  await page.addInitScript(
    ({ surahs, delayed }) => {
      const originalFetch = window.fetch;
      window.__abortedQuranRequests = [];
      window.fetch = (input, options) => {
        const match = String(input).match(/api\.alquran\.cloud\/v1\/surah\/(\d+)\/editions/);
        if (!match) return originalFetch(input, options);
        const number = Number(match[1]);
        const count = surahs[number - 1].ayahCount;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  code: 200,
                  data: ['quran-uthmani', 'en.sahih'].map((identifier) => ({
                    number,
                    edition: { identifier },
                    ayahs: Array.from({ length: count }, (_, index) => ({
                      numberInSurah: index + 1,
                      text: `${identifier === 'quran-uthmani' ? 'نص اختبار' : 'Translation fixture'} ${number}:${index + 1}`,
                    })),
                  })),
                }),
              }),
            number === delayed ? 1500 : 20,
          );
          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            window.__abortedQuranRequests.push(number);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      };
    },
    { surahs: QURAN_SURAHS, delayed: delayedSurah },
  );
}

test('readers expose real adhkar, Janazah recitations and the canonical prayer-times route', async ({
  page,
}) => {
  await publicSite(page);
  await page.goto('/worship');
  await expect(page.locator('.worship-compact-resources > a')).toHaveCount(6);
  await expect(page.locator('.worship-compact-resources > a')).toHaveCount(6);
  await page.locator('.worship-compact-resources a[href="/worship/daily-duas"]').click();
  await expect(page.getByRole('heading', { name: 'Morning adhkar', exact: true })).toBeVisible();
  await expect(page.locator('.worship-recitation-arabic')).toHaveCount(3);
  await page.getByRole('button', { name: 'Evening', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Evening adhkar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'After Salah', exact: true }).click();
  await expect(page.locator('.worship-recitation-card')).toHaveCount(6);
  await page.getByText('In this collection', { exact: false }).click();
  await page.getByRole('link', { name: 'Glorify Allah', exact: true }).click();
  await expect(page.locator('#adhkar-after-salah-tasbih')).toBeFocused();
  await expect(page).toHaveURL(/collection=after-salah#adhkar-after-salah-tasbih$/);
  await page.locator('.worship-preferences > summary').click();
  await page.getByLabel('Show meaning', { exact: true }).click();
  await expect(page.locator('.worship-meaning')).toHaveCount(0);
  await page.getByLabel('Show meaning', { exact: true }).click();
  await page.goto('/worship/janazah-guide');
  await expect(page.locator('.worship-janazah-steps > li')).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'Open Urdu PDF' })).toHaveAttribute(
    'href',
    /\/ur\/pdf\/2014\/62-1\.pdf/,
  );
  await expect(page.getByRole('link', { name: 'Contact the centre', exact: true })).toHaveAttribute(
    'href',
    '/contact',
  );
  await page.getByText('Supplications for a child', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'For a girl', exact: true })).toBeVisible();
  await page.goto('/worship/daily-salah');
  await expect(page).toHaveURL(/\/prayer-times$/);
});

test('Arabic and reading choices fit narrow phones in both themes', async ({ page }) => {
  await publicSite(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/worship');
    await expect(page.locator('.worship-compact-resources > a')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('.worship-compact-resources a[href="/worship/daily-duas"]').click();
    await page.locator('.worship-preferences > summary').click();
    await page.getByLabel('Arabic text size', { exact: true }).fill('48');
    await page.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await expect(page.locator('.worship-recitation-arabic').first()).toHaveCSS(
        'font-size',
        '48px',
      );
      await expect(page.locator('.worship-meaning').first()).toBeVisible();
      await expect(page.locator('.worship-transliteration').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
});

test('Qur’an search, reading controls and saved verse survive a reload', async ({ page }) => {
  await publicSite(page);
  await mockQuran(page);
  await page.goto('/worship/quran');
  await expect(page.getByRole('heading', { name: '1. Al-Faatiha', exact: true })).toBeVisible();
  await expect(page.locator('.worship-quran-ayah')).toHaveCount(7);
  await page.getByRole('searchbox', { name: 'Search surahs' }).fill('Mankind');
  await page.getByRole('button', { name: '114. An-Naas — Mankind', exact: true }).click();
  await expect(page.locator('.worship-quran-ayah')).toHaveCount(6);
  await page.getByRole('button', { name: 'Save verse 114:3', exact: true }).click();
  await page.locator('.worship-preferences > summary').click();
  await page.getByLabel('Show English translation', { exact: true }).click();
  await page.getByLabel('Arabic text size', { exact: true }).fill('40');
  await expect(page.locator('.worship-quran-translation')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Surah', { exact: true })).toHaveValue('114');
  await expect(page.getByLabel('Arabic text size', { exact: true })).toHaveValue('40');
  await expect(page.getByLabel('Show English translation', { exact: true })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: /Continue reading/ }).click();
  await expect(page.locator('#quran-ayah-114-3')).toBeFocused();
  await expect(page.locator('#quran-ayah-114-3 .worship-recitation-arabic')).toHaveCSS(
    'font-size',
    '40px',
  );
});

test('changing surah cancels the old request and a failed load offers Quran.com', async ({
  page,
}) => {
  await publicSite(page);
  await mockQuran(page, 2);
  await page.goto('/worship/quran');
  await expect(page.locator('.worship-quran-ayah')).toHaveCount(7);
  await page.getByLabel('Surah', { exact: true }).selectOption('2');
  await expect(page.getByRole('status').filter({ hasText: 'Loading Al-Baqara' })).toBeVisible();
  await page.getByLabel('Surah', { exact: true }).selectOption('114');
  await expect(page.locator('.worship-quran-ayah')).toHaveCount(6);
  await expect
    .poll(() => page.evaluate(() => window.__abortedQuranRequests.includes(2)))
    .toBe(true);
  await expect(page.locator('.worship-quran-translation').first()).toHaveText(
    'Translation fixture 114:1',
  );
  await page.evaluate(() => {
    const fetch = window.fetch;
    window.fetch = (input, options) =>
      String(input).includes('api.alquran.cloud')
        ? Promise.resolve({ ok: false })
        : fetch(input, options);
  });
  await page.getByLabel('Surah', { exact: true }).selectOption('1');
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.getByRole('alert').getByRole('link')).toHaveAttribute(
    'href',
    'https://quran.com/1',
  );
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
});
