// Arabic excerpts checked against the linked published hadith texts, 23 October 2026.
// The transliterations and concise English meanings are reading aids, not tafsir.
const protection = {
  id: 'protection',
  title: 'In Allah’s name',
  repeat: '3 times',
  arabic:
    'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
  transliteration:
    'Bismillāhi alladhī lā yaḍurru ma‘a ismihi shay’un fi-l-arḍi wa lā fi-s-samā’i wa huwa-s-Samī‘u-l-‘Alīm.',
  meaning:
    'In the name of Allah, with whose name nothing on earth or in heaven can cause harm. He is the All-Hearing, the All-Knowing.',
  source: { label: 'Sunan Abi Dawud 5088', url: 'https://sunnah.com/abudawud:5088' },
};

const forgiveness = {
  id: 'sayyid-al-istighfar',
  title: 'Sayyid al-Istighfar',
  repeat: 'Read once with conviction',
  arabic:
    'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ لَكَ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
  transliteration:
    'Allāhumma anta Rabbī, lā ilāha illā anta, khalaqtanī wa anā ‘abduka, wa anā ‘alā ‘ahdika wa wa‘dika ma-staṭa‘tu. A‘ūdhu bika min sharri mā ṣana‘tu. Abū’u laka bini‘matika ‘alayya wa abū’u laka bidhanbī, faghfir lī fa-innahu lā yaghfiru-dh-dhunūba illā anta.',
  meaning:
    'O Allah, You are my Lord. None is worthy of worship except You. You created me and I am Your servant. I keep Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your blessings upon me and admit my sin. Forgive me, for no one forgives sins except You.',
  source: { label: 'Sahih al-Bukhari 6306', url: 'https://sunnah.com/bukhari:6306' },
};

const dailySource = { label: 'Sunan Abi Dawud 5068', url: 'https://sunnah.com/abudawud:5068' };
const prayerSource = { label: 'Sahih Muslim 591', url: 'https://sunnah.com/muslim:591' };
const tasbihSource = { label: 'Sahih Muslim 597a', url: 'https://sunnah.com/muslim:597a' };

export const ADHKAR_COLLECTIONS = [
  {
    id: 'morning',
    label: 'Morning',
    title: 'Morning adhkar',
    description:
      'Begin the morning remembering Allah, seeking His protection and asking forgiveness.',
    readings: [
      {
        id: 'morning-life',
        title: 'By You we enter the morning',
        repeat: 'Read once',
        arabic:
          'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
        transliteration:
          'Allāhumma bika aṣbaḥnā wa bika amsaynā wa bika naḥyā wa bika namūtu wa ilayka-n-nushūr.',
        meaning:
          'O Allah, by You we enter the morning and the evening; by You we live and die, and to You is the resurrection.',
        source: dailySource,
      },
      protection,
      forgiveness,
    ],
  },
  {
    id: 'evening',
    label: 'Evening',
    title: 'Evening adhkar',
    description: 'Remember Allah in the evening, seeking His protection and asking forgiveness.',
    readings: [
      // This is the evening wording in Abu Dawud 5068; other narrations have variants.
      {
        id: 'evening-life',
        title: 'By You we enter the evening',
        repeat: 'Read once',
        arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
        transliteration: 'Allāhumma bika amsaynā wa bika naḥyā wa bika namūtu wa ilayka-n-nushūr.',
        meaning:
          'O Allah, by You we enter the evening; by You we live and die, and to You is the resurrection.',
        source: dailySource,
      },
      protection,
      forgiveness,
    ],
  },
  {
    id: 'after-salah',
    label: 'After Salah',
    title: 'Adhkar after Salah',
    description:
      'Seek forgiveness three times, recite the prayer of peace, then the tasbih below. These counts follow the linked narrations.',
    readings: [
      {
        id: 'istighfar',
        title: 'Seek forgiveness',
        repeat: '3 times',
        arabic: 'أَسْتَغْفِرُ اللَّهَ',
        transliteration: 'Astaghfirullāh.',
        meaning: 'I seek Allah’s forgiveness.',
        source: prayerSource,
      },
      {
        id: 'peace',
        title: 'O Allah, You are Peace',
        repeat: 'Read once',
        arabic:
          'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ ذَا الْجَلَالِ وَالْإِكْرَامِ',
        transliteration:
          'Allāhumma anta-s-Salāmu wa minka-s-salāmu, tabārakta dhā-l-jalāli wa-l-ikrām.',
        meaning:
          'O Allah, You are Peace and from You comes peace. Blessed are You, Possessor of majesty and honour.',
        source: prayerSource,
      },
      {
        id: 'tasbih',
        title: 'Glorify Allah',
        repeat: '33 times',
        arabic: 'سُبْحَانَ اللَّهِ',
        transliteration: 'Subḥānallāh.',
        meaning: 'Glory be to Allah.',
        source: tasbihSource,
      },
      {
        id: 'tahmid',
        title: 'Praise Allah',
        repeat: '33 times',
        arabic: 'الْحَمْدُ لِلَّهِ',
        transliteration: 'Alḥamdulillāh.',
        meaning: 'All praise belongs to Allah.',
        source: tasbihSource,
      },
      {
        id: 'takbir',
        title: 'Declare Allah’s greatness',
        repeat: '33 times',
        arabic: 'اللَّهُ أَكْبَرُ',
        transliteration: 'Allāhu akbar.',
        meaning: 'Allah is the greatest.',
        source: tasbihSource,
      },
      {
        id: 'complete-hundred',
        title: 'Complete the hundred',
        repeat: 'Read once after the 33 / 33 / 33',
        arabic:
          'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration:
          'Lā ilāha illallāhu waḥdahu lā sharīka lah, lahu-l-mulku wa lahu-l-ḥamdu wa huwa ‘alā kulli shay’in qadīr.',
        meaning:
          'None is worthy of worship except Allah alone, without a partner. His is the dominion and to Him belongs all praise, and He has power over all things.',
        source: tasbihSource,
      },
    ],
  },
];
