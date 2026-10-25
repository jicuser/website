import { test, expect } from '@playwright/test';

for (const width of [390, 1280]) {
  test(`content edges, section gaps and shortcut cards stay balanced at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
    await page.route('**/preview-api/**', (route) =>
      route.fulfill({ contentType: 'application/json', body: '[]' }),
    );
    await page.goto('/');
    await expect(page.locator('.jic-home-shortcuts a')).toHaveCount(6);
    await expect(page.locator('.community-programme-feed')).toBeVisible();
    const edges = await page
      .locator(
        '.jic-hero-inner, .community-programme-feed, .jic-home-community-links, .jic-home-footer-strip',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }),
      );
    expect(edges.length).toBe(4);
    expect(
      Math.max(...edges.map((edge) => edge.left)) - Math.min(...edges.map((edge) => edge.left)),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.max(...edges.map((edge) => edge.right)) - Math.min(...edges.map((edge) => edge.right)),
    ).toBeLessThanOrEqual(2);
    const gaps = await page.locator('.jic-home-content').evaluate((node) => {
      const sections = [...node.children].filter((item) => item.getBoundingClientRect().height > 0);
      return sections
        .slice(1)
        .map(
          (section, index) =>
            section.getBoundingClientRect().top - sections[index].getBoundingClientRect().bottom,
        );
    });
    expect(gaps).toHaveLength(2);
    const expectedGap = width < 768 ? 24 : 32;
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(expectedGap - 1);
      expect(gap).toBeLessThanOrEqual(expectedGap + 1);
    }
    if (width > 1000) {
      const cards = await page.locator('.jic-home-shortcuts a').evaluateAll((nodes) =>
        nodes.slice(0, 3).map((node) => ({
          height: node.getBoundingClientRect().height,
          title: node.querySelector('strong').getBoundingClientRect().bottom,
        })),
      );
      expect(
        Math.max(...cards.map((card) => card.height)) -
          Math.min(...cards.map((card) => card.height)),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.max(...cards.map((card) => card.title)) - Math.min(...cards.map((card) => card.title)),
      ).toBeLessThanOrEqual(1);
      await expect(page.locator('.programme-feed-row > div').first()).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  });
}
