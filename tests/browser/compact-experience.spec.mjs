import { test, expect } from '@playwright/test';
import { openTvAdmin } from './helpers/tvAdmin.mjs';

const timetable = (date) => ({
  d_date: date, fajr_begins: '05:31', fajr_jamah: '06:15', sunrise: '07:04',
  zuhr_begins: '11:56', zuhr_jamah: '13:00', asr_begins: '14:48', asr_jamah: '15:30',
  maghrib_begins: '16:41', maghrib_jamah: '16:41', isha_begins: '18:27', isha_jamah: '19:30',
  jummah_1_start: null, jummah_1_jamah: '12:35', jummah_2_begins: null, jummah_2_jamah: '13:30',
});
async function publicPage(page, { theme = 'dark', clock = '2026-11-01T15:00:00Z', campaigns = [], installed = false } = {}) {
  const requests = [];
  await page.clock.install({ time: new Date(clock) });
  await page.addInitScript(({theme, installed}) => {
    localStorage.setItem('jic-theme', theme);
    sessionStorage.setItem('jic-salawat-shown', '1');
    if (installed) Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
  }, { theme, installed });
  await page.route('**/*', route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.route('**/preview-api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path.endsWith('/prayer_times')) data = ['2026-11-01','2026-11-02','2026-11-06','2026-11-07'].map(timetable);
    if (path.endsWith('/page_content')) data = [{
      content_key: 'prayer_calendar:2026-11',
      content_value: JSON.stringify({year:1448, segments:[{from:'2026-11-01',to:'2026-11-10',day:21,month:'Jumada al-Awwal'}]}),
    }];
    if (path.endsWith('/rpc/public_community_campaigns')) { requests.push(path); data = campaigns; }
    return route.fulfill({ json: data });
  });
  return requests;
}
for (const width of [320,390]) for (const theme of ['light','dark']) {
  test(`compact experience prayer dates and current highlight fit ${width}px ${theme}`, async ({page}, testInfo) => {
    await page.setViewportSize({width,height:844});
    await publicPage(page,{theme});
    await page.goto('/');
    const card = page.locator('.jic-compact-prayer');
    await expect(card.locator('[aria-current="time"]')).toContainText('Asr');
    await expect(card).toContainText('21 Jumada al-Awwal 1448 AH');
    await expect(card.getByRole('button',{name:'Browse timetable dates'})).toHaveAttribute('aria-expanded','false');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
    const crowded = await card.locator('.jic-prayer-browser-item').evaluateAll(items => items.flatMap(item => {
      const parent = item.getBoundingClientRect();
      return [...item.querySelectorAll(':scope > strong, time')].filter(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        const rect = range.getBoundingClientRect();
        return rect.left < parent.left - 1 || rect.right > parent.right + 1;
      }).map(element => element.textContent);
    }));
    expect(crowded, 'Prayer labels and times stay inside their own column').toEqual([]);
    await page.screenshot({path:testInfo.outputPath(`compact-home-${width}-${theme}.png`),fullPage:false});
    await card.getByRole('button',{name:'Browse timetable dates'}).click();
    await card.getByRole('button',{name:/Mon,? 2 Nov/}).click();
    await expect(card.locator('[aria-current="time"]')).toHaveCount(0);
    await card.getByRole('button',{name:'Today',exact:true}).first().click();
    await expect(card.locator('[aria-current="time"]')).toContainText('Asr');
  });
}
test('compact experience Friday next congregation is Jummah', async ({page}) => {
  await publicPage(page,{clock:'2026-11-06T12:00:00Z'});
  await page.goto('/');
  await expect(page.locator('.jic-prayer-now')).toContainText('Jummah 1 · 12:35 PM');
});
test('compact experience installed home keeps direct community shortcuts', async ({page}, testInfo) => {
  await page.setViewportSize({width:390,height:844});
  await publicPage(page,{installed:true});
  await page.goto('/');
  const links = page.getByRole('navigation',{name:'JIC shortcuts'});
  await expect(links.getByRole('link',{name:'Community Hub'})).toHaveAttribute('href','/services');
  await expect(links.getByRole('link',{name:'Donate'})).toHaveAttribute('href','/donate');
  await page.screenshot({path:testInfo.outputPath('compact-installed-home.png'),fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
});
test('compact experience appeals expand lazily and separate verified past results', async ({page}, testInfo) => {
  const requests = await publicPage(page,{campaigns:[
    {id:'current',slug:'current-appeal',status:'published',title:'Current appeal',story:'A current appeal.',target_pence:100000,raised_pence:50000},
    {id:'past',slug:'past-appeal',status:'closed',title:'Past appeal',story:'Completed appeal.',target_pence:100000,raised_pence:100000,outcome:'Facilities completed.',completed_on:'2026-10-31'},
    {id:'draft',slug:'private-draft',status:'pending',title:'Private draft'},
  ]});
  await page.goto('/donate');
  const section = page.getByRole('region',{name:'JIC fundraising appeals'});
  await expect(section.getByRole('button',{name:'Current appeals & past achievements'})).toHaveAttribute('aria-expanded','false');
  // The existing donation page may load its own campaigns; this component adds no
  // extra request until the disclosure opens.
  const before = requests.length;
  await section.getByRole('button',{name:'Current appeals & past achievements'}).click();
  await expect(section.getByRole('heading',{name:'Current appeal',exact:true})).toBeVisible();
  expect(requests.length).toBeGreaterThan(before);
  await expect(section.getByText('Private draft',{exact:true})).toHaveCount(0);
  await section.getByRole('button',{name:'Past achievements',exact:true}).click();
  await expect(section.getByRole('button',{name:'Past achievements',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(section.getByText('Facilities completed.',{exact:true})).toBeVisible();
  await expect(section.getByRole('heading',{name:'Current appeal',exact:true})).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath('compact-past-appeal.png'),fullPage:false});
});
test('compact experience owner previews and saves a template without changing access', async ({page}, testInfo) => {
  await openTvAdmin(page);
  let saved;
  await page.route('**/rest/v1/dashboard_templates*',route=>route.fulfill({json:{layout:{order:['prayer','forms'],hidden:[],density:'compact'},version:1}}));
  await page.route('**/rest/v1/rpc/save_dashboard_template',route=>{
    saved = route.request().postDataJSON();
    return route.fulfill({json:{version:2}});
  });
  await page.goto('/admin?section=dashboard');
  await page.getByRole('button',{name:'Arrange dashboards',exact:true}).click();
  const designer = page.locator('.jic-layout-designer');
  await expect(designer.getByRole('heading',{name:'Arrange, preview, save'})).toBeVisible();
  await designer.getByRole('combobox',{name:'Audience',exact:true}).selectOption('teacher');
  await expect(designer.getByRole('button',{name:'Move Forms earlier',exact:true})).toBeEnabled();
  await designer.getByRole('button',{name:'Move Forms earlier',exact:true}).click();
  await designer.getByRole('button',{name:'Phone preview',exact:true}).click();
  await expect(designer.locator('.jic-layout-preview span').first()).toHaveText('Forms');
  await page.screenshot({path:testInfo.outputPath('compact-dashboard-designer.png'),fullPage:true});
  await designer.getByRole('button',{name:'Save layout',exact:true}).click();
  await expect(designer).toContainText('Dashboard saved. Access permissions have not changed.');
  expect(saved.p_scope).toBe('staff');
  expect(saved.p_audience).toBe('teacher');
  expect(saved.p_layout.order[0]).toBe('forms');
  expect(saved).not.toHaveProperty('permissions');
});
