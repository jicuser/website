import { test, expect } from '@playwright/test';
import { CONTACT_FORM, CONTACT_RECEIPT } from './helpers/builtInForms.mjs';

const campaigns = ['masjid', 'community'].map((category, index) => ({
  id: `campaign-${index}`,
  slug: `appeal-${index}`,
  category,
  title: index ? 'Community kitchen' : 'Care for our masjid',
  organiser: 'JIC community',
  story: 'Help support the work of the centre.',
  raised_pence: 1000,
  target_pence: 10000,
  status: 'published',
}));

async function prepare(page, theme = 'dark') {
  const writes = [];
  await page.addInitScript((value) => {
    localStorage.setItem('jic-theme', value);
    sessionStorage.setItem('jic-salawat-shown', '1');
  }, theme);
  await page.route('**/preview-api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path.endsWith('/rpc/public_community_campaigns')) {
      const body = route.request().postDataJSON();
      data = body?.p_slug
        ? campaigns.filter((campaign) => campaign.slug === body.p_slug)
        : campaigns;
    } else if (path.endsWith('/rpc/get_public_form')) {
      data = CONTACT_FORM;
    } else if (path.endsWith('/functions/v1/custom-forms')) {
      writes.push(route.request().postDataJSON());
      data = { ok: true, id: CONTACT_RECEIPT };
    } else if (path.endsWith('/functions/v1/salah-reminders')) {
      if (route.request().method() === 'GET') data = { ready: true, publicKey: 'AQID' };
      else {
        const body = route.request().postDataJSON();
        writes.push(body);
        data = { active: true, preferences: body.preferences, updated_at: '2026-10-18T14:00:00Z' };
      }
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return writes;
}

for (const theme of ['dark', 'light']) {
  test(`donating and getting involved have separate, compact destinations in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await prepare(page, theme);
    await page.goto('/donate');
    await expect(page.getByRole('heading', { name: 'Donate to JIC', exact: true })).toBeVisible();
    await expect(page.locator('.ops-reasons, .ops-campaign-grid, .jic-programmes')).toHaveCount(0);
    await expect(page.locator('.jic-unified-subnav')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Volunteer or fundraise' })).toHaveAttribute(
      'href',
      '/get-involved',
    );
    await expect(page.getByRole('region', { name: 'JIC bank transfer details' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`donate-${theme}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Volunteer or fundraise' }).click();
    await expect(page.getByRole('heading', { name: 'Get involved', exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`get-involved-${theme}.png`),
      fullPage: true,
    });
    const ways = page.getByRole('navigation', { name: 'Ways to get involved' });
    await expect(ways.getByRole('link')).toHaveCount(3);
    await ways.getByRole('link', { name: /Community campaigns/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Community campaigns', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.ops-campaign-card')).toHaveCount(2);
    await page.getByRole('combobox', { name: 'Cause', exact: true }).selectOption('community');
    await expect(page.locator('.ops-campaign-card')).toHaveCount(1);
    await page
      .getByRole('heading', { name: 'Community kitchen', exact: true })
      .getByRole('link')
      .click();
    await expect(page).toHaveURL('/fundraise/appeal-1');
    await page.getByRole('link', { name: '← All fundraising' }).click();
    await expect(page).toHaveURL('/fundraise');
    const location = page.locator('.jic-section-picker > summary');
    await expect(location).toContainText('Get involved');
    await expect(location).toContainText('Campaigns');
    await expect(page.locator('.jic-section-location')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
  });
}

test('portal access is in the menu, Worship keeps reading links, and volunteering accepts an enquiry', async ({
  page,
}) => {
  const writes = await prepare(page);
  await page.goto('/');
  await expect(page.locator('.jic-unified-header a[href="/portal"]')).toHaveCount(0);
  const prayer = page.getByRole('complementary', { name: 'Daily prayer timetable' });
  await expect(prayer).toBeVisible();
  await expect(prayer.locator('.jic-prayer-browser-heading strong')).toHaveText('Today');
  await expect(prayer.getByRole('link', { name: 'Timetable', exact: true })).toBeVisible();
  await expect(prayer.getByRole('link', { name: 'Timetable', exact: true })).toHaveAttribute(
    'href',
    '/prayer-times',
  );
  await expect(page.locator('#jic-prayer-dock')).toHaveCount(0);
  await expect(prayer).toHaveCSS('position', 'static');
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Navigation menu', exact: true });
  await expect(menu.getByRole('link', { name: 'Portal login', exact: true })).toHaveAttribute(
    'href',
    '/portal',
  );
  await menu.getByRole('button', { name: 'Expand Community Hub subpages', exact: true }).click();
  await menu
    .getByRole('navigation', { name: 'All pages', exact: true })
    .getByRole('link', { name: 'Worship', exact: true })
    .click();
  await expect(page).toHaveURL('/worship');
  await expect(page.getByRole('heading', { name: 'Worship' })).toBeVisible();
  await expect(page.locator('.worship-compact-resources a[href="/worship/quran"]')).toBeVisible();
  await page.goto('/get-involved/volunteer#enquire');
  await expect(
    page.getByRole('heading', { name: 'Volunteer with JIC', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Show all questions', exact: true }).click();
  await page.getByLabel('Name', { exact: false }).fill('Example volunteer');
  await page.getByLabel('Email address', { exact: false }).fill('volunteer@example.test');
  await page
    .getByLabel('Your message', { exact: false })
    .fill('I can help at weekend community events.');
  await page.getByRole('button', { name: 'Review answers', exact: true }).click();
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you', exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].slug).toBe('contact-us');
  expect(writes[0].answers.question).toContain('Volunteering enquiry');
});

test('Salah alerts enable the default in one action and preserve custom settings', async ({
  page,
}, testInfo) => {
  const writes = await prepare(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 Android Chrome' });
    window.Notification = class {
      static permission = 'default';
      static async requestPermission() {
        this.permission = 'granted';
        return 'granted';
      }
    };
    window.PushManager = class {};
    let subscription = null;
    const worker = {
      active: { scriptURL: `${location.origin}/salah-reminders-sw.js` },
      pushManager: {
        getSubscription: async () => subscription,
        subscribe: async () => {
          subscription = {
            toJSON: () => ({
              endpoint: 'https://fcm.googleapis.com/fcm/send/test',
              keys: { p256dh: `B${'a'.repeat(86)}`, auth: 'b'.repeat(22) },
            }),
            unsubscribe: async () => true,
          };
          return subscription;
        },
      },
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: async () => worker,
        register: async () => worker,
        ready: Promise.resolve(worker),
      },
    });
  });
  await page.goto('/prayer-times/reminders');
  await expect(page.locator('.jic-daily-reminder, .jic-programmes')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Salah alerts', exact: true })).toBeVisible();
  await expect(page.locator('.salah-reminders__summary')).toContainText('All five prayers');
  await expect(page.locator('.salah-reminders__summary')).toContainText(
    '10 minutes before Jama’ah',
  );
  await expect(page.getByRole('switch', { name: 'Jama’ah time' })).toBeHidden();
  const enable = page.getByRole('button', { name: 'Enable Salah alerts', exact: true });
  await expect(enable).toBeEnabled();
  await expect(page.locator('#jic-prayer-dock')).toBeHidden();
  const buttonBox = await enable.boundingBox();
  expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(
    await page.evaluate(() => innerHeight),
  );
  // The quiet dock has no visible footprint. Check the actual tap target rather
  // than the hidden wrapper's reserved box.
  expect(
    await enable.evaluate((button) => {
      const box = button.getBoundingClientRect();
      return button.contains(
        document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
      );
    }),
  ).toBe(true);
  expect(writes).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('salah-alerts-default.png') });
  await enable.click();
  await expect(page.getByText('Salah alerts are on.', { exact: true })).toBeVisible();
  expect(writes[0].preferences).toEqual({
    start: false,
    jamaah: true,
    startMinutes: 10,
    jamaahMinutes: 10,
    prayers: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'],
  });
  await page.getByText('Customise alerts', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Minutes before Jama’ah time' }).fill('5');
  await page.getByRole('button', { name: 'Save alert settings', exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1].preferences.jamaahMinutes).toBe(5);
  expect(writes[1].expected).toBe('2026-10-18T14:00:00Z');
});

test('iPhone alerts show the Home Screen prerequisite without an unusable Enable button', async ({
  page,
}) => {
  const writes = await prepare(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 iPhone Safari' });
    Object.defineProperty(navigator, 'standalone', { value: false });
    window.__notificationPrompts = 0;
    window.Notification = class {
      static permission = 'default';
      static async requestPermission() {
        window.__notificationPrompts++;
        return 'granted';
      }
    };
  });
  await page.goto('/prayer-times/reminders');
  await expect(page.getByText('iPhone setup needed', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Add JIC to your Home Screen' })).toBeVisible();
  await expect(page.locator('.salah-reminders__setup')).toContainText('JIC Home Screen icon');
  await expect(page.getByRole('button', { name: 'Enable Salah alerts', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText('Customise alerts', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check this device again' })).toHaveCount(0);
  expect(await page.evaluate(() => window.__notificationPrompts)).toBe(0);
  expect(writes).toEqual([]);
});

test('certificates are found through the portal rather than offered as a service', async ({
  page,
}) => {
  await prepare(page);
  await page.goto('/services');
  await expect(page.locator('a[href="/services/certificates"]')).toHaveCount(0);
  await page.goto('/search');
  await page.getByRole('searchbox').fill('certificates');
  const results = page.locator('.jic-search-results');
  await expect(results.locator('a[href="/services/certificates"]')).toHaveCount(0);
  await results.getByRole('link', { name: /My certificates/ }).click();
  await expect(page).toHaveURL('/portal?next=%2Faccount%2Fcertificates');
  await expect(page.getByRole('heading', { name: 'Sign in to your Portal' })).toBeVisible();
});
