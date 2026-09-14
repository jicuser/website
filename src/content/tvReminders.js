// After-salah selection based on Islamic Relief UK's dhikr guide.
// Texts: Muslim 591 and 592a; Bukhari 844; Muslim 597a; Qur'an 2:255.
// Ayat al-Kursi after obligatory prayer: an-Nasa'i, recorded in Bulugh al-Maram 2:220.
// Sources and the distinction from the separate daily 100 repetitions: docs/tv-dhikr.md.
const tawhid =
  'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ';

// One board, not timed slides. Count badges are rendered with Arabic-Indic digits.
export const TV_DHIKR = {
  title: 'أَذْكَارُ بَعْدَ الصَّلَاةِ',
  forgiveness: { arabic: 'أَسْتَغْفِرُ اللَّهَ', count: 3 },
  peace:
    'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
  tawhid,
  generosity:
    'اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ',
  tasbih: [
    { arabic: 'سُبْحَانَ اللَّهِ', count: 33 },
    { arabic: 'الْحَمْدُ لِلَّهِ', count: 33 },
    { arabic: 'اللَّهُ أَكْبَرُ', count: 33 },
  ],
  completion: { label: 'تَمَامَ الْمِائَةِ', arabic: tawhid, count: 1 },
  kursi: {
    label: 'آيَةُ الْكُرْسِيِّ',
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
  },
};
// Original community reminders, not quotations or promises of specific rewards.
export const TV_REMINDERS = [
  'Please silence your phone and keep conversations quiet in the prayer hall.',
  'Welcome newcomers warmly and make room for others.',
  'Keep walkways clear and place your shoes neatly on the racks.',
  'Help keep the masjid clean. Leave your space ready for the next person.',
  'Treat others with patience, kindness and respect.',
  'Make time for Qur’an, learning and helping your neighbours.',
];
