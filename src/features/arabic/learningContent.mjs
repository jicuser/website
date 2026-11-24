// Original teaching examples. These are not quotations from the Qur’an.
export const ARABIC_REFERENCES = [
  {
    label: 'Al Jazeera Learning Arabic: grammar lessons',
    href: 'https://learning.aljazeera.net/ar/lessons/series/مَبادِئُ-نَحْوِيَّةٌ',
  },
  {
    label: 'Al Jazeera: person endings on verbs',
    href: 'https://learning.aljazeera.net/ar/node/19534',
  },
  {
    label: 'Al Jazeera: possessive endings on nouns',
    href: 'https://learning.aljazeera.net/ar/node/19503',
  },
  {
    label: 'Al Jazeera: two of something',
    href: 'https://learning.aljazeera.net/en/generallanguage/مبادئ-نحوية-4-1',
  },
  {
    label: 'Quranic Arabic Corpus: grammar guide',
    href: 'https://corpus.quran.com/documentation/grammar.jsp',
  },
  {
    label: 'Quranic Arabic Corpus: possession',
    href: 'https://corpus.quran.com/documentation/possessiveconstruction.jsp',
  },
];

const houseExample = (patch = {}) => ({
  mode: 'noun',
  nounId: 'bayt',
  ownerId: 'our',
  contextId: 'this',
  number: 'singular',
  definiteness: 'indefinite',
  ...patch,
});

export const GRAMMAR_TOPICS = [
  {
    id: 'pieces',
    question: 'What is each piece?',
    label: 'Word pieces',
    icon: 'pieces',
    title: 'One word can carry several ideas.',
    explanation:
      'In baytunā, bayt means house, u helps the word fit its sentence, and nā means our. The t belongs to house. It is not part of the owner ending.',
    examples: [
      {
        ar: 'بَيْتُنَا',
        latin: 'bayt · u · nā',
        english: 'our house',
        note: 'house · sentence vowel · our',
      },
      {
        ar: 'بَيْتُهَا',
        latin: 'bayt · u · hā',
        english: 'her house',
        note: 'Only the owner changed.',
      },
      {
        ar: 'فِي بَيْتِهَا',
        latin: 'fī bayt · i · hā',
        english: 'in her house',
        note: 'Adding “in” changes u to i.',
      },
    ],
    remember: 'Tap the same colour in the builder to change the same kind of piece.',
    terms:
      'Stem: the main word part. Suffix: something attached at the end. Case ending: a marker showing how a noun fits its sentence.',
    tryLabel: 'Explore the pieces of our house',
    tryState: houseExample(),
  },
  {
    id: 'whose',
    question: 'Whose? Connected to whom?',
    label: 'People & ownership',
    icon: 'people',
    title: 'A small ending can tell you whose.',
    explanation:
      'Add a person ending to a noun: my, your, his, her, our or their. This also describes a connection, such as my name or our teacher; it does not have to mean literal ownership.',
    examples: [
      { ar: 'بَيْتِي', latin: 'baytī', english: 'my house', note: 'ī = my' },
      { ar: 'بَيْتُنَا', latin: 'baytunā', english: 'our house', note: 'nā = our' },
      { ar: 'بَيْتُهُ', latin: 'baytuhu', english: 'his house', note: 'hu = his here' },
      { ar: 'بَيْتُهَا', latin: 'baytuhā', english: 'her house', note: 'hā = her' },
    ],
    remember:
      'The person ending describes the owner or connection. It does not tell you whether “house” is a masculine or feminine word.',
    terms:
      'Attached possessive pronouns: الضَّمَائِرُ الْمُتَّصِلَةُ. Different forms of “your” distinguish the person or people being addressed.',
    tryLabel: 'Change whose house it is',
    tryState: houseExample({ ownerId: 'her' }),
  },
  {
    id: 'position',
    question: 'How does it fit?',
    label: 'Sentence vowels',
    icon: 'position',
    title: 'Choose what you want to say. The vowel follows.',
    explanation:
      'These three examples all contain “our house”. The little vowel changes because the house has a different job in each sentence. It does not become somebody else’s house.',
    examples: [
      {
        ar: 'هَذَا بَيْتُنَا',
        latin: 'hādhā baytunā',
        english: 'This is our house.',
        note: 'u in this sentence',
      },
      {
        ar: 'رَأَيْتُ بَيْتَنَا',
        latin: 'raʾaytu baytanā',
        english: 'I saw our house.',
        note: 'a for the thing I saw',
      },
      { ar: 'فِي بَيْتِنَا', latin: 'fī baytinā', english: 'in our house', note: 'i after fī' },
    ],
    remember:
      'This u / a / i pattern is useful for ordinary singular nouns. Two of something and some plurals have different endings.',
    terms:
      'These positions are called nominative (مَرْفُوع), accusative (مَنْصُوب) and genitive (مَجْرُور). The system of sentence endings is called iʿrāb (إِعْرَاب).',
    tryLabel: 'Add “in” and watch the vowel',
    tryState: houseExample({ contextId: 'in' }),
  },
  {
    id: 'my',
    question: 'Why is “my” different?',
    label: 'The ī ending',
    icon: 'people',
    title: 'My house stays baytī in all three places.',
    explanation:
      'With “my”, the ī ending takes over the visible ending. The sentence still gives the word a job, but you do not hear a separate u, a or i before ī. There is no extra n.',
    examples: [
      { ar: 'هَذَا بَيْتِي', latin: 'hādhā baytī', english: 'This is my house.' },
      { ar: 'رَأَيْتُ بَيْتِي', latin: 'raʾaytu baytī', english: 'I saw my house.' },
      { ar: 'فِي بَيْتِي', latin: 'fī baytī', english: 'in my house' },
    ],
    remember: 'ī means “my” here. It is not a rule that every long ī means “in”.',
    terms:
      'The case marking is not pronounced separately before the first-person possessive suffix. This is often described as an estimated or hidden case ending.',
    tryLabel: 'Try “in my house”',
    tryState: houseExample({ ownerId: 'my', contextId: 'in' }),
  },
  {
    id: 'many',
    question: 'One, two or more?',
    label: 'How many',
    icon: 'many',
    title: 'Arabic has a special form for two.',
    explanation:
      'One house, two houses and several houses have different word forms. Some plurals change the inside of the word, so the builder uses a recorded plural for each word instead of guessing.',
    examples: [
      { ar: 'بَيْتٌ', latin: 'baytun', english: 'a house', note: 'one' },
      { ar: 'بَيْتَانِ', latin: 'baytāni', english: 'two houses', note: 'two' },
      {
        ar: 'فِي بَيْتَيْنِ',
        latin: 'fī baytayni',
        english: 'in two houses',
        note: 'After fī, āni becomes ayni.',
      },
      {
        ar: 'بُيُوتٌ',
        latin: 'buyūtun',
        english: 'houses',
        note: 'The inside changed: bayt → buyūt.',
      },
    ],
    remember:
      'For two, the n disappears before an owner ending. The builder handles this as part of the whole word.',
    terms:
      'Singular: مُفْرَد. Dual: مُثَنًّى. Plural: جَمْع. A plural formed by changing the inside is called a broken plural (جَمْعُ تَكْسِيرٍ).',
    tryLabel: 'Build two houses',
    tryState: houseExample({ number: 'dual', ownerId: 'none' }),
  },
  {
    id: 'which',
    question: 'A house, the house or my house?',
    label: 'Which one',
    icon: 'which',
    title: 'There is more than one way to identify a thing.',
    explanation:
      'Al- often does the work of English “the”. An owner ending also identifies the noun. With these ordinary nouns, choose “the house” or “my house”; do not attach both al- and my.',
    examples: [
      { ar: 'بَيْتٌ', latin: 'baytun', english: 'a house', note: 'not identified' },
      { ar: 'الْبَيْتُ', latin: 'al-baytu', english: 'the house', note: 'al- identifies it' },
      { ar: 'بَيْتِي', latin: 'baytī', english: 'my house', note: 'ī identifies whose' },
    ],
    remember:
      'The extra n sound in baytun is called tanwīn. It goes away with al- or an owner ending; it is not the word nā, “our”.',
    terms:
      'Indefinite: نَكِرَة. Definite: مَعْرِفَة. Tanwīn: تَنْوِين. A noun with a possessive suffix is definite.',
    tryLabel: 'Compare a house and the house',
    tryState: houseExample({ ownerId: 'none', definiteness: 'definite', contextId: 'phrase' }),
  },
  {
    id: 'matching',
    question: 'Why do nearby words change?',
    label: 'Words that match',
    icon: 'matching',
    title: 'Some words change to match the thing they describe.',
    explanation:
      'Arabic nouns belong to masculine or feminine word groups. “This” changes to match: hādhā for this book, hādhihi for this school. This is a property of the noun, not the owner.',
    examples: [
      { ar: 'هَذَا كِتَابٌ', latin: 'hādhā kitābun', english: 'This is a book.' },
      { ar: 'هَذِهِ مَدْرَسَةٌ', latin: 'hādhihi madrasatun', english: 'This is a school.' },
      {
        ar: 'هَذِهِ كُتُبِي',
        latin: 'hādhihi kutubī',
        english: 'These are my books.',
        note: 'A group of things often uses feminine-singular matching.',
      },
    ],
    remember:
      'Many feminine nouns end in ة, but not all. With an owner ending, this ة is written ت: مَدْرَسَتِي, madrasatī, “my school”.',
    terms:
      'Agreement means matching forms. Masculine: مُذَكَّر. Feminine: مُؤَنَّث. Nonhuman plurals normally take feminine-singular agreement.',
    tryLabel: 'Try “this is my school”',
    tryState: houseExample({ nounId: 'madrasah', ownerId: 'my' }),
  },
  {
    id: 'where',
    question: 'In, from or to?',
    label: 'Place & direction',
    icon: 'where',
    title: 'A small word before the house changes the whole idea.',
    explanation:
      'Fī means in, min means from, and ilā means to. With our house, all three ask for the i vowel. The place stays the same; the relationship changes.',
    examples: [
      { ar: 'فِي بَيْتِنَا', latin: 'fī baytinā', english: 'in our house' },
      { ar: 'مِنْ بَيْتِنَا', latin: 'min baytinā', english: 'from our house' },
      { ar: 'إِلَى بَيْتِنَا', latin: 'ilā baytinā', english: 'to our house' },
      {
        ar: 'فِي بَيْتِهِ',
        latin: 'fī baytihi',
        english: 'in his house',
        note: 'His changes hu → hi after this i. Her hā stays hā.',
      },
    ],
    remember:
      'Adding fī to baytuhu changes two vowels: bayt-u-hu → bayt-i-hi. Both versions still refer to him.',
    terms:
      'Prepositions: حُرُوفُ الْجَرِّ. Their noun is in the genitive position. The hu / hi difference is a separate pronunciation rule.',
    tryLabel: 'Watch both changes for “his”',
    tryState: houseExample({ ownerId: 'his', contextId: 'in' }),
  },
  {
    id: 'actions',
    question: 'Who did it, and when?',
    label: 'Actions',
    icon: 'when',
    title: 'Beginnings and endings can tell you who acts.',
    explanation:
      'An action word changes for the person doing it. It can also show whether you are talking about a completed action, something ongoing or a future action.',
    examples: [
      { ar: 'كَتَبَ', latin: 'kataba', english: 'he wrote' },
      {
        ar: 'كَتَبْنَا',
        latin: 'katabnā',
        english: 'we wrote',
        note: 'Here nā tells you who wrote.',
      },
      {
        ar: 'نَكْتُبُ',
        latin: 'naktubu',
        english: 'we write / we are writing',
        note: 'Now the beginning helps show “we”.',
      },
      {
        ar: 'سَنَكْتُبُ',
        latin: 'sanaktubu',
        english: 'we will write',
        note: 'sa- points to the future.',
      },
    ],
    remember:
      'Nā does not always mean “we” on every verb: it can also mean “us”. Look at the whole form and sentence. In katabnā, it means “we wrote”.',
    terms:
      'Verb: فِعْل. Conjugation means changing a verb for its person, number, gender and other features. Past: مَاضٍ. Present/imperfect: مُضَارِع.',
    tryLabel: 'Change who writes',
    tryState: { mode: 'verb', verbId: 'kataba', personId: 'we', tenseId: 'past' },
  },
  {
    id: 'families',
    question: 'Why do words look related?',
    label: 'Roots & patterns',
    icon: 'roots',
    title: 'A family of letters can connect several ideas.',
    explanation:
      'The letters ك ت ب connect words associated with writing. The letters and vowels around them help create different words. A root is a clue to a family, not a complete definition.',
    examples: [
      { ar: 'كَتَبَ', latin: 'kataba', english: 'he wrote' },
      { ar: 'كِتَابٌ', latin: 'kitābun', english: 'a book' },
      { ar: 'كَاتِبٌ', latin: 'kātibun', english: 'a writer' },
      { ar: 'مَكْتَبٌ', latin: 'maktabun', english: 'a desk / office' },
    ],
    remember:
      'Not every possible pattern makes a real word. Learn the recorded word and its use as well as the root.',
    terms:
      'Root: جَذْر. Pattern: وَزْن. Morphology (صَرْف) studies how words are formed and changed.',
    tryLabel: 'Explore the word for book',
    tryState: houseExample({ nounId: 'kitab', ownerId: 'my' }),
  },
  {
    id: 'sentences',
    question: 'How do I put a sentence together?',
    label: 'Joining ideas',
    icon: 'sentence',
    title: 'Start with a small, complete idea.',
    explanation:
      'Arabic can say “This is my book” without a separate present-tense word for “is”. You can also say where a thing is. A sentence about an action can begin with its verb.',
    examples: [
      {
        ar: 'هَذَا كِتَابِي',
        latin: 'hādhā kitābī',
        english: 'This is my book.',
        note: 'this · my book',
      },
      {
        ar: 'الْكِتَابُ فِي الْبَيْتِ',
        latin: 'al-kitābu fī l-bayti',
        english: 'The book is in the house.',
        note: 'the book · in the house',
      },
      {
        ar: 'كَتَبَ الْوَلَدُ',
        latin: 'kataba l-waladu',
        english: 'The boy wrote.',
        note: 'wrote · the boy',
      },
    ],
    remember:
      'Word order has choices, but those choices can affect emphasis and agreement. Begin with the checked sentence patterns in the builder.',
    terms:
      'Nominal sentence: جُمْلَةٌ اسْمِيَّةٌ. Verbal sentence: جُمْلَةٌ فِعْلِيَّةٌ. A subject is the person or thing the sentence says something about, or the doer of an action.',
    tryLabel: 'Build “this is my book”',
    tryState: houseExample({ nounId: 'kitab', ownerId: 'my' }),
  },
  {
    id: 'questions',
    question: 'Can I ask, say no or give an instruction?',
    label: 'Questions & requests',
    icon: 'questions',
    title: 'Small openings can turn a statement into something new.',
    explanation:
      'Hal opens a yes-or-no question. Ayna asks where. Lā can make a simple present-tense statement negative. An instruction has its own verb form.',
    examples: [
      {
        ar: 'هَلْ هَذَا كِتَابُكَ؟',
        latin: 'hal hādhā kitābuka?',
        english: 'Is this your book?',
        note: 'Speaking to one man.',
      },
      {
        ar: 'أَيْنَ كِتَابُكَ؟',
        latin: 'ayna kitābuka?',
        english: 'Where is your book?',
        note: 'Speaking to one man.',
      },
      { ar: 'لَا أَكْتُبُ', latin: 'lā aktubu', english: 'I do not write.' },
      { ar: 'اُكْتُبْ', latin: 'uktub', english: 'Write!', note: 'An instruction to one man.' },
    ],
    remember:
      'Different kinds of “not” and different kinds of commands change the verb differently. These examples show specific patterns, not a universal prefix to add anywhere.',
    terms:
      'Interrogative: asking a question. Negation: saying something is not so. Imperative: an instruction. In Arabic: اسْتِفْهَام، نَفْي، أَمْر.',
    tryLabel: 'Explore a present-tense action',
    tryState: { mode: 'verb', verbId: 'kataba', personId: 'i', tenseId: 'present' },
  },
];

const arabic = (ar, latin) => ({ ar, latin });
const text = (label) => ({ label });

export const PRACTICE_QUESTIONS = [
  {
    id: 'my-house',
    topic: 'Whose?',
    prompt: 'What does بَيْتِي mean?',
    promptArabic: 'بَيْتِي',
    promptLatin: 'baytī',
    options: [text('Our house'), text('My house'), text('Her house')],
    answer: 1,
    explanation: 'Bayt is house. The long ī ending means my: bayt + ī = baytī.',
  },
  {
    id: 'our-house',
    topic: 'Whose?',
    prompt: 'Choose “our house”.',
    options: [
      arabic('بَيْتُهَا', 'baytuhā'),
      arabic('بَيْتِي', 'baytī'),
      arabic('بَيْتُنَا', 'baytunā'),
    ],
    answer: 2,
    explanation:
      'Nā means our. Bayt is the house, u helps it fit the sentence, and nā tells you whose.',
  },
  {
    id: 'in-our-house',
    topic: 'In, from or to?',
    prompt: 'Choose “in our house”.',
    options: [
      arabic('فِي بَيْتِنَا', 'fī baytinā'),
      arabic('فِي بَيْتُنَا', 'fī baytunā'),
      arabic('فِي بَيْتَنَا', 'fī baytanā'),
    ],
    answer: 0,
    explanation: 'Fī means in. Here it calls for i after bayt. Nā still means our: fī bayt-i-nā.',
  },
  {
    id: 'her-ending',
    topic: 'Whose?',
    prompt: 'Which ending means “her”?',
    options: [arabic('ـهُ', 'hu'), arabic('ـهَا', 'hā'), arabic('ـنَا', 'nā')],
    answer: 1,
    explanation: 'Hā means her. Hu means his in forms such as baytuhu. Nā means our on this noun.',
  },
  {
    id: 'in-his-house',
    topic: 'Two changes together',
    prompt: 'Choose “in his house”.',
    options: [
      arabic('فِي بَيْتُهُ', 'fī baytuhu'),
      arabic('فِي بَيْتِهَا', 'fī baytihā'),
      arabic('فِي بَيْتِهِ', 'fī baytihi'),
    ],
    answer: 2,
    explanation:
      'Fī changes the house vowel to i. His also sounds hi after that i: bayt-u-hu → bayt-i-hi. Hā would mean her.',
  },
  {
    id: 'from-our-house',
    topic: 'In, from or to?',
    prompt: 'Choose “from our house”.',
    options: [
      arabic('مِنْ بَيْتِنَا', 'min baytinā'),
      arabic('فِي بَيْتِنَا', 'fī baytinā'),
      arabic('إِلَى بَيْتِنَا', 'ilā baytinā'),
    ],
    answer: 0,
    explanation:
      'Min means from. Min, fī and ilā all use the i form here; changing the first word changes the relationship.',
  },
  {
    id: 'to-her-house',
    topic: 'In, from or to?',
    prompt: 'Choose “to her house”.',
    options: [
      arabic('إِلَى بَيْتِهِ', 'ilā baytihi'),
      arabic('إِلَى بَيْتِهَا', 'ilā baytihā'),
      arabic('مِنْ بَيْتِهَا', 'min baytihā'),
    ],
    answer: 1,
    explanation:
      'Ilā means to, the i fits after ilā, and hā means her. Unlike his hu/hi, her hā stays hā.',
  },
  {
    id: 'saw-our-house',
    topic: 'How does it fit?',
    prompt: 'Complete “I saw our house”.',
    options: [
      arabic('رَأَيْتُ بَيْتِنَا', 'raʾaytu baytinā'),
      arabic('رَأَيْتُ بَيْتُنَا', 'raʾaytu baytunā'),
      arabic('رَأَيْتُ بَيْتَنَا', 'raʾaytu baytanā'),
    ],
    answer: 2,
    explanation:
      'Our house is the thing I saw, so this ordinary singular noun takes a: raʾaytu bayt-a-nā.',
  },
  {
    id: 'my-hidden-vowel',
    topic: 'The ī ending',
    prompt: 'How does “my house” change after fī?',
    options: [
      arabic('بَيْتِي ← فِي بَيْتِي', 'baytī → fī baytī'),
      text('Add another n: baytinī'),
      text('Change “my” to “our”'),
    ],
    answer: 0,
    explanation:
      'My house stays baytī. Its ī ending means you do not hear a separate case vowel. No extra n is added.',
  },
  {
    id: 'your-man',
    topic: 'Who are you speaking to?',
    prompt: 'Say “in your house” to one man.',
    options: [
      arabic('فِي بَيْتِكِ', 'fī baytiki'),
      arabic('فِي بَيْتِكَ', 'fī baytika'),
      arabic('فِي بَيْتِهِ', 'fī baytihi'),
    ],
    answer: 1,
    explanation:
      'Ka means your when speaking to one man. The i just before ka comes from fī: bayt-i-ka.',
  },
  {
    id: 'your-woman',
    topic: 'Who are you speaking to?',
    prompt: 'Say “in your house” to one woman.',
    options: [
      arabic('فِي بَيْتِهَا', 'fī baytihā'),
      arabic('فِي بَيْتِكَ', 'fī baytika'),
      arabic('فِي بَيْتِكِ', 'fī baytiki'),
    ],
    answer: 2,
    explanation:
      'Ki means your when speaking to one woman. Hā would mean her, talking about someone rather than addressing her.',
  },
  {
    id: 'the-house',
    topic: 'Which one?',
    prompt: 'What does adding al- do in الْبَيْتُ?',
    promptArabic: 'الْبَيْتُ',
    promptLatin: 'al-baytu',
    options: [
      text('It means the house.'),
      text('It means our house.'),
      text('It means two houses.'),
    ],
    answer: 0,
    explanation:
      'Al- identifies the house: the house. An owner ending such as nā does a different job.',
  },
  {
    id: 'no-double-definite',
    topic: 'Which one?',
    prompt: 'Which form correctly says “my book”?',
    options: [
      arabic('الْكِتَابِي', 'al-kitābī'),
      arabic('كِتَابِي', 'kitābī'),
      arabic('كِتَابُنَا', 'kitābunā'),
    ],
    answer: 1,
    explanation:
      'The ī ending already identifies whose book. Do not add al- as well when building this ordinary possessive noun.',
  },
  {
    id: 'school-ending',
    topic: 'A spelling change',
    prompt: 'Choose “my school”.',
    options: [
      arabic('مَدْرَسَتُهَا', 'madrasatuhā'),
      arabic('مَدْرَسَتُنَا', 'madrasatunā'),
      arabic('مَدْرَسَتِي', 'madrasatī'),
    ],
    answer: 2,
    explanation:
      'School ends in ة when it stands alone. Before an owner ending it is written ت: madrasat + ī = madrasatī.',
  },
  {
    id: 'two-books',
    topic: 'How many?',
    prompt: 'Choose “two books” in the ordinary naming form.',
    options: [
      arabic('كِتَابَانِ', 'kitābāni'),
      arabic('كِتَابٌ', 'kitābun'),
      arabic('كُتُبٌ', 'kutubun'),
    ],
    answer: 0,
    explanation:
      'Kitābāni means exactly two books. Kitābun is one book. Kutubun is the plural, books.',
  },
  {
    id: 'matching-books',
    topic: 'Words that match',
    prompt: 'Choose “These are my books”.',
    options: [
      arabic('هَذَا كُتُبِي', 'hādhā kutubī'),
      arabic('هَذِهِ كُتُبِي', 'hādhihi kutubī'),
      arabic('هَذَا كِتَابِي', 'hādhā kitābī'),
    ],
    answer: 1,
    explanation:
      'Books are a plural group of things, so Arabic normally uses feminine-singular matching: hādhihi kutubī.',
  },
  {
    id: 'we-wrote',
    topic: 'Who did it?',
    prompt: 'Choose “we wrote”.',
    options: [
      arabic('كَتَبَ', 'kataba'),
      arabic('كَتَبْتُ', 'katabtu'),
      arabic('كَتَبْنَا', 'katabnā'),
    ],
    answer: 2,
    explanation:
      'Katabnā means we wrote. In this particular past verb form, nā marks the people doing the writing.',
  },
  {
    id: 'he-writes',
    topic: 'When?',
    prompt: 'Choose “he writes / he is writing”.',
    options: [
      arabic('يَكْتُبُ', 'yaktubu'),
      arabic('كَتَبَ', 'kataba'),
      arabic('نَكْتُبُ', 'naktubu'),
    ],
    answer: 0,
    explanation:
      'Yaktubu is he writes or he is writing. Kataba is he wrote. Naktubu changes the person to we.',
  },
  {
    id: 'future-writing',
    topic: 'Beginnings matter',
    prompt: 'Choose “we will write”.',
    options: [
      arabic('كَتَبْنَا', 'katabnā'),
      arabic('سَنَكْتُبُ', 'sanaktubu'),
      arabic('نَكْتُبُ', 'naktubu'),
    ],
    answer: 1,
    explanation:
      'Sa- points to the future. Naktubu means we write; sa-naktubu means we will write.',
  },
  {
    id: 'meaning-vs-role',
    topic: 'What actually changed?',
    prompt: 'Baytunā becomes baytinā after fī. What stayed the same?',
    options: [
      text('The sentence must still mean “this is”.'),
      text('The word now means “her house”.'),
      text('It is still our house; its sentence role changed.'),
    ],
    answer: 2,
    explanation:
      'Bayt still means house and nā still means our. The vowel shows how the house fits the surrounding words. Fī adds the meaning in.',
  },
];

export const PRACTICE_STORAGE_KEY = 'jic-arabic-practice-v1';
const questionIds = new Set(PRACTICE_QUESTIONS.map((question) => question.id));

export function readPracticeProgress(storage) {
  try {
    const stored = JSON.parse(storage?.getItem(PRACTICE_STORAGE_KEY) || 'null');
    if (stored?.version !== 1 || !Array.isArray(stored.mastered)) return [];
    return [...new Set(stored.mastered.filter((id) => questionIds.has(id)))];
  } catch {
    return [];
  }
}

export function writePracticeProgress(storage, mastered) {
  try {
    if (!storage) return false;
    storage.setItem(
      PRACTICE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        mastered: [...new Set(mastered.filter((id) => questionIds.has(id)))],
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function createPracticeRound(mastered = [], round = 0) {
  const known = new Set(mastered);
  const rotation = (Math.max(0, round) * 6) % PRACTICE_QUESTIONS.length;
  const rotated = [...PRACTICE_QUESTIONS.slice(rotation), ...PRACTICE_QUESTIONS.slice(0, rotation)];
  const unseen = rotated.filter((question) => !known.has(question.id));
  const review = rotated.filter((question) => known.has(question.id));
  // Most of a round is new material, with one familiar pattern returning when available.
  const selected = [...unseen.slice(0, 5), ...review.slice(0, 1)];
  for (const question of [...unseen, ...review]) {
    if (selected.length >= 6) break;
    if (!selected.some((item) => item.id === question.id)) selected.push(question);
  }
  return selected.map((question) => question.id);
}
