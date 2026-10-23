import test from 'node:test';
import assert from 'node:assert/strict';
import { QURAN_SURAHS } from '../src/content/quranSurahs.js';
import { ADHKAR_COLLECTIONS } from '../src/content/worshipAdhkar.js';
import { JANAZAH_CHILD_DUAS, JANAZAH_STEPS } from '../src/content/worshipJanazah.js';
import { WORSHIP_RESOURCES } from '../src/content/worshipResources.js';
import {
  fetchQuranSurah,
  findSurahs,
  loadQuranPreferences,
  parseQuranSurah,
  QURAN_READER_STORAGE_KEY,
  saveQuranPreferences,
  validSavedVerse,
} from '../src/lib/quranReader.js';

function payloadFor(number = 1) {
  const surah = QURAN_SURAHS[number - 1];
  return {
    code: 200,
    data: ['quran-uthmani', 'en.sahih'].map((identifier) => ({
      number,
      edition: { identifier },
      ayahs: Array.from({ length: surah.ayahCount }, (_, index) => ({
        numberInSurah: index + 1,
        text: `${identifier} ${index + 1}`,
      })),
    })),
  };
}

test('surah search supports names, meanings, Arabic without vowel marks, and exact numbers', () => {
  assert.equal(QURAN_SURAHS.length, 114);
  assert.equal(findSurahs('fatiha')[0].number, 1);
  assert.equal(findSurahs('The Opening')[0].number, 1);
  assert.equal(findSurahs('الفاتحة')[0].number, 1);
  assert.deepEqual(
    findSurahs('114').map((surah) => surah.number),
    [114],
  );
  assert.deepEqual(findSurahs('no such surah'), []);
});

test('saved verse recovery bounds the verse by its surah and tolerates corrupted or blocked storage', () => {
  for (const value of [
    null,
    {},
    { surah: 115, ayah: 1 },
    { surah: 1, ayah: 8 },
    { surah: 1, ayah: 0 },
    { surah: '1', ayah: 1 },
    { surah: 1, ayah: 1.5 },
  ])
    assert.equal(validSavedVerse(value), null);
  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key),
    setItem: (key, value) => memory.set(key, value),
  };
  const preferences = { fontSize: 40, showTranslation: false, savedVerse: { surah: 114, ayah: 6 } };
  assert.equal(saveQuranPreferences(storage, preferences), true);
  assert.deepEqual(loadQuranPreferences(storage), preferences);
  storage.setItem(QURAN_READER_STORAGE_KEY, '{broken');
  assert.deepEqual(loadQuranPreferences(storage), {
    fontSize: 32,
    showTranslation: true,
    savedVerse: null,
  });
  storage.setItem(
    QURAN_READER_STORAGE_KEY,
    JSON.stringify({
      fontSize: 500,
      showTranslation: 'false',
      savedVerse: { surah: 114, ayah: 7 },
    }),
  );
  assert.deepEqual(loadQuranPreferences(storage), {
    fontSize: 32,
    showTranslation: true,
    savedVerse: null,
  });
  const blocked = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  assert.equal(saveQuranPreferences(blocked, preferences), false);
  assert.equal(loadQuranPreferences(blocked).fontSize, 32);
});

test('Qur’an verses align by verse number and reject missing, wrong-surah or wrong-edition text', () => {
  const valid = payloadFor();
  valid.data[1].ayahs.reverse();
  assert.deepEqual(parseQuranSurah(valid, 1)[0], {
    number: 1,
    arabic: 'quran-uthmani 1',
    english: 'en.sahih 1',
  });
  const mutations = [
    (value) => {
      value.data = {};
    },
    (value) => {
      value.data[1].number = 2;
    },
    (value) => {
      value.data[1].edition.identifier = 'another-edition';
    },
    (value) => {
      value.data[0].ayahs.pop();
    },
    (value) => {
      value.data[1].ayahs[1].numberInSurah = 1;
    },
    (value) => {
      value.data[0].ayahs[0].text = '';
    },
    (value) => {
      value.data[0].ayahs[0] = null;
    },
    (value) => {
      value.data[1].ayahs[0] = null;
    },
  ];
  for (const mutate of mutations) {
    const payload = payloadFor();
    mutate(payload);
    assert.throws(() => parseQuranSurah(payload, 1), /could not be checked/);
  }
});

test('Qur’an requests pass the cancellation signal and surface network or HTTP failures', async () => {
  const controller = new AbortController();
  let requested;
  const ayahs = await fetchQuranSurah(1, {
    signal: controller.signal,
    fetcher: async (url, options) => {
      requested = { url, signal: options.signal };
      return { ok: true, json: async () => payloadFor() };
    },
  });
  assert.equal(ayahs.length, 7);
  assert.equal(requested.signal, controller.signal);
  assert.match(requested.url, /surah\/1\/editions\/quran-uthmani,en\.sahih$/);
  await assert.rejects(
    fetchQuranSurah(1, { fetcher: async () => ({ ok: false }) }),
    /temporarily unavailable/,
  );
  await assert.rejects(
    fetchQuranSurah(1, {
      fetcher: async () => {
        throw new Error('Internal network error');
      },
    }),
    /temporarily unavailable/,
  );
  await assert.rejects(
    fetchQuranSurah(1, {
      fetcher: async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError('Internal JSON error');
        },
      }),
    }),
    /could not be checked/,
  );
  const abortError = new DOMException('Aborted', 'AbortError');
  await assert.rejects(
    fetchQuranSurah(1, {
      fetcher: async () => {
        throw abortError;
      },
    }),
    { name: 'AbortError' },
  );
});

test('adhkar collections contain recitable text with references and the published repetition counts', () => {
  assert.deepEqual(
    ADHKAR_COLLECTIONS.map((collection) => collection.id),
    ['morning', 'evening', 'after-salah'],
  );
  for (const collection of ADHKAR_COLLECTIONS) {
    assert.ok(collection.readings.length >= 3);
    for (const reading of collection.readings) {
      assert.match(reading.arabic, /[\u0621-\u064a]/);
      assert.ok(reading.transliteration.length > 5 && reading.meaning.length > 5);
      assert.equal(new URL(reading.source.url).hostname, 'sunnah.com');
    }
  }
  const afterSalah = ADHKAR_COLLECTIONS[2].readings;
  assert.equal(afterSalah.find((reading) => reading.id === 'istighfar').repeat, '3 times');
  assert.deepEqual(
    afterSalah
      .filter((reading) => ['tasbih', 'tahmid', 'takbir'].includes(reading.id))
      .map((reading) => reading.repeat),
    ['33 times', '33 times', '33 times'],
  );
});

test('Janazah covers four takbirs with adult and child recitations and both publisher PDFs', () => {
  assert.deepEqual(
    JANAZAH_STEPS.map((step) => step.id),
    ['first', 'second', 'third', 'fourth'],
  );
  for (const step of JANAZAH_STEPS)
    assert.ok(step.reading.arabic && step.reading.transliteration && step.reading.meaning);
  assert.match(JANAZAH_STEPS[0].reading.arabic, /وَجَلَّ ثَنَاؤُكَ/);
  assert.deepEqual(
    JANAZAH_CHILD_DUAS.map((reading) => reading.id),
    ['boy', 'girl'],
  );
  for (const key of ['pdf', 'urduPdf']) {
    const url = new URL(WORSHIP_RESOURCES.janazah[key]);
    assert.equal(url.hostname, 'data2.dawateislami.net');
    assert.ok(url.pathname.endsWith('.pdf'));
  }
});
