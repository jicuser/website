import { test, expect } from '@playwright/test';

for (const width of [390, 1280]) {
  test(`content edges, section gaps and service cards stay balanced at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
    await page.route('**/preview-api/**', (route) =>
      route.fulfill({ contentType: 'application/json', body: '[]' }),
    );
    await page.goto('/');
    await expect(page.locator('.home-whats-on')).toBeVisible();
    const edges = await page
      .locator('.jic-hero-inner, .home-whats-on, .home-feature')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }),
      );
    expect(edges.length).toBe(3);
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
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(23);
      expect(gap).toBeLessThanOrEqual(25);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  });
}
