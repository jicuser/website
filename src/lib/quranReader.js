import { QURAN_SURAHS } from '../content/quranSurahs.js';

export const QURAN_API = 'https://api.alquran.cloud/v1';
export const QURAN_FALLBACK = 'https://quran.com';
export const QURAN_READER_STORAGE_KEY = 'jic-quran-reading-v1';
const DEFAULT_PREFERENCES = { fontSize: 32, showTranslation: true, savedVerse: null };
const UNAVAILABLE_MESSAGE =
  'The Qur’an reader is temporarily unavailable. Please try again or open Quran.com.';
const INVALID_MESSAGE = 'The Qur’an text could not be checked. Please try again or open Quran.com.';

function searchable(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
    .replace(/ٱ/g, 'ا')
    .toLowerCase()
    .replace(/[^a-z0-9\u0621-\u064a]/g, '')
    .replace(/([a-z])\1+/g, '$1');
}

export function findSurahs(query) {
  const term = searchable(query);
  if (!term) return QURAN_SURAHS;
  return QURAN_SURAHS.filter(
    (surah) =>
      String(surah.number) === term ||
      [surah.name, surah.arabicName, surah.meaning].some((name) => searchable(name).includes(term)),
  );
}

export function validSavedVerse(value) {
  const surah = QURAN_SURAHS.find((item) => item.number === value?.surah);
  return surah && Number.isInteger(value?.ayah) && value.ayah >= 1 && value.ayah <= surah.ayahCount
    ? { surah: surah.number, ayah: value.ayah }
    : null;
}

export function getReaderStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadQuranPreferences(storage) {
  try {
    const value = JSON.parse(storage?.getItem(QURAN_READER_STORAGE_KEY) || 'null');
    return {
      fontSize:
        Number.isInteger(value?.fontSize) &&
        value.fontSize >= 24 &&
        value.fontSize <= 48 &&
        value.fontSize % 2 === 0
          ? value.fontSize
          : DEFAULT_PREFERENCES.fontSize,
      showTranslation: typeof value?.showTranslation === 'boolean' ? value.showTranslation : true,
      savedVerse: validSavedVerse(value?.savedVerse),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveQuranPreferences(storage, preferences) {
  try {
    if (!storage) return false;
    storage.setItem(QURAN_READER_STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

export function parseQuranSurah(payload, surahNumber) {
  const expected = QURAN_SURAHS.find((surah) => surah.number === surahNumber);
  const [arabic, english] = Array.isArray(payload?.data) ? payload.data : [];
  const invalid = () => {
    throw new Error(INVALID_MESSAGE);
  };
  if (
    !expected ||
    payload?.code !== 200 ||
    arabic?.number !== surahNumber ||
    english?.number !== surahNumber ||
    arabic?.edition?.identifier !== 'quran-uthmani' ||
    english?.edition?.identifier !== 'en.sahih' ||
    !Array.isArray(arabic.ayahs) ||
    !Array.isArray(english.ayahs) ||
    arabic.ayahs.length !== expected.ayahCount ||
    english.ayahs.length !== expected.ayahCount
  )
    return invalid();
  const translations = new Map(english.ayahs.map((ayah) => [ayah?.numberInSurah, ayah?.text]));
  return arabic.ayahs.map((ayah, index) => {
    const translation = translations.get(ayah?.numberInSurah);
    if (
      ayah?.numberInSurah !== index + 1 ||
      typeof ayah.text !== 'string' ||
      !ayah.text.trim() ||
      typeof translation !== 'string' ||
      !translation.trim()
    )
      return invalid();
    return { number: ayah.numberInSurah, arabic: ayah.text, english: translation };
  });
}

export async function fetchQuranSurah(surahNumber, { signal, fetcher = fetch } = {}) {
  if (!QURAN_SURAHS.some((surah) => surah.number === surahNumber))
    throw new Error('Choose a valid surah.');
  let response;
  try {
    response = await fetcher(`${QURAN_API}/surah/${surahNumber}/editions/quran-uthmani,en.sahih`, {
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(UNAVAILABLE_MESSAGE);
  }
  if (!response?.ok) throw new Error(UNAVAILABLE_MESSAGE);
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(INVALID_MESSAGE);
  }
  return parseQuranSurah(payload, surahNumber);
}
