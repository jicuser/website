import { test, expect } from '@playwright/test';
import { sitewideFixture } from './helpers/sitewideFixture.mjs';

test.use({ hasTouch: true });

async function openWordStudy(page, width, installed = false) {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const state = await sitewideFixture(page);
  await page.addInitScript(
    ({ installed, theme }) => {
      localStorage.removeItem('jic.arabic.builder.v1');
      localStorage.removeItem('jic.arabic.builder.v2');
      localStorage.removeItem('jic.arabic.word-study.v1');
      localStorage.setItem('jic-theme', theme);
      sessionStorage.setItem('jic-salawat-shown', '1');
      if (installed)
        Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    },
    { installed, theme: width === 390 ? 'dark' : 'light' },
  );
  await page.goto('/learning/arabic');
  const navigation = page.getByRole('navigation', { name: 'Arabic learning tools' });
  await expect(navigation.getByRole('button', { name: 'A word', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const study = page.getByRole('region', { name: 'Explore one word', exact: true });
  const canvas = study.locator('.arabic-guided-canvas');
  await sentence(canvas, 'هَذَا', 'hādhā', 'This');
  return { state, study, canvas, navigation };
}

async function open(page, width, installed = false) {
  const { state, navigation } = await openWordStudy(page, width, installed);
  await navigation.getByRole('button', { name: 'A sentence', exact: true }).click();
  const builder = page.locator('#arabic-workspace > .arabic-builder');
  const explorer = builder.getByRole('region', { name: 'Sentence structure', exact: true });
  const result = explorer.locator(':scope > .arabic-result');
  await sentence(result, 'هَذَا بَيْتِي', 'hādhā baytī', 'This is my house');
  return { builder, explorer, result, state };
}

async function sentence(result, arabic, latin, english) {
  await expect(result.locator('.arabic-glyphs > .sr-only')).toHaveText(arabic);
  await expect(result.locator('.arabic-pronunciation')).toHaveText(latin);
  await expect(result.locator('.arabic-translation')).toHaveText(english);
  await expect(result.locator('[data-renderer-fallback]')).toHaveCount(0);
}

async function fits(page) {
  const size = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.width + 1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function selectNode(explorer, id) {
  const control = explorer.locator(`button[data-structure-node="${id}"]`);
  await control.focus();
  await control.press('Enter');
  return control;
}

async function family(choices, name) {
  await choices
    .getByRole('group', { name: 'Beginning families', exact: true })
    .getByRole('button', { name, exact: true })
    .click();
}

async function contains(explorer, expected) {
  await expect
    .poll(() =>
      explorer
        .locator('path[data-edge-kind="contains"]')
        .evaluateAll((paths) =>
          paths.map((path) => `${path.dataset.from}>${path.dataset.to}`).sort(),
        ),
    )
    .toEqual([...expected].sort());
}

async function outlinesPart(result, part) {
  const layer = result.locator('.arabic-connection-layer');
  await expect(layer).toHaveAttribute('data-connection-part', part);
  // Selecting the meaning of a whole ending must outline all of that ending,
  // unlike a direct vowel tap, which has its own source-index test.
  await expect(layer).not.toHaveAttribute('data-connection-source-index', /\d/);
  await expect
    .poll(
      () =>
        result.evaluate((element, part) => {
          const ring = element.querySelector(`.arabic-connection-ring[data-part="${part}"]`);
          const ink = [
            ...element.querySelectorAll(`.arabic-script .arabic-glyph-ink[data-part="${part}"]`),
          ];
          if (!ring || !ink.length) return false;
          const bounds = ring.getBoundingClientRect();
          return ink.every((glyph) => {
            const box = glyph.getBoundingClientRect();
            return (
              bounds.left <= box.left &&
              bounds.top <= box.top &&
              bounds.right >= box.right &&
              bounds.bottom >= box.bottom
            );
          });
        }, part),
      { message: 'The selected whole ending must be enclosed around its actual Arabic ink' },
    )
    .toBe(true);
  expect(await layer.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
}

async function sourceCrops(explorer) {
  await expect(explorer.locator('.arabic-structure-part-fallback')).toHaveCount(0);
  const crops = await explorer.evaluate((element) => {
    const original = element.querySelector('.arabic-result .arabic-script');
    const paths = (group) =>
      [...group.querySelectorAll('path')].map((path) => ({
        d: path.getAttribute('d'),
        transform: path.getAttribute('transform'),
        fill: getComputedStyle(path).fill,
      }));
    return [...element.querySelectorAll('.arabic-structure-part-ink')].map((crop) => {
      const start = Number(crop.dataset.sourceStart);
      const end = Number(crop.dataset.sourceEnd);
      const groups = [...crop.querySelectorAll('.arabic-structure-crop-ink')];
      return {
        source: original.querySelector('.arabic-glyphs > .sr-only').textContent.slice(start, end),
        start,
        end,
        count: groups.length,
        matches: groups.every((group) => {
          const index = Number(group.dataset.sourceIndex);
          const source = original.querySelector(`.arabic-glyph-ink[data-source-index="${index}"]`);
          return (
            index >= start &&
            index < end &&
            source &&
            JSON.stringify(paths(group)) === JSON.stringify(paths(source))
          );
        }),
      };
    });
  });
  expect(crops.length).toBeGreaterThan(0);
  for (const crop of crops) {
    expect(crop.end).toBeGreaterThan(crop.start);
    expect(crop.source.length).toBeGreaterThan(0);
    expect(crop.count).toBeGreaterThan(0);
    expect(
      crop.matches,
      'A part must reuse the original joined word’s glyph paths and source indices',
    ).toBe(true);
  }
}

async function meaningfulCurves(explorer) {
  await expect
    .poll(
      () =>
        explorer.evaluate((element) => {
          const nodes = [...element.querySelectorAll('[data-structure-node]')];
          const paths = [...element.querySelectorAll('path[data-edge-kind="contains"]')];
          if (!paths.length) return false;
          return paths.every((path) => {
            const from = nodes.find((node) => node.dataset.structureNode === path.dataset.from);
            const to = nodes.find((node) => node.dataset.structureNode === path.dataset.to);
            const length = path.getTotalLength();
            const matrix = path.getScreenCTM();
            if (!from || !to || !matrix || length <= 0 || !/[CQ]/.test(path.getAttribute('d')))
              return false;
            const a = path.getPointAtLength(0).matrixTransform(matrix);
            const b = path.getPointAtLength(length).matrixTransform(matrix);
            const fromBox = from.getBoundingClientRect();
            const toBox = to.getBoundingClientRect();
            if (
              Math.abs(a.x - (fromBox.left + fromBox.width / 2)) > 2 ||
              Math.abs(a.y - fromBox.bottom) > 2
            )
              return false;
            if (Math.abs(b.x - (toBox.left + toBox.width / 2)) > 2 || Math.abs(b.y - toBox.top) > 2)
              return false;
            const unrelated = nodes
              .filter((node) => node !== from && node !== to)
              .map((node) => node.getBoundingClientRect());
            for (let sample = 1; sample < 40; sample += 1) {
              const point = path.getPointAtLength((length * sample) / 40).matrixTransform(matrix);
              if (
                unrelated.some(
                  (box) =>
                    point.x > box.left + 2 &&
                    point.x < box.right - 2 &&
                    point.y > box.top + 2 &&
                    point.y < box.bottom - 2,
                )
              )
                return false;
            }
            const style = getComputedStyle(path);
            return (
              style.pointerEvents === 'none' &&
              style.strokeDasharray === 'none' &&
              !path.getAttribute('marker-end')
            );
          });
        }),
      {
        message:
          'Each structural curve must meet its real parent and child without crossing a different card',
      },
    )
    .toBe(true);
}

for (const width of [390, 320]) {
  test(`guided word search finds friends and Friday and carries my friend into a sentence at ${width}px`, async ({
    page,
  }, info) => {
    const { state, study, canvas, navigation } = await openWordStudy(page, width);
    await study
      .getByRole('group', { name: 'Word types', exact: true })
      .getByRole('button', { name: 'Things', exact: true })
      .click();
    await sentence(canvas, 'بَيْتٌ', 'baytun', 'A house');
    const wordPicker = study.locator('button.arabic-guided-picker').filter({ hasText: 'Word' });
    await expect(wordPicker).toHaveAccessibleName('Word: House');
    await wordPicker.focus();
    await wordPicker.press('Enter');
    const words = study.getByRole('region', { name: 'Choose a thing', exact: true });
    const search = words.getByRole('searchbox', { name: 'Find an Arabic word', exact: true });
    await expect(search).toBeFocused();
    await search.fill('Fri');
    const options = words.getByRole('group', { name: 'Vocabulary choices', exact: true });
    await expect(options.getByRole('button', { name: /^Friend\s/ })).toBeVisible();
    await expect(options.getByRole('button', { name: /^Female friend\s/ })).toBeVisible();
    await expect(options.getByRole('button', { name: /^Friday\s/ })).toBeVisible();
    const layout = await words.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const hero = element
        .closest('.arabic-guided-study')
        .querySelector('.arabic-guided-canvas')
        .getBoundingClientRect();
      return {
        position: getComputedStyle(element).position,
        aboveWord: bounds.bottom <= hero.top + 1,
        height: bounds.height,
        viewportHeight: innerHeight,
      };
    });
    expect(['fixed', 'absolute']).not.toContain(layout.position);
    expect(layout.aboveWord, 'Vocabulary choices stay beside their controls, above the word').toBe(
      true,
    );
    expect(layout.height).toBeLessThan(layout.viewportHeight * 0.7);
    await fits(page);
    await search.fill('friend');
    await expect(options.getByRole('button', { name: /^Friday\s/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(words).toHaveCount(0);
    await expect(wordPicker).toBeFocused();
    await expect(wordPicker).toHaveAttribute('aria-expanded', 'false');
    await sentence(canvas, 'بَيْتٌ', 'baytun', 'A house');

    await wordPicker.click();
    await search.fill('Friday');
    await options.getByRole('button', { name: /^Friday\s/ }).click();
    await sentence(canvas, 'جُمُعَةٌ', 'jumuʿatun', 'A Friday');
    await expect(words).toHaveCount(0);
    await expect(wordPicker).toHaveAccessibleName('Word: Friday');
    await expect(wordPicker).toBeFocused();
    await wordPicker.click();
    // The search accepts ordinary unvocalised Arabic as well as English.
    await search.fill('صديق');
    await options.getByRole('button', { name: /^Friend\s/ }).click();
    await sentence(canvas, 'صَدِيقٌ', 'ṣadīqun', 'A friend');
    const ownerPicker = study.getByRole('button', { name: /^Whose\?:/ });
    await ownerPicker.click();
    const owners = study.getByRole('region', { name: 'Whose?', exact: true });
    await owners.getByRole('button', { name: /^My\s/ }).click();
    await expect(owners).toHaveCount(0);
    await expect(ownerPicker).toBeFocused();
    await sentence(canvas, 'صَدِيقِي', 'ṣadīqī', 'My friend');
    await expect(canvas.locator('.arabic-glyph-ink[data-part="case"]')).toHaveCount(0);
    await fits(page);

    await study.getByRole('button', { name: 'Use in a sentence', exact: true }).click();
    await expect(
      navigation.getByRole('button', { name: 'A sentence', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    const explorer = page
      .locator('#arabic-workspace > .arabic-builder')
      .getByRole('region', { name: 'Sentence structure', exact: true });
    await sentence(
      explorer.locator(':scope > .arabic-result'),
      'هَذَا صَدِيقِي',
      'hādhā ṣadīqī',
      'This is my friend',
    );
    await expect(explorer.locator('[data-structure-node="part:case"]')).toHaveCount(0);
    await expect(explorer.locator('[data-structure-node="part:owner"]')).toHaveCount(1);
    await sourceCrops(explorer);
    await fits(page);
    await navigation.getByRole('button', { name: 'A word', exact: true }).click();
    await sentence(canvas, 'صَدِيقِي', 'ṣadīqī', 'My friend');
    expect(state.errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('guided-friend-word.png'), fullPage: true });
  });

  test(`quick tables retain exact examples, Escape focus and the grammar guide at ${width}px`, async ({
    page,
  }) => {
    const { state, study, canvas } = await openWordStudy(page, width);
    const opener = page.getByRole('button', { name: 'Open quick tables', exact: true });
    await opener.focus();
    await opener.press('Enter');
    const tables = page.getByRole('region', { name: 'Quick tables', exact: true });
    await expect(tables).toBeVisible();
    await expect(tables).toBeFocused();
    await expect(opener).toHaveAttribute('aria-expanded', 'true');
    await expect(
      tables.getByRole('heading', { name: 'Small marks and long sounds', exact: true }),
    ).toBeVisible();
    await expect(tables.getByRole('columnheader')).toHaveText([
      'Sound',
      'How it is written',
      'Example',
    ]);
    expect(await tables.evaluate((element) => getComputedStyle(element).position)).not.toBe(
      'fixed',
    );
    await fits(page);
    const topics = tables.getByRole('group', { name: 'Reference tables', exact: true });
    await topics.getByRole('button', { name: 'Endings', exact: true }).click();
    await expect(
      tables.getByRole('heading', { name: 'Whose ending is it?', exact: true }),
    ).toBeVisible();
    await expect(tables.getByRole('table').locator('tbody .arabic-glyphs > .sr-only')).toHaveText([
      'بَيْتِي',
      'بَيْتُكَ',
      'بَيْتُكِ',
      'بَيْتُهُ',
      'بَيْتُهَا',
      'بَيْتُنَا',
    ]);
    await topics.getByRole('button', { name: 'This / that', exact: true }).click();
    await expect(tables.getByRole('table').locator('tbody .arabic-glyphs > .sr-only')).toHaveText([
      'هَذَا',
      'هَذِهِ',
      'ذَلِكَ',
      'تِلْكَ',
    ]);
    await expect(tables.getByRole('columnheader')).toHaveText([
      'Where?',
      'Masculine word',
      'Feminine word',
    ]);
    await topics.getByRole('button', { name: 'Past / present', exact: true }).click();
    const writeRow = tables.getByRole('row').filter({ hasText: 'I · write' });
    await expect(writeRow.locator('.arabic-glyphs > .sr-only')).toHaveText([
      'أَكْتُبُ',
      'كَتَبْتُ',
    ]);
    await expect(tables.locator('[data-renderer-fallback]')).toHaveCount(0);
    await fits(page);
    await page.keyboard.press('Escape');
    await expect(tables).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(opener).toHaveAttribute('aria-expanded', 'false');
    await sentence(canvas, 'هَذَا', 'hādhā', 'This');

    const pointingTable = study.getByRole('button', { name: 'Open pointing table', exact: true });
    await pointingTable.click();
    await expect(
      tables.getByRole('heading', { name: 'Point to one thing', exact: true }),
    ).toBeVisible();
    await expect(topics.getByRole('button', { name: 'This / that', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await tables.getByRole('button', { name: 'Close quick tables', exact: true }).click();
    await expect(tables).toHaveCount(0);
    await expect(pointingTable).toBeFocused();

    await opener.click();
    await tables.getByRole('button', { name: 'Explore the grammar guide', exact: true }).click();
    const guide = page.getByRole('region', { name: 'See how the pieces connect', exact: true });
    await expect(guide).toBeVisible();
    await expect(
      guide.getByRole('navigation', { name: 'Arabic learning topics', exact: true }),
    ).toBeVisible();
    await expect(tables).toHaveCount(0);
    await fits(page);
    await page.getByRole('button', { name: 'Close grammar guide', exact: true }).click();
    await expect(guide).toHaveCount(0);
    await sentence(canvas, 'هَذَا', 'hādhā', 'This');
    expect(state.errors).toEqual([]);
  });

  test(`selected endings link to their Arabic ink and preserve exact before/after changes at ${width}px`, async ({
    page,
  }, info) => {
    const { builder, explorer, result, state } = await open(page, width);
    await selectNode(explorer, 'part:owner');
    await outlinesPart(result, 'owner');
    await builder
      .getByRole('region', { name: 'Whose?', exact: true })
      .getByRole('button', { name: /^His\b/ })
      .click();
    await sentence(result, 'هَذَا بَيْتُهُ', 'hādhā baytuhu', 'This is his house');
    await selectNode(explorer, 'word:context:0');
    const beginnings = builder.getByRole('region', { name: 'Choose a beginning', exact: true });
    await family(beginnings, 'Location');
    await beginnings.getByRole('button', { name: /^In\b/ }).click();
    await sentence(result, 'فِي بَيْتِهِ', 'fī baytihi', 'In his house');

    await builder.getByText('See last change', { exact: true }).click();
    const comparison = builder.getByRole('region', { name: 'See what changed', exact: true });
    await expect(comparison).toBeVisible();
    await expect(comparison.locator('.arabic-change-latin')).toHaveText([
      'hādhā baytuhu',
      'fī baytihi',
    ]);
    await expect(comparison.locator('.arabic-change-meaning')).toHaveText([
      'This is his house',
      'In his house',
    ]);
    await comparison.getByRole('button', { name: 'Replay this change', exact: true }).click();
    await sentence(result, 'فِي بَيْتِهِ', 'fī baytihi', 'In his house');
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
    await sentence(result, 'هَذَا بَيْتُهُ', 'hādhā baytuhu', 'This is his house');
    await fits(page);
    expect(state.errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('meaning-connections.png'), fullPage: true });
  });

  test(`one actual sentence hierarchy keeps local alternatives separate at ${width}px`, async ({
    page,
  }, info) => {
    const { builder, explorer, result, state } = await open(page, width);
    await expect(builder.getByRole('group', { name: 'Word view', exact: true })).toHaveCount(0);
    await expect(builder.getByRole('button', { name: /^Step \d/ })).toHaveCount(0);
    await expect(explorer.locator('[data-choice-for]')).toHaveCount(0);
    await expect(explorer.locator('[data-parts-for]')).toHaveCount(1);
    await expect(explorer.locator('[data-parts-for]')).toHaveAttribute(
      'data-parts-for',
      'word:noun',
    );
    await expect(explorer.locator('[data-kind="part"]')).toHaveCount(2);
    await expect(explorer.locator('[data-structure-node="word:context:0"] strong')).toHaveText(
      'This',
    );
    await expect(explorer.locator('[data-structure-node="word:noun"] strong')).toHaveText(
      'my house',
    );
    await expect(
      explorer.locator('[data-structure-node="part:stem"] .arabic-structure-node-latin'),
    ).toHaveText('bayt');
    await expect(
      explorer.locator('[data-structure-node="part:owner"] .arabic-structure-node-latin'),
    ).toHaveText('ī');
    await contains(explorer, [
      'sentence>word:context:0',
      'sentence>word:noun',
      'word:noun>part:stem',
      'word:noun>part:owner',
    ]);
    await meaningfulCurves(explorer);
    await sourceCrops(explorer);
    await expect(explorer.locator('path[data-edge-kind="causes"]')).toHaveCount(0);
    const boxes = await explorer.locator('button[data-structure-node]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.dataset.structureNode,
        x: node.getBoundingClientRect().x,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
      })),
    );
    expect(boxes.every((box) => box.width >= 44 && box.height >= 44)).toBe(true);
    expect(boxes.find((box) => box.id === 'word:context:0').x).toBeGreaterThan(
      boxes.find((box) => box.id === 'word:noun').x,
    );
    expect(boxes.find((box) => box.id === 'part:stem').x).toBeGreaterThan(
      boxes.find((box) => box.id === 'part:owner').x,
    );

    const owner = await selectNode(explorer, 'part:owner');
    const owners = explorer.getByRole('region', { name: 'Whose?', exact: true });
    await expect(owners).toBeVisible();
    await expect(explorer.locator('[data-choice-for]')).toHaveCount(1);
    await expect(explorer.locator('[data-choice-for]')).toHaveAttribute(
      'data-choice-for',
      'part:owner',
    );
    await expect(explorer.locator('[data-choice-for] [data-structure-node]')).toHaveCount(0);
    await expect(explorer.locator('path[data-edge-kind="replaces"]')).toHaveAttribute(
      'data-from',
      'part:owner',
    );
    expect(
      await explorer
        .locator('path[data-edge-kind="replaces"]')
        .evaluate((path) => getComputedStyle(path).strokeDasharray),
    ).not.toBe('none');
    await expect(explorer.locator('path[data-edge-kind="replaces"]')).not.toHaveAttribute(
      'marker-end',
      /url/,
    );
    const locality = await owners.evaluate((tray) => {
      const root = tray.closest('.arabic-structure-explorer');
      const source = root
        .querySelector('[data-structure-node="part:owner"]')
        .getBoundingClientRect();
      const target = tray.getBoundingClientRect();
      return {
        gap: target.top - source.bottom,
        height: target.height,
        viewportHeight: innerHeight,
      };
    });
    expect(locality.gap).toBeGreaterThanOrEqual(0);
    expect(
      locality.gap,
      'Ownership options should sit directly below the selected parts',
    ).toBeLessThan(80);
    expect(locality.height).toBeLessThan(locality.viewportHeight * 0.7);
    await page.keyboard.press('Escape');
    await expect(owners).toHaveCount(0);
    await expect(owner).toBeFocused();
    await expect(owner).toHaveAttribute('aria-expanded', 'false');

    await selectNode(explorer, 'word:context:0');
    const beginnings = explorer.getByRole('region', { name: 'Choose a beginning', exact: true });
    await expect(explorer.locator('[data-parts-for]')).toHaveCount(0);
    await expect(explorer.locator('[data-choice-for]')).toHaveAttribute(
      'data-choice-for',
      'word:context:0',
    );
    await expect(beginnings.locator('.arabic-family-options button')).toHaveCount(2);
    await expect(beginnings.getByRole('button', { name: /^This is\b/ })).toBeVisible();
    await expect(beginnings.getByRole('button', { name: /^That is\b/ })).toBeVisible();
    await expect(beginnings.getByRole('button', { name: /^I saw\b/ })).toHaveCount(0);
    await family(beginnings, 'Actions');
    await sentence(result, 'هَذَا بَيْتِي', 'hādhā baytī', 'This is my house');
    const incompatible = beginnings.getByRole('button', { name: /^I opened\b/ });
    await expect(incompatible).toBeDisabled();
    await expect(incompatible).toContainText(
      'Choose door, book, letter for this checked action example.',
    );
    await family(beginnings, 'Location');
    await sentence(result, 'هَذَا بَيْتِي', 'hādhā baytī', 'This is my house');
    await expect(beginnings.locator('.arabic-family-options button')).toHaveCount(3);
    await expect(beginnings.getByRole('button', { name: /^I saw\b/ })).toHaveCount(0);
    await family(beginnings, 'Pointing');
    await beginnings.getByRole('button', { name: /^That is\b/ }).click();
    await sentence(result, 'ذَلِكَ بَيْتِي', 'dhālika baytī', 'That is my house');
    await expect(explorer.locator('path[data-edge-kind="causes"]')).toHaveCount(0);
    await fits(page);
    expect(state.errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('sentence-hierarchy.png'), fullPage: true });
  });

  test(`rule arrows explain fi to i and hu to hi only when requested at ${width}px`, async ({
    page,
  }, info) => {
    const { builder, explorer, result, state } = await open(page, width);
    await selectNode(explorer, 'part:owner');
    await builder
      .getByRole('region', { name: 'Whose?', exact: true })
      .getByRole('button', { name: /^His\b/ })
      .click();
    await selectNode(explorer, 'word:context:0');
    const beginnings = builder.getByRole('region', { name: 'Choose a beginning', exact: true });
    await family(beginnings, 'Location');
    await beginnings.getByRole('button', { name: /^In\b/ }).click();
    await sentence(result, 'فِي بَيْتِهِ', 'fī baytihi', 'In his house');
    await selectNode(explorer, 'word:noun');
    await expect(explorer.locator('[data-parts-for]')).toHaveCount(1);
    await contains(explorer, [
      'sentence>word:context:0',
      'sentence>word:noun',
      'word:noun>part:stem',
      'word:noun>part:case',
      'word:noun>part:owner',
    ]);
    await sourceCrops(explorer);
    await expect(explorer.locator('path[data-edge-kind="causes"]')).toHaveCount(0);
    await explorer.getByText('Why this form?', { exact: true }).click();
    const cause = explorer.locator('path[data-edge-kind="causes"]');
    await expect(cause).toHaveCount(1);
    await expect(cause).toHaveAttribute('data-from', 'word:context:0');
    await expect(cause).toHaveAttribute('data-to', 'part:case');
    await expect(cause).toHaveAttribute('marker-end', /url\(.+\)/);
    await expect(explorer.locator('[data-rule-explanation="noun-role"]')).toContainText('After fī');
    await explorer
      .getByRole('group', { name: 'Choose a relationship to explain', exact: true })
      .getByRole('button', { name: 'hu → hi', exact: true })
      .click();
    await expect(cause).toHaveCount(1);
    await expect(cause).toHaveAttribute('data-from', 'part:case');
    await expect(cause).toHaveAttribute('data-to', 'part:owner');
    await expect(explorer.locator('[data-rule-explanation="owner-sound"]')).toContainText(
      'the owner has not changed',
    );
    await sentence(result, 'فِي بَيْتِهِ', 'fī baytihi', 'In his house');
    await explorer.getByText('Why this form?', { exact: true }).click();
    await expect(cause).toHaveCount(0);
    await fits(page);
    expect(state.errors).toEqual([]);
    await page.screenshot({
      path: info.outputPath('requested-rule-relationship.png'),
      fullPage: true,
    });
  });
}

test('guided action study keeps six common people and carries present or past into sentence mode', async ({
  page,
}) => {
  const { state, study, canvas, navigation } = await openWordStudy(page, 320);
  await study
    .getByRole('group', { name: 'Word types', exact: true })
    .getByRole('button', { name: 'Actions', exact: true })
    .click();
  await sentence(canvas, 'أَكْتُبُ', 'aktubu', 'I write');
  const when = study.getByRole('group', { name: 'When the action happens', exact: true });
  await expect(when.getByRole('button')).toHaveCount(2);
  await when.getByRole('button', { name: 'Past', exact: true }).click();
  await sentence(canvas, 'كَتَبْتُ', 'katabtu', 'I wrote');
  const who = study.getByRole('button', { name: /^Who\?:/ });
  await who.click();
  const people = study.getByRole('region', { name: 'Who?', exact: true });
  const choices = people.getByRole('group', { name: 'Person choices', exact: true });
  await expect(choices.getByRole('button')).toHaveCount(6);
  await expect(choices.getByRole('button', { name: /^You · two people/ })).toHaveCount(0);
  await choices.getByRole('button', { name: /^We\s/ }).click();
  await expect(people).toHaveCount(0);
  await expect(who).toBeFocused();
  await sentence(canvas, 'كَتَبْنَا', 'katabnā', 'We wrote');
  await when.getByRole('button', { name: 'Now / usually', exact: true }).click();
  await sentence(canvas, 'نَكْتُبُ', 'naktubu', 'We write');
  await who.click();
  await choices.getByRole('button', { name: /^You · one woman/ }).click();
  await sentence(canvas, 'تَكْتُبِينَ', 'taktubīna', 'You write');
  await expect(
    canvas.locator('.arabic-glyph-ink[data-part="ending"][data-mark="kasra"]'),
  ).toHaveCount(1);
  await fits(page);

  await study.getByRole('button', { name: 'Use in a sentence', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'A sentence', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(
    page
      .getByRole('group', { name: 'Build a thing or an action', exact: true })
      .getByRole('button', { name: 'Say an action', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  const result = page.locator(
    '#arabic-workspace > .arabic-builder .arabic-structure-explorer > .arabic-result',
  );
  await sentence(result, 'تَكْتُبِينَ', 'taktubīna', 'You write');
  await fits(page);
  expect(state.errors).toEqual([]);
});

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

test('my stays one real ending in different phrases and joins the two-item ending once', async ({
  page,
}) => {
  const { builder, explorer, result, state } = await open(page, 320);
  const noInventedCase = async () => {
    await expect(result.locator('.arabic-script .arabic-glyph-ink[data-part="case"]')).toHaveCount(
      0,
    );
    await expect(
      result.locator('.arabic-connection-layer[data-connection-part="case"]'),
    ).toHaveCount(0);
    await expect(explorer.locator('.arabic-structure-mark-note')).toHaveCount(0);
  };
  await noInventedCase();
  await selectNode(explorer, 'word:context:0');
  const beginnings = builder.getByRole('region', { name: 'Choose a beginning', exact: true });
  await family(beginnings, 'Actions');
  await beginnings.getByRole('button', { name: /^I saw\b/ }).click();
  await sentence(result, 'رَأَيْتُ بَيْتِي', 'raʾaytu baytī', 'I saw my house');
  await noInventedCase();
  await selectNode(explorer, 'part:context:ending');
  await expect(explorer.locator('[data-choice-for]')).toHaveCount(0);
  await expect(explorer.getByRole('note')).toContainText(
    'The whole -tu ending tells us “I did it”',
  );
  await outlinesPart(result, 'context:ending');
  await contains(explorer, [
    'sentence>word:context:0',
    'sentence>word:noun',
    'word:context:0>part:context:stem',
    'word:context:0>part:context:ending',
  ]);
  await expect(explorer.locator('[data-parts-for]')).toHaveCount(1);
  await sourceCrops(explorer);
  await selectNode(explorer, 'part:context:stem');
  await family(beginnings, 'Location');
  await beginnings.getByRole('button', { name: /^In\b/ }).click();
  await sentence(result, 'فِي بَيْتِي', 'fī baytī', 'In my house');
  await noInventedCase();
  await family(beginnings, 'Pointing');
  await beginnings.getByRole('button', { name: /^This is\b/ }).click();
  await sentence(result, 'هَذَا بَيْتِي', 'hādhā baytī', 'This is my house');
  await selectNode(explorer, 'word:noun');
  await explorer.getByRole('button', { name: 'How many?', exact: true }).click();
  const numbers = explorer.getByRole('region', { name: 'How many?', exact: true });
  await numbers.getByRole('button', { name: /^Two\b/ }).click();
  await sentence(result, 'هَذَانِ بَيْتَايَ', 'hādhāni baytāya', 'These are my two houses');
  await expect(explorer.locator('[data-structure-node="part:number"]')).toHaveCount(0);
  await expect(explorer.locator('[data-structure-node="part:case"]')).toHaveCount(0);
  await expect(explorer.locator('[data-structure-node="part:owner"]')).toHaveCount(1);
  await expect(
    explorer.locator('[data-structure-node="part:owner"] .arabic-structure-node-latin'),
  ).toHaveText('āya');
  await sourceCrops(explorer);
  await numbers.getByRole('button', { name: 'Close choices', exact: true }).click();
  await explorer.getByRole('button', { name: 'How many?', exact: true }).click();
  await expect(numbers.getByRole('button', { name: /^Two\b/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(explorer.getByRole('region', { name: 'Whose?', exact: true })).toHaveCount(0);
  await selectNode(explorer, 'part:owner');
  await expect(explorer.getByRole('region', { name: 'Whose?', exact: true })).toBeVisible();
  await expect(numbers).toHaveCount(0);
  await selectNode(explorer, 'word:context:0');
  await family(beginnings, 'Location');
  await beginnings.getByRole('button', { name: /^In\b/ }).click();
  await sentence(result, 'فِي بَيْتَيَّ', 'fī baytayya', 'In my two houses');
  await selectNode(explorer, 'word:noun');
  await expect(
    explorer.locator('[data-structure-node="part:owner"] .arabic-structure-node-latin'),
  ).toHaveText('ayya');
  await expect(explorer.locator('[data-structure-node="part:number"]')).toHaveCount(0);
  await expect(explorer.locator('[data-structure-node="part:case"]')).toHaveCount(0);
  await sourceCrops(explorer);
  await fits(page);
  expect(state.errors).toEqual([]);
});

test('removed beginnings and owners remain reachable without fake structural parts at 320px', async ({
  page,
}) => {
  const { builder, explorer, result, state } = await open(page, 320);
  await selectNode(explorer, 'word:context:0');
  let beginnings = builder.getByRole('region', { name: 'Choose a beginning', exact: true });
  await beginnings.getByRole('button', { name: 'Just the word', exact: true }).click();
  await sentence(result, 'بَيْتِي', 'baytī', 'My house');
  await beginnings.getByRole('button', { name: 'Close choices', exact: true }).click();
  await expect(explorer.locator('[data-structure-node="word:context:0"]')).toHaveCount(0);
  await explorer.getByRole('button', { name: 'Add a beginning', exact: true }).click();
  beginnings = builder.getByRole('region', { name: 'Choose a beginning', exact: true });
  await beginnings.getByRole('button', { name: /^This is\b/ }).click();
  await sentence(result, 'هَذَا بَيْتِي', 'hādhā baytī', 'This is my house');
  await expect(explorer.locator('[data-choice-for]')).toHaveAttribute(
    'data-choice-for',
    'word:context:0',
  );
  await expect(explorer.locator('path[data-edge-kind="replaces"]')).toHaveAttribute(
    'data-from',
    'word:context:0',
  );
  await beginnings.getByRole('button', { name: 'Close choices', exact: true }).click();
  await selectNode(explorer, 'part:owner');
  const owners = builder.getByRole('region', { name: 'Whose?', exact: true });
  await owners.getByRole('button', { name: 'More people & no owner', exact: true }).click();
  await owners.getByRole('button', { name: /^No owner\b/ }).click();
  await sentence(result, 'هَذَا بَيْتٌ', 'hādhā baytun', 'This is a house');
  await owners.getByRole('button', { name: 'Close choices', exact: true }).click();
  await expect(explorer.locator('[data-structure-node="part:owner"]')).toHaveCount(0);
  await explorer.getByRole('button', { name: 'Whose?', exact: true }).click();
  await owners.getByRole('button', { name: /^My\b/ }).click();
  await sentence(result, 'هَذَا بَيْتِي', 'hādhā baytī', 'This is my house');
  await expect(explorer.locator('[data-structure-node="part:owner"]')).toHaveCount(1);
  await expect(explorer.locator('[data-choice-for]')).toHaveCount(1);
  await expect(explorer.locator('[data-choice-for]')).toHaveAttribute(
    'data-choice-for',
    'part:owner',
  );
  await expect(explorer.locator('path[data-edge-kind="replaces"]')).toHaveAttribute(
    'data-from',
    'part:owner',
  );
  await outlinesPart(result, 'owner');
  await fits(page);
  expect(state.errors).toEqual([]);
});
