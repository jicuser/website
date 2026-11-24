import { test, expect } from '@playwright/test';
import { sitewideFixture } from './helpers/sitewideFixture.mjs';

test.use({ hasTouch: true });

async function open(page, width, installed = false) {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const state = await sitewideFixture(page);
  await page.addInitScript(
    ({ installed, theme }) => {
      localStorage.removeItem('jic.arabic.builder.v1');
      localStorage.setItem('jic-theme', theme);
      sessionStorage.setItem('jic-salawat-shown', '1');
      if (installed)
        Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    },
    { installed, theme: width === 390 ? 'dark' : 'light' },
  );
  await page.goto('/learning/arabic');
  const builder = page.locator('#arabic-workspace > .arabic-builder');
  await expect(builder.locator(':scope > .arabic-result .arabic-translation')).toHaveText(
    'This is our house',
  );
  return { builder, state };
}

async function fits(page) {
  const size = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.width + 1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

for (const width of [390, 320]) {
  test(`English meanings link to the right Arabic ink and show exact changes at ${width}px`, async ({
    page,
  }, info) => {
    const { builder, state } = await open(page, width);
    const result = builder.locator(':scope > .arabic-result');
    const layer = result.locator('.arabic-connection-layer');
    await expect(layer).toHaveAttribute('data-connection-part', 'owner');
    const ring = layer.locator('.arabic-connection-ring[data-part="owner"]');
    const ringBox = await ring.boundingBox();
    const inkBoxes = await result
      .locator('.arabic-script .arabic-glyph-ink[data-part="owner"]')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
        }),
      );
    expect(inkBoxes.length).toBeGreaterThan(0);
    for (const box of inkBoxes) {
      expect(ringBox.x).toBeLessThanOrEqual(box.x);
      expect(ringBox.y).toBeLessThanOrEqual(box.y);
      expect(ringBox.x + ringBox.width).toBeGreaterThanOrEqual(box.right);
      expect(ringBox.y + ringBox.height).toBeGreaterThanOrEqual(box.bottom);
    }
    expect(await layer.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
    expect(
      await layer.locator('path').evaluate((element) => element.getTotalLength()),
    ).toBeGreaterThan(0);
    await builder
      .getByRole('region', { name: 'Whose?', exact: true })
      .getByRole('button', { name: /^His\b/ })
      .click();
    await result.getByRole('button', { name: /^Change beginning:/ }).click();
    await builder
      .getByRole('region', { name: 'Start with…', exact: true })
      .getByRole('button', { name: /^In…/ })
      .click();
    await expect(result.locator('.arabic-translation')).toHaveText('In his house');
    const comparison = builder.getByRole('region', { name: 'See what changed', exact: true });
    await expect(comparison.locator('.arabic-change-latin')).toHaveText([
      'hādhā baytuhu',
      'fī baytihi',
    ]);
    await expect(comparison.locator('.arabic-change-meaning')).toHaveText([
      'This is his house',
      'In his house',
    ]);
    await comparison.getByRole('button', { name: 'Replay this change', exact: true }).click();
    await expect(result.locator('.arabic-translation')).toHaveText('In his house');
    await expect(comparison.locator('.arabic-change-latin')).toHaveText([
      'hādhā baytuhu',
      'fī baytihi',
    ]);
    const animations = await comparison
      .locator('.arabic-glyph-change-ring')
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).animationName),
      );
    expect(animations.length).toBeGreaterThan(0);
    expect(animations.every((name) => name === 'none')).toBe(true);
    await builder.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(result.locator('.arabic-translation')).toHaveText('This is his house');
    await fits(page);
    expect(state.errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('meaning-connections.png'), fullPage: true });
  });

  test(`word map changes stay in the same build state at ${width}px`, async ({ page }, info) => {
    const { builder, state } = await open(page, width);
    const views = builder.getByRole('group', { name: 'Word view', exact: true });
    await views.getByRole('button', { name: 'Map', exact: true }).click();
    const map = builder.getByRole('region', { name: 'Word map', exact: true });
    await expect(map).toBeVisible();
    await expect(map.locator('.arabic-map-meaning')).toHaveText('Our house');
    const owners = map.getByRole('region', { name: 'Whose?', exact: true });
    await owners.getByRole('button', { name: /^His\b/ }).click();
    await expect(map.locator('.arabic-map-pronunciation')).toHaveText('baytuhu');
    await map.getByRole('button', { name: /^In a phrase:/ }).click();
    await expect(owners).toHaveCount(0);
    await map
      .getByRole('region', { name: 'Start with…', exact: true })
      .getByRole('button', { name: /^In…/ })
      .click();
    await expect(map.locator('.arabic-map-pronunciation')).toHaveText('baytihi');
    await expect(map.locator('.arabic-map-meaning')).toHaveText('His house');
    await expect(map.locator('.arabic-choice-tray')).toHaveCount(1);
    const paths = await map.locator('.arabic-map-lines path').evaluateAll((elements) =>
      elements.map((element) => ({
        length: element.getTotalLength(),
        interactive: getComputedStyle(element).pointerEvents,
      })),
    );
    expect(paths.length).toBeGreaterThanOrEqual(4);
    expect(paths.every((path) => path.length > 0 && path.interactive === 'none')).toBe(true);
    await fits(page);
    await page.screenshot({ path: info.outputPath('connected-word-map.png'), fullPage: true });

    await map.getByRole('button', { name: 'Back to builder', exact: true }).click();
    await expect(views.getByRole('button', { name: 'Build', exact: true })).toBeFocused();
    const result = builder.locator(':scope > .arabic-result');
    await expect(result.locator('.arabic-translation')).toHaveText('In his house');
    await expect(result.locator('.arabic-pronunciation')).toHaveText('fī baytihi');
    await expect(result.locator('.arabic-glyphs > .sr-only')).toHaveText('فِي بَيْتِهِ');
    await builder.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(result.locator('.arabic-translation')).toHaveText('This is his house');

    await views.getByRole('button', { name: 'Map', exact: true }).click();
    await map.getByRole('button', { name: /^Whose\?:/ }).click();
    await map
      .getByRole('region', { name: 'Whose?', exact: true })
      .getByRole('button', { name: /^My\b/ })
      .click();
    await map.getByRole('button', { name: /^How many\?:/ }).click();
    await map
      .getByRole('region', { name: 'How many?', exact: true })
      .getByRole('button', { name: /^Two\b/ })
      .click();
    await expect(map.locator('.arabic-map-meaning')).toHaveText('My two houses');
    await map.getByRole('button', { name: 'Back to builder', exact: true }).click();
    await expect(result.locator('.arabic-translation')).toHaveText('These are my two houses');
    await builder
      .getByRole('region', { name: 'How many?', exact: true })
      .getByRole('button', { name: 'Close choices', exact: true })
      .click();
    await result.getByRole('button', { name: 'Change how many?: Two', exact: true }).click();
    await expect(builder.getByRole('region', { name: 'How many?', exact: true })).toBeVisible();
    await expect(builder.getByRole('region', { name: 'Whose?', exact: true })).toHaveCount(0);
    await expect(
      result.getByRole('button', { name: 'Change how many?: Two', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await builder.getByRole('button', { name: 'Step 2: choose whose', exact: true }).click();
    await expect(
      result.getByRole('button', { name: 'Change whose?: My', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      result.getByRole('button', { name: 'Change how many?: Two', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');
    await fits(page);
    expect(state.errors).toEqual([]);
  });
}

test('the installed learning page keeps a working way home without floating site controls', async ({
  page,
}) => {
  const { state } = await open(page, 390, true);
  await expect(page.getByRole('navigation', { name: 'App navigation', exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('complementary', { name: 'Prayer times and search', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.jic-mobile-dock')).toHaveCount(0);
  const home = page.getByRole('link', { name: 'Back to JIC', exact: true });
  await expect(home).toHaveAttribute('href', '/');
  await home.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('navigation', { name: 'App navigation', exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('my keeps its real ending when comparing vowel positions', async ({ page }) => {
  const { builder, state } = await open(page, 320);
  const result = builder.locator(':scope > .arabic-result');
  await builder
    .getByRole('region', { name: 'Whose?', exact: true })
    .getByRole('button', { name: /^My\b/ })
    .click();
  await builder.getByText('More ways', { exact: true }).click();
  await builder.getByRole('button', { name: 'Compare ending sounds', exact: true }).click();
  const vowels = builder.getByRole('region', { name: 'Try a vowel', exact: true });
  await vowels.getByRole('button', { name: /Kasra/ }).click();
  await expect(result.locator('.arabic-pronunciation')).toHaveText('fī baytī');
  await expect(result.locator('.arabic-translation')).toHaveText('In my house');
  await expect(result.locator('.arabic-connection-layer')).toHaveCount(0);
  await expect(result.locator('.arabic-vowel-focus')).toHaveCount(0);
  await expect(vowels.locator('.arabic-vowel-word')).toHaveText(['بَيْتِي', 'بَيْتِي', 'بَيْتِي']);
  await fits(page);
  expect(state.errors).toEqual([]);
});
