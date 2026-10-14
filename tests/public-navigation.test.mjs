import test from 'node:test';
import assert from 'node:assert/strict';
import { activeNavigation } from '../src/lib/publicNavigation.js';

test('public sections retain their own identity on overview pages', () => {
  for (const [path, name] of [
    ['/', 'Home'],
    ['/about', 'About'],
    ['/prayer-times', 'Prayer Times'],
    ['/worship', 'Worship'],
    ['/services', 'Services'],
    ['/projects', 'Masjid Building Works'],
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
    ['/education/enrolment', '/education', 'Choose Enrolment'],
    ['/youth/itikaf', '/youth', "I'tikaf Form"],
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
  for (const path of ['/madrassah', '/madrassah/enrolment', '/madrassah/classes-courses', '/madrassah/policies']) {
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

test('extension pages and legacy aliases keep Building Works parent and extension tabs', () => {
  for (const [path, currentPath] of [
    ['/projects/masjid-extension', '/projects/masjid-extension'],
    ['/projects/masjid-extension/timeline', '/projects/masjid-extension/timeline'],
    ['/projects/main-prayer-hall', '/projects/main-prayer-hall'],
    ['/projects/wudu-area', '/projects/wudu-area'],
    ['/projects/community-hall', '/projects/community-hall'],
    ['/projects/madrassah-floor', '/projects/madrassah-floor'],
    ['/projects/timeline', '/projects/masjid-extension/timeline'],
    ['/projects/madrassah-building', '/projects/madrassah-floor'],
  ]) {
    const section = activeNavigation(path);
    assert.equal(section.name, 'Masjid Extension', path);
    assert.equal(section.path, '/projects/masjid-extension', path);
    assert.equal(section.primaryPath, '/projects', path);
    assert.equal(section.primaryName, 'Masjid Building Works', path);
    assert.equal(section.current.path, currentPath, path);
  }
  for (const path of ['/projects', '/projects/gallery', '/projects/current-appeals']) {
    assert.equal(activeNavigation(path).name, 'Masjid Building Works', path);
  }
});

test('unrelated pages and lookalike prefixes do not claim an incorrect section', () => {
  for (const path of [
    '/search', '/privacy', '/forms/event-registration', '/pages/community-event',
    '/unknown', '/about-us', '/prayer-times-extra', '/educationn', '/funeralsxyz',
    '/projects2', '/madrassah-other',
  ]) {
    assert.equal(activeNavigation(path), null, path);
  }
});
