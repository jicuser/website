import { isPageVisible } from '../lib/pageVisibility.js';

/** Website readers and learning tools, separate from mosque services and enrolment. */
export const READ_LEARN_RESOURCES = [
  {
    id: 'quran',
    title: 'Read Qur’an',
    description: 'Choose a surah, see the meaning and save your place.',
    to: '/worship/quran',
    category: 'read',
    icon: 'book',
    keywords: ['quran', 'koran', 'surah', 'reading', 'recitation', 'meaning'],
  },
  {
    id: 'adhkar',
    title: 'Adhkar & Du’as',
    description: 'Morning, evening and after-Salah reading, with meanings.',
    to: '/worship/daily-duas',
    category: 'read',
    icon: 'book',
    keywords: ['adhkar', 'adkar', 'dhikr', 'dua', 'duas', 'morning', 'evening', 'azkar'],
  },
  {
    id: 'arabic',
    title: 'Learn Arabic',
    description: 'Build words and sentences. Tap a coloured piece to see what changes.',
    to: '/learning/arabic',
    category: 'learn',
    icon: 'languages',
    keywords: [
      'arabic',
      'fusha',
      'classical',
      'grammar',
      'words',
      'sentence builder',
      'vocabulary',
      'practice',
      'pronouns',
      'vowels',
      'العربية',
      'تعلم',
    ],
  },
  {
    id: 'salah-guide',
    title: 'Salah guide',
    description: 'Prayer method, preparation and a short refresher.',
    to: '/worship/prayer-guide',
    category: 'guide',
    icon: 'book',
    keywords: ['wudu', 'salah', 'namaz', 'prayer', 'guide', 'learn'],
  },
  {
    id: 'janazah-guide',
    title: 'Janazah prayer guide',
    description: 'Follow the prayer and read its supplications.',
    to: '/worship/janazah-guide',
    category: 'guide',
    icon: 'book',
    keywords: ['funeral', 'janazah', 'janaza', 'prayer', 'recitations', 'urdu'],
  },
  {
    id: 'dalail',
    title: 'Dala’il al-Khayrat programme',
    description: 'Information about reading sessions and contacting the centre.',
    to: '/worship/dalail-al-khayrat',
    category: 'guide',
    kind: 'programme',
    icon: 'book',
    keywords: ['dalail', 'salawat', 'durood', 'reading', 'programme', 'sessions'],
  },
];

const defaultContent = (_key, fallback) => fallback;

/** Recheck the current CMS switch for each destination whenever discovery renders. */
export function getVisibleReadLearnResources(getContent = defaultContent) {
  if (!isPageVisible(getContent, '/worship')) return [];
  return READ_LEARN_RESOURCES.filter(({ to }) => isPageVisible(getContent, to));
}
