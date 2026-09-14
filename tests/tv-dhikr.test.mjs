import test from 'node:test';
import assert from 'node:assert/strict';
import { TV_DHIKR, TV_REMINDERS } from '../src/content/tvReminders.js';

const plain = (text) => text.normalize('NFD').replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g, '').replace(/\s+/g, ' ').trim();

test('after-salah forgiveness is repeated three times (Muslim 591)', () => {
  assert.equal(TV_DHIKR.forgiveness?.count, 3);
  assert.equal(plain(TV_DHIKR.forgiveness.arabic), plain('أستغفر الله'));
});

test('all three tasbih phrases have 33 repetitions, not 100 each (Muslim 597a)', () => {
  assert.deepEqual(TV_DHIKR.tasbih?.map(({ count }) => count), [33, 33, 33]);
  assert.deepEqual(TV_DHIKR.tasbih.map(({ arabic }) => plain(arabic)),
    ['سبحان الله', 'الحمد لله', 'الله أكبر'].map(plain));
  assert.equal(TV_DHIKR.completion.count, 1);
  assert.equal(TV_DHIKR.tasbih.reduce((sum, item) => sum + item.count, 0) + TV_DHIKR.completion.count, 100);
});

test('the tawhid and generosity supplications are both present (Bukhari 844)', () => {
  assert.equal(plain(TV_DHIKR.tawhid), plain('لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير'));
  assert.equal(plain(TV_DHIKR.generosity), plain('اللهم لا مانع لما أعطيت، ولا معطي لما منعت، ولا ينفع ذا الجد منك الجد'));
  assert.equal(TV_DHIKR.completion.arabic, TV_DHIKR.tawhid);
});

test('Ayat al-Kursi is complete in one text, not split into timed slides', () => {
  assert.equal(typeof TV_DHIKR.kursi?.arabic, 'string');
  assert.equal(plain(TV_DHIKR.kursi.arabic), plain(
    'الله لا إله إلا هو الحي القيوم لا تأخذه سنة ولا نوم له ما في السماوات وما في الأرض من ذا الذي يشفع عنده إلا بإذنه يعلم ما بين أيديهم وما خلفهم ولا يحيطون بشيء من علمه إلا بما شاء وسع كرسيه السماوات والأرض ولا يئوده حفظهما وهو العلي العظيم',
  ));
});

test('all displayed dhikr strings are Arabic, without transliteration or English labels', () => {
  const texts = [TV_DHIKR.title, TV_DHIKR.forgiveness?.arabic, TV_DHIKR.peace,
    TV_DHIKR.tawhid, TV_DHIKR.generosity, TV_DHIKR.completion?.label,
    TV_DHIKR.completion?.arabic, TV_DHIKR.kursi?.label, TV_DHIKR.kursi?.arabic,
    ...(TV_DHIKR.tasbih || []).map(({ arabic }) => arabic)];
  for (const text of texts) {
    assert.equal(typeof text, 'string');
    assert.match(text, /[\u0621-\u064a]/u);
    assert.doesNotMatch(text, /[a-z]/i);
  }
});

test('unrelated community reminder text is preserved', () => {
  assert.equal(TV_REMINDERS.length, 6);
  assert.equal(TV_REMINDERS[0], 'Please silence your phone and keep conversations quiet in the prayer hall.');
});
