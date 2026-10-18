import test from 'node:test';
import assert from 'node:assert/strict';
import * as navigation from '../src/lib/publicNavigation.js';
import {
  FOOTER_LINKS,
  NAV_GROUPS,
  MADRASSAH_TABS,
  WORSHIP_TABS,
  PUBLIC_MENU_GROUPS,
} from '../src/content/nav.js';
import { EDITABLE_PAGES } from '../src/content/editablePages.js';

const { activeNavigation } = navigation;

test('compact footer keeps records under the portal', () => {
  assert.deepEqual(
    FOOTER_LINKS.map((item) => item.name),
    [
      'Donate',
      'Get involved',
      'Portal login',
      'Contact Us',
      'Download Salah timetable',
      'Services',
      'Our Masjid Project',
      'Education',
      'Youth',
    ],
  );
  assert.equal(
    FOOTER_LINKS.find((item) => item.name === 'Download Salah timetable').path,
    '/prayer-times/monthly#phone-wallpaper',
  );
  assert.equal(FOOTER_LINKS.find((item) => item.name === 'Portal login').path, '/portal');
  assert.equal(
    FOOTER_LINKS.some((item) => item.name === 'Certificates'),
    false,
  );
  assert.equal(
    NAV_GROUPS.find((item) => item.path === '/services').children.some(
      (item) => item.name === 'Certificates',
    ),
    false,
  );
  assert.ok(NAV_GROUPS.some((item) => item.path === '/about'));
  assert.ok(NAV_GROUPS.some((item) => item.path === '/prayer-times'));
  assert.ok(MADRASSAH_TABS.some((item) => item.path === '/madrassah'));
  assert.ok(
    NAV_GROUPS.flatMap((item) => item.children).some((item) => item.path === '/social-media'),
  );
  assert.ok(WORSHIP_TABS.some((item) => item.path === '/worship/janazah-guide'));
});

test('public sections retain their own identity on overview pages', () => {
  for (const [path, name] of [
    ['/', 'Home'],
    ['/about', 'About'],
    ['/prayer-times', 'Prayer Times'],
    ['/worship', 'Faith & practice'],
    ['/services', 'Services'],
    ['/projects', 'Our Masjid Project'],
    ['/education', 'Education'],
    ['/youth', 'Youth'],
  ]) {
    const section = activeNavigation(path);
    assert.equal(section.name, name, path);
    assert.equal(section.path, path, path);
    assert.equal(section.primaryName, name, path);
    assert.equal(section.primaryPath, path, path);
  }
});

test('subsections select the specific page instead of their overview prefix', () => {
  for (const [path, primaryPath, name] of [
    ['/prayer-times/monthly', '/prayer-times', 'Monthly Timetable'],
    ['/prayer-times/jummah', '/prayer-times', 'Jummah'],
    ['/about/history', '/about', 'Our History'],
    ['/services/hall-booking', '/services', 'Hall Booking'],
    ['/education/enrolment', '/education', 'Enrolment'],
    ['/youth/itikaf', '/youth', "I'tikaf Registration"],
    ['/worship/quran', '/worship', 'Read Qur’an'],
  ]) {
    const section = activeNavigation(path);
    assert.equal(section.primaryPath, primaryPath, path);
    assert.equal(section.current.path, path, path);
    assert.equal(section.current.name, name, path);
  }
});

test('About child routes outside /about keep the About parent context', () => {
  for (const path of ['/team', '/contact', '/financial-history', '/social-media']) {
    const section = activeNavigation(path);
    assert.equal(section.name, 'About', path);
    assert.equal(section.primaryPath, '/about', path);
    assert.equal(section.current.path, path, path);
  }
});

test('funeral details retain Services and the Funeral Services subsection', () => {
  for (const path of ['/funerals', '/funerals/what-to-do', '/funerals/contact-support']) {
    const section = activeNavigation(path);
    assert.equal(section.name, 'Services', path);
    assert.equal(section.primaryPath, '/services', path);
    assert.equal(section.current.name, 'Funeral Services', path);
    assert.equal(section.current.path, '/funerals', path);
  }
});

test('Madrassah keeps its own tabs within the Education parent section', () => {
  for (const path of [
    '/madrassah',
    '/madrassah/enrolment',
    '/madrassah/classes-courses',
    '/madrassah/policies',
  ]) {
    const section = activeNavigation(path);
    assert.equal(section.name, 'Madrassah', path);
    assert.equal(section.path, '/madrassah', path);
    assert.equal(section.primaryPath, '/education', path);
    assert.equal(section.primaryName, 'Education', path);
    assert.equal(section.current.path, path, path);
    assert.ok(section.children.some((child) => child.path === '/madrassah/student-portal'));
    assert.ok(!section.children.some((child) => child.path === '/education/courses'));
  }
});

test('project legacy links retain the project parent with a simplified journey menu', () => {
  for (const path of [
    '/projects',
    '/projects/masjid-extension',
    '/projects/masjid-extension/timeline',
    '/projects/main-prayer-hall',
    '/projects/wudu-area',
    '/projects/community-hall',
    '/projects/madrassah-floor',
    '/projects/timeline',
    '/projects/madrassah-building',
    '/projects/gallery',
  ]) {
    assert.equal(activeNavigation(path).primaryPath, '/projects', path);
  }
});

test('project aliases share one overview action while stage URLs and CMS pages remain available', () => {
  const projects = NAV_GROUPS.find((group) => group.path === '/projects');
  assert.equal(projects.children.filter((page) => page.path.startsWith('/projects')).length, 1);
  assert.equal(
    projects.children.find((page) => page.path.startsWith('/projects')).path,
    '/projects',
  );
  for (const path of [
    '/projects/masjid-extension',
    '/projects/masjid-extension/timeline',
    '/projects/main-prayer-hall',
    '/projects/wudu-area',
    '/projects/community-hall',
    '/projects/madrassah-floor',
    '/projects/timeline',
    '/projects/madrassah-building',
  ]) {
    const section = activeNavigation(path);
    assert.equal(section.path, '/projects', path);
    assert.equal(section.current?.path, '/projects', path);
    assert.equal(
      section.children.filter((page) => page.path.startsWith('/projects')).length,
      1,
      path,
    );
  }
  for (const path of [
    '/projects/masjid-extension',
    '/projects/main-prayer-hall',
    '/projects/wudu-area',
  ]) {
    assert.ok(
      EDITABLE_PAGES.some((page) => page.path === path),
      path,
    );
  }
});

test('donating is separate from volunteering and fundraising navigation', () => {
  const donation = activeNavigation('/donate');
  assert.equal(donation.name, 'Giving');
  assert.equal(donation.primaryPath, '/donate');
  assert.equal(donation.current.path, '/donate');
  assert.deepEqual(donation.children, [], 'no redundant category tabs above the payment task');
  for (const [path, current] of [
    ['/get-involved', '/get-involved'],
    ['/get-involved/volunteer', '/get-involved/volunteer'],
    ['/fundraise', '/fundraise'],
    ['/fundraise/new', '/fundraise/new'],
    ['/fundraise/community-appeal', '/fundraise'],
  ]) {
    const section = activeNavigation(path);
    assert.equal(section.name, 'Get involved', path);
    assert.equal(section.primaryPath, '/get-involved', path);
    assert.equal(section.current.path, current, path);
  }
  assert.equal(
    PUBLIC_MENU_GROUPS.find((group) => group.path === '/get-involved').name,
    'Get involved',
  );
  assert.equal(
    EDITABLE_PAGES.some((page) => page.path === '/fundraise/new'),
    false,
  );
});

test('section breadcrumbs keep one entry per section name and destination', () => {
  assert.deepEqual(
    navigation.navigationBreadcrumbs(activeNavigation('/donate')).map((item) => item.name),
    ['Giving'],
  );
  const breadcrumbs = navigation.navigationBreadcrumbs({
    primaryPath: '/projects',
    primaryName: 'Our Masjid Project',
    path: '/projects/masjid-extension',
    name: 'Our Masjid Project',
    current: { path: '/projects/main-prayer-hall', name: 'Main Prayer Hall' },
  });
  assert.deepEqual(
    breadcrumbs.map((item) => item.name),
    ['Our Masjid Project', 'Main Prayer Hall'],
  );
  assert.equal(breadcrumbs[0].path, '/projects');
});

test('unrelated pages and lookalike prefixes do not claim an incorrect section', () => {
  for (const path of [
    '/search',
    '/privacy',
    '/forms/event-registration',
    '/pages/community-event',
    '/unknown',
    '/about-us',
    '/prayer-times-extra',
    '/educationn',
    '/funeralsxyz',
    '/projects2',
    '/madrassah-other',
  ]) {
    assert.equal(activeNavigation(path), null, path);
  }
});
