import { test, expect } from '@playwright/test';
import { sitewideFixture } from './helpers/sitewideFixture.mjs';

// Keep the direct glyph-tap checks valid even under a non-phone CI project.
test.use({ hasTouch: true });

async function openPlayground(page, width) {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const state = await sitewideFixture(page);
  await page.addInitScript(() => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    localStorage.removeItem('jic.arabic.builder.v1');
    localStorage.setItem('jic-theme', 'light');
  });
  await page.goto('/learning/arabic');
  await expect(page.getByRole('heading', { level: 1, name: /Learn Arabic/ })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Arabic learning tools' })
      .getByRole('button', { name: 'Words', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  // Words is the workspace's direct builder child. SentenceBuilder also stays
  // mounted inside a hidden tab wrapper, so an unscoped builder is ambiguous.
  const builder = page.locator('#arabic-workspace > .arabic-builder');
  await expect(builder).toHaveCount(1);
  await expect(builder).toBeVisible();
  const result = builder.locator(':scope > .arabic-result');
  await expect(result.locator('.arabic-translation')).toHaveText('This is our house');
  return { state, builder, result };
}

async function expectSentence(result, arabic, latin, english) {
  // The accessible original and the visible pronunciation/meaning must agree.
  // Do not import the grammar engine here: these are independent learner examples.
  await expect(result.locator('.arabic-glyphs > .sr-only')).toHaveText(arabic);
  await expect(result.locator('.arabic-pronunciation')).toHaveText(latin);
  await expect(result.locator('.arabic-translation')).toHaveText(english);
  await expect(result.locator('[data-renderer-fallback]')).toHaveCount(0);
}

async function expectPhoneFit(page) {
  const size = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(size.content, 'The phone page should not need sideways scrolling').toBeLessThanOrEqual(
    size.viewport + 1,
  );
}

async function expectInlineChoices(page, builder, title) {
  const choices = builder.getByRole('region', { name: title, exact: true });
  await expect(choices).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  const layout = await choices.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const result = element.closest('.arabic-builder').querySelector('.arabic-result');
    const resultBounds = result.getBoundingClientRect();
    return {
      position: getComputedStyle(element).position,
      left: bounds.left,
      right: bounds.right,
      height: bounds.height,
      belowResult: bounds.top >= resultBounds.bottom - 1,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
  });
  expect(['fixed', 'absolute']).not.toContain(layout.position);
  expect(layout.belowResult, 'Choices should remain below the Arabic result in normal flow').toBe(
    true,
  );
  expect(layout.left).toBeGreaterThanOrEqual(-1);
  expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height, 'The choice tray should not fill the phone screen').toBeLessThan(
    layout.viewportHeight * 0.7,
  );
  await expectPhoneFit(page);
  return choices;
}

async function expectMarkConnection(result, part, mark) {
  const layer = result.locator('.arabic-connection-layer');
  const ink = result.locator(
    `.arabic-script .arabic-glyph-ink[data-part="${part}"][data-mark="${mark}"]`,
  );
  await expect(layer).toHaveAttribute('data-connection-part', part);
  await expect(layer).toHaveAttribute(
    'data-connection-source-index',
    await ink.getAttribute('data-source-index'),
  );
  await expect(result.locator('.arabic-vowel-focus .arabic-glyph-closeup')).toBeVisible();
  const markBox = await ink.boundingBox();
  const ringBox = await layer.locator('.arabic-connection-ring').boundingBox();
  expect(ringBox.x).toBeLessThan(markBox.x);
  expect(ringBox.y).toBeLessThan(markBox.y);
  expect(ringBox.x + ringBox.width).toBeGreaterThan(markBox.x + markBox.width);
  expect(ringBox.y + ringBox.height).toBeGreaterThan(markBox.y + markBox.height);
  expect(await layer.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
}

const markPath = (result, part, mark) =>
  result.locator(`.arabic-script [data-part="${part}"][data-mark="${mark}"] path`).first();

async function inkInfo(path) {
  await expect(path).toBeVisible();
  return path.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      fill: getComputedStyle(element).fill,
      outlineLength: element.getTotalLength(),
      width: bounds.width,
      height: bounds.height,
      centreY: bounds.top + bounds.height / 2,
    };
  });
}

async function tapVisibleInk(page, path) {
  await path.scrollIntoViewIfNeeded();
  // A mark can have a hole in its middle. Find a painted point rather than
  // dispatching a synthetic click or forcing a click through another control.
  const point = await path.evaluate((element) => {
    const box = element.getBBox();
    const matrix = element.getScreenCTM();
    for (let row = 1; row < 25; row += 1) {
      for (let column = 1; column < 25; column += 1) {
        const local = new DOMPoint(
          box.x + (box.width * column) / 25,
          box.y + (box.height * row) / 25,
        );
        if (!element.isPointInFill(local)) continue;
        const screen = local.matrixTransform(matrix);
        if (document.elementFromPoint(screen.x, screen.y) === element)
          return { x: screen.x, y: screen.y };
      }
    }
    return null;
  });
  expect(point, 'The coloured Arabic mark must have visible, directly tappable ink').not.toBeNull();
  await page.touchscreen.tap(point.x, point.y);
}

for (const width of [390, 320]) {
  test(`real Arabic vowels keep their own colours and open inline choices at ${width}px`, async ({
    page,
  }, info) => {
    const { state, builder, result } = await openPlayground(page, width);
    await expectSentence(result, 'هَذَا بَيْتُنَا', 'hādhā baytunā', 'This is our house');

    const stemTa = result.locator('.arabic-script [data-part="stem"][data-character="ت"]');
    const dammaPath = markPath(result, 'case', 'damma');
    const damma = await inkInfo(dammaPath);
    const stemFill = await stemTa
      .locator('path')
      .first()
      .evaluate((path) => getComputedStyle(path).fill);
    const taBounds = await stemTa.boundingBox();
    expect(damma.outlineLength).toBeGreaterThan(0);
    expect(damma.width).toBeGreaterThan(0);
    expect(damma.height).toBeGreaterThan(0);
    expect(damma.fill, 'The actual ḍamma must not inherit the blue of its joined letter').not.toBe(
      stemFill,
    );
    expect(damma.centreY).toBeLessThan(taBounds.y + taBounds.height / 2);
    expect(damma.fill).toBe(
      await result
        .locator('.arabic-pronunciation')
        .getByText('u', { exact: true })
        .evaluate((element) => getComputedStyle(element).color),
    );

    await tapVisibleInk(page, dammaPath);
    const choices = await expectInlineChoices(page, builder, 'Try a vowel');
    await expectMarkConnection(result, 'case', 'damma');
    await choices.getByRole('button', { name: /Fatḥa/ }).click();
    await expectSentence(result, 'رَأَيْتُ بَيْتَنَا', 'raʾaytu baytanā', 'I saw our house');
    const fatha = await inkInfo(markPath(result, 'case', 'fatha'));
    expect(fatha.fill).not.toBe(damma.fill);
    expect(fatha.fill).not.toBe(stemFill);
    expect(fatha.outlineLength).toBeGreaterThan(0);
    await expectMarkConnection(result, 'case', 'fatha');

    await choices.getByRole('button', { name: /Kasra/ }).click();
    await expectSentence(result, 'فِي بَيْتِنَا', 'fī baytinā', 'In our house');
    const kasra = await inkInfo(markPath(result, 'case', 'kasra'));
    const updatedTa = await stemTa.boundingBox();
    expect(kasra.fill).not.toBe(fatha.fill);
    expect(kasra.fill).not.toBe(damma.fill);
    expect(kasra.fill).not.toBe(stemFill);
    expect(kasra.centreY, 'Kasra should be below the letter it belongs to').toBeGreaterThan(
      updatedTa.y + updatedTa.height / 2,
    );
    await expect(choices.getByRole('button', { name: /Kasra/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expectInlineChoices(page, builder, 'Try a vowel');
    await expectMarkConnection(result, 'case', 'kasra');
    expect(state.errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('vowel-choices.png'), fullPage: true });
  });

  test(`his becomes hi after in, with owner choices, word search and Escape at ${width}px`, async ({
    page,
  }, info) => {
    const { state, builder, result } = await openPlayground(page, width);
    const owners = await expectInlineChoices(page, builder, 'Whose?');
    await owners.getByRole('button', { name: /^His\b/ }).click();
    await expectSentence(result, 'هَذَا بَيْتُهُ', 'hādhā baytuhu', 'This is his house');
    await expect(owners.getByRole('button', { name: /^Their · two people/ })).toHaveCount(0);
    await owners.getByRole('button', { name: 'More people & no owner', exact: true }).click();
    await expect(owners.getByRole('button', { name: /^Their · two people/ })).toBeVisible();
    await expectInlineChoices(page, builder, 'Whose?');
    await owners.getByRole('button', { name: 'Common choices', exact: true }).click();
    await expect(owners.getByRole('button', { name: /^His\b/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await builder.getByRole('button', { name: /^Change beginning:/ }).click();
    const beginnings = await expectInlineChoices(page, builder, 'Start with…');
    await beginnings.getByRole('button', { name: /^In…/ }).click();
    await expectSentence(result, 'فِي بَيْتِهِ', 'fī baytihi', 'In his house');
    await expect(
      builder.getByRole('button', { name: 'Change whose?: His', exact: true }),
    ).toBeVisible();
    const caseKasra = await inkInfo(markPath(result, 'case', 'kasra'));
    const ownerKasra = await inkInfo(markPath(result, 'owner', 'kasra'));
    expect(caseKasra.fill).toBe(ownerKasra.fill);
    await expect(markPath(result, 'case', 'damma')).toHaveCount(0);
    await expect(markPath(result, 'owner', 'damma')).toHaveCount(0);

    const wordPicker = builder.getByRole('button', { name: /^Change word:/ });
    await wordPicker.focus();
    await wordPicker.press('Enter');
    const words = await expectInlineChoices(page, builder, 'Choose a word');
    const search = words.getByRole('searchbox', { name: 'Find an Arabic word', exact: true });
    await search.fill('not-a-word');
    await expect(
      words.getByText('No match yet. Try “house”, “book” or “school”.', { exact: true }),
    ).toBeVisible();
    await search.fill('school');
    await words.getByRole('button', { name: /^School\b/ }).click();
    await expectSentence(result, 'فِي مَدْرَسَتِهِ', 'fī madrasatihi', 'In his school');
    await page.keyboard.press('Escape');
    await expect(words).toHaveCount(0);
    await expect(wordPicker).toBeFocused();
    await expect(wordPicker).toHaveAttribute('aria-expanded', 'false');
    await expect(wordPicker).toHaveAccessibleName('Change word: School');
    await expectSentence(result, 'فِي مَدْرَسَتِهِ', 'fī madrasatihi', 'In his school');
    await expectPhoneFit(page);
    expect(state.errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('his-house-to-school.png'), fullPage: true });
  });

  test(`sentence edits compare before and after without changing the other noun at ${width}px`, async ({
    page,
  }, info) => {
    const { state } = await openPlayground(page, width);
    await page
      .getByRole('navigation', { name: 'Arabic learning tools' })
      .getByRole('button', { name: 'Sentences', exact: true })
      .click();
    await expect(
      page
        .getByRole('navigation', { name: 'Arabic learning tools' })
        .getByRole('button', { name: 'Sentences', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    // The sentence studio is kept mounted between tabs. Select its active
    // workspace wrapper, then keep every result/comparison query inside it.
    const studio = page.locator('#arabic-workspace > :not([hidden]) > .arabic-sentence-studio');
    await expect(studio).toHaveCount(1);
    await expect(
      studio.getByRole('heading', { name: 'Make a sentence', exact: true }),
    ).toBeVisible();
    const builder = studio.locator(':scope > .arabic-builder');
    await expect(builder).toHaveCount(1);
    const result = builder.locator(':scope > .arabic-result');
    await expectSentence(
      result,
      'كِتَابُنَا فِي بَيْتِهِ',
      'kitābunā fī baytihi',
      'Our book is in his house.',
    );

    await result.getByRole('button', { name: 'Change place owner: His', exact: true }).click();
    const owners = await expectInlineChoices(page, builder, 'Whose place?');
    await owners.getByRole('button', { name: /^Her\b/ }).click();
    await expectSentence(
      result,
      'كِتَابُنَا فِي بَيْتِهَا',
      'kitābunā fī baytihā',
      'Our book is in her house.',
    );
    const comparison = studio.getByRole('region', { name: 'See what changed', exact: true });
    await expect(comparison).toBeVisible();
    await expect(comparison.locator('.arabic-change-latin')).toHaveText([
      'kitābunā fī baytihi',
      'kitābunā fī baytihā',
    ]);

    await tapVisibleInk(page, markPath(result, 'place:case', 'kasra'));
    const beginnings = await expectInlineChoices(page, builder, 'In, from or to?');
    await beginnings.getByRole('button', { name: /^From…/ }).click();
    await expectSentence(
      result,
      'كِتَابُنَا مِنْ بَيْتِهَا',
      'kitābunā min baytihā',
      'Our book is from her house.',
    );
    await expect(markPath(result, 'subject:case', 'damma')).toBeVisible();
    await expect(markPath(result, 'place:case', 'kasra')).toBeVisible();
    await expect(comparison.locator('.arabic-change-latin')).toHaveText([
      'kitābunā fī baytihā',
      'kitābunā min baytihā',
    ]);
    await expectPhoneFit(page);
    expect(state.errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('sentence-comparison.png'), fullPage: true });
  });
}
