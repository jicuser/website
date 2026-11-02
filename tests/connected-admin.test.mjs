import test from 'node:test';
import assert from 'node:assert/strict';

const libraryURL = new URL('../src/lib/formLibrary.js', import.meta.url);
const templatesURL = new URL('../src/lib/formTemplates.js', import.meta.url);
const timesURL = new URL('../src/lib/publishedTime.js', import.meta.url);

async function library() { return import(libraryURL); }
async function templates() { return import(templatesURL); }

test('unknown forms stay in other, rather than guessing from their title', async () => {
  const { formGroups } = await library();
  assert.deepEqual(formGroups({ title: 'Education and funeral help' }), ['other']);
  assert.deepEqual(formGroups(null), ['other']);
});
test('legacy Madrasah and Itikaf identities are grouped correctly', async () => {
  const { formGroups } = await library();
  assert.deepEqual(formGroups({ built_in_kind: 'madrassah' }), ['madrasah']);
  assert.deepEqual(formGroups({ kind: 'madrassah' }), ['madrasah']);
  assert.deepEqual(formGroups({ built_in_kind: 'itikaaf' }), ['ramadan']);
});
test('linked pages can put a reused form in multiple groups without duplicates', async () => {
  const { formGroups } = await library();
  const form = { pages: [{ placement: '/education/courses' }, { placement: '/youth' }, { placement: '/services' }] };
  assert.deepEqual(formGroups(form), ['education', 'services']);
});
test('explicit service forms and built-in contact are service enquiries', async () => {
  const { formGroups } = await library();
  assert.deepEqual(formGroups({ built_in_kind: 'contact' }), ['services']);
  assert.deepEqual(formGroups({}, true), ['services']);
});
test('matching uses titles and page names, not private response content', async () => {
  const { matchesFormSearch } = await library();
  const form = { title: 'Qur’an étude', slug: 'quran', pages: [{ title: 'Monday class' }], answers: { private: 'medical secret' } };
  assert.equal(matchesFormSearch(form, 'ETUDE'), true);
  assert.equal(matchesFormSearch(form, 'monday'), true);
  assert.equal(matchesFormSearch(form, 'medical secret'), false);
  assert.equal(matchesFormSearch(null, ''), true);
  assert.equal(matchesFormSearch(null, 'monday'), false);
});
test('filtering does not mutate input and can find draft forms', async () => {
  const { filterFormLibrary } = await library();
  const forms = Object.freeze([
    Object.freeze({ id: 'draft', title: 'Arabic', published_version: null }),
    Object.freeze({ id: 'live', title: 'Arabic', published_version: 2, enabled: true }),
    Object.freeze({ id: 'closed', title: 'Arabic', published_version: 1, enabled: false }),
  ]);
  assert.deepEqual(filterFormLibrary(forms, { status: 'Draft', search: 'arabic' }).map(f => f.id), ['draft']);
  assert.equal(filterFormLibrary(forms, { status: 'all' }).length, 3);
  assert.deepEqual(filterFormLibrary(null), []);
});
test('status totals count permitted legacy forms as live', async () => {
  const { formStatusCounts } = await library();
  assert.deepEqual(formStatusCounts([{ published_version: 1, enabled: false }], [{ kind: 'contact' }]), { all: 2, Live: 1, Draft: 0, Closed: 1 });
});
test('form usage never calls a hidden page live', async () => {
  const { formUsageSummary } = await library();
  assert.equal(formUsageSummary({ pages: [{ published: false }] }), '1 linked page · none published');
  assert.equal(formUsageSummary({ pages: [{ published: true }, { published: false }] }), '2 linked pages · 1 published');
  assert.equal(formUsageSummary({ built_in_kind: 'contact' }), 'Built-in website form');
  assert.equal(formUsageSummary({}), 'Direct form link');
});
test('interest drafts start unnamed and never enable an account, payment or enrolment', async () => {
  const { classInterestDraft } = await templates();
  const draft = classInterestDraft();
  assert.deepEqual(Object.keys(draft).sort(), ['description', 'schema']);
  assert.match(draft.description, /not a confirmed place or a payment/);
  assert.equal(draft.schema.fields.length, 5);
});
test('interest template asks subject and availability without financial or child identifiers', async () => {
  const { interestQuestions } = await templates();
  const fields = interestQuestions();
  assert.equal(new Set(fields.map(f => f.id)).size, fields.length);
  assert.equal(fields.some(f => f.id === 'course_interest' && f.required), true);
  assert.equal(fields.some(f => f.id === 'availability'), true);
  assert.equal(fields.some(f => f.type === 'email' && f.required), true);
  assert.equal(fields.some(f => /payment|card|date.of.birth|child.name/i.test(f.id)), false);
  assert.equal(fields.every(f => ['text', 'email', 'select', 'textarea'].includes(f.type)), true);
});
test('interest questions are independently editable, not shared mutable objects', async () => {
  const { interestQuestions } = await templates();
  const first = interestQuestions();
  first.find(f => f.id === 'availability').options.push('Changed');
  const second = interestQuestions();
  assert.equal(second.find(f => f.id === 'availability').options.includes('Changed'), false);
});
test('published prayer times exclude placeholders and invalid clocks', async () => {
  const { hasPublishedTime } = await import(timesURL);
  for (const value of [null, undefined, '', '-', '—', 'TBC', '24:00', '13:30 PM', '12:70', '0:30 AM']) assert.equal(hasPublishedTime(value), false, String(value));
  for (const value of ['12:35 PM', '1:30 pm', '13:30', '00:30', ' 6:15 AM ']) assert.equal(hasPublishedTime(value), true, value);
});

test('quick actions require their own capability and do not invent class-admin access', async () => {
  const { availableQuickActions } = await import('../src/lib/adminQuickActions.js');
  assert.deepEqual(availableQuickActions(() => false), []);
  const forms = availableQuickActions((permission) => permission === 'forms');
  assert.deepEqual(forms.map((item) => item.id), ['forms']);
  assert.equal(forms[0].href, '/admin?section=forms');
  const pages = availableQuickActions((permission) => permission === 'content');
  assert.equal(pages.length, 2);
  assert.equal(pages.every((item) => item.href.startsWith('/admin?section=content')), true);
  assert.deepEqual(availableQuickActions(null), []);
});
