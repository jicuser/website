// Method: Dawat-e-Islami, Method of Funeral Salah (Hanafi), printed pp. 8–10.
// The Arabic adult/child duas and added sana were checked against PDF pages 13–14.
// Base sana: Jami‘ at-Tirmidhi 243. Salat Ibrahimiyya: Sahih al-Bukhari 3370.
// Salam: Sunan Abi Dawud 996. The Hanafi addition to sana is in the guide.
export const JANAZAH_STEPS = [
  {
    id: 'first',
    title: 'First takbir — Opening praise',
    instruction:
      'Make the intention in your heart to offer the funeral prayer for Allah and supplicate for the deceased, following the Imam. Say “Allahu akbar”, raise your hands for this first takbir, then fold them and recite the praise below quietly.',
    reading: {
      arabic:
        'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَى جَدُّكَ وَجَلَّ ثَنَاؤُكَ وَلَا إِلَهَ غَيْرُكَ',
      transliteration:
        'Subḥānaka-llāhumma wa biḥamdika wa tabāraka-smuka wa ta‘ālā jadduka wa jalla thanā’uka wa lā ilāha ghayruk.',
      meaning:
        'Glory and praise be to You, O Allah. Blessed is Your name, exalted is Your majesty and great is Your praise. None is worthy of worship except You.',
    },
  },
  {
    id: 'second',
    title: 'Second takbir — Salawat',
    instruction:
      'Say “Allahu akbar” without raising your hands again, then quietly recite Salat Ibrahimiyya.',
    reading: {
      arabic:
        'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ. اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
      transliteration:
        'Allāhumma ṣalli ‘alā Muḥammadin wa ‘alā āli Muḥammadin kamā ṣallayta ‘alā Ibrāhīma wa ‘alā āli Ibrāhīma innaka Ḥamīdun Majīd. Allāhumma bārik ‘alā Muḥammadin wa ‘alā āli Muḥammadin kamā bārakta ‘alā Ibrāhīma wa ‘alā āli Ibrāhīma innaka Ḥamīdun Majīd.',
      meaning:
        'O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim. You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim. You are Praiseworthy, Glorious.',
    },
    source: {
      label: 'Salawat wording: Sahih al-Bukhari 3370',
      url: 'https://sunnah.com/bukhari:3370',
    },
  },
  {
    id: 'third',
    title: 'Third takbir — Du‘a for the deceased',
    instruction:
      'Say “Allahu akbar” without raising your hands, then quietly make the supplication. The following is for an adult man or woman. The guide gives separate supplications for a child below.',
    reading: {
      arabic:
        'اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا وَشَاهِدِنَا وَغَائِبِنَا وَصَغِيرِنَا وَكَبِيرِنَا وَذَكَرِنَا وَأُنْثَانَا. اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلَامِ وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الْإِيمَانِ',
      transliteration:
        'Allāhumma-ghfir liḥayyinā wa mayyitinā wa shāhidinā wa ghā’ibinā wa ṣaghīrinā wa kabīrinā wa dhakarinā wa unthānā. Allāhumma man aḥyaytahu minnā fa-aḥyihi ‘ala-l-Islāmi wa man tawaffaytahu minnā fatawaffahu ‘ala-l-īmān.',
      meaning:
        'O Allah, forgive our living and our dead, those present and those absent, our young and our old, our men and our women. O Allah, whoever You keep alive among us, keep them alive upon Islam; whoever You cause to die among us, let them die upon faith.',
    },
  },
  {
    id: 'fourth',
    title: 'Fourth takbir — Salam',
    instruction:
      'Say “Allahu akbar” for the fourth time, release your hands, and give salam to the right and then the left, following the Imam.',
    reading: {
      arabic: 'اللَّهُ أَكْبَرُ\nالسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ',
      transliteration: 'Allāhu akbar. As-salāmu ‘alaykum wa raḥmatullāh.',
      meaning: 'Allah is the greatest. Peace and Allah’s mercy be upon you.',
    },
    source: {
      label: 'Salam wording: Sunan Abi Dawud 996',
      url: 'https://sunnah.com/abudawud:996',
    },
  },
];

export const JANAZAH_CHILD_DUAS = [
  {
    id: 'boy',
    title: 'For a boy',
    arabic:
      'اللَّهُمَّ اجْعَلْهُ لَنَا فَرَطًا وَاجْعَلْهُ لَنَا أَجْرًا وَذُخْرًا وَاجْعَلْهُ لَنَا شَافِعًا وَمُشَفَّعًا',
    transliteration:
      'Allāhumma-j‘alhu lanā faraṭan wa-j‘alhu lanā ajran wa dhukhran wa-j‘alhu lanā shāfi‘an wa mushaffa‘ā.',
    meaning:
      'O Allah, make him one who goes ahead for us, a reward and a treasure for us, and an intercessor for us whose intercession is accepted.',
  },
  {
    id: 'girl',
    title: 'For a girl',
    arabic:
      'اللَّهُمَّ اجْعَلْهَا لَنَا فَرَطًا وَاجْعَلْهَا لَنَا أَجْرًا وَذُخْرًا وَاجْعَلْهَا لَنَا شَافِعَةً وَمُشَفَّعَةً',
    transliteration:
      'Allāhumma-j‘alhā lanā faraṭan wa-j‘alhā lanā ajran wa dhukhran wa-j‘alhā lanā shāfi‘atan wa mushaffa‘ah.',
    meaning:
      'O Allah, make her one who goes ahead for us, a reward and a treasure for us, and an intercessor for us whose intercession is accepted.',
  },
];
