# Learn Arabic playground

The public learning tool lives at `/learning/arabic`. It belongs to **Read & Learn**, the online-resource home at `/worship`, and is also linked from the Quran reader. `/education/arabic` redirects to the canonical address. Education remains the place for mosque classes, courses, Madrassah and enrolment. The tool loads lazily and uses the existing website theme, navigation, page metadata and focused-task layout.

A small rounded **Read & Learn** invitation appears on the homepage after eight seconds and offers separate **Read now** and **Learn Arabic** actions, plus an × close button. Read now opens the first visible reader, normally the Qur’an; Learn Arabic opens the playground. Actions respect their destination’s visibility and the overview’s visibility, and either action remembers dismissal on the current device. The invitation keeps the earlier dismissal preference, is nonmodal, does not move keyboard focus, and stays clear of the installed-app controls. Existing notices and open dialogs take priority. It is absent from Education, reading and learning pages, CMS previews and editing mode. If browser storage is blocked, dismissal still lasts for the current visit.

## Reading, learning and mosque services

The Read & Learn home has two primary choices: **Read**, containing the Qur’an and Adhkar readers, and **Learn Arabic**, opening the playground. Prayer guides and Dala’il al-Khayrat programme information are secondary. The Dala’il page remains information about reading sessions and contacting the centre; it is not advertised as an online text reader. All original reader addresses and functionality are retained.

`src/content/readLearn.js` owns `READ_LEARN_RESOURCES` and `getVisibleReadLearnResources(getContent)`. Its categories are `read`, `learn` and `guide`; Dala’il carries the additional `kind: 'programme'` label. Visibility is evaluated for the overview and each destination at render time. These resources are separate from `SERVICE_CATALOG`, which describes mosque services, classes, participation and account access. Community Hub keeps seven service groups and offers a smaller Read & Learn website-resource link outside that service grid.

The menu keeps its six ordinary rows. Above them, **Read & Learn — Use online** and **Education — Classes at JIC** distinguish tools from classes. Read & Learn also has a direct desktop menu. These navigation shortcuts respect configured names, order, page placement and visibility. The Arabic page’s own section link follows its visible configured parent. Existing fallback programme links open the programme directory instead of the online-resource home.

## Learning experience

- **A word:** starts with one standalone pointing word, **هذا / هذه**, with This / That and masculine / feminine choices. Things adds a searchable noun and an owner. Actions offers six common people and two times: Now / usually and Past. Every letter and mark has a source-specific explanation; “Look inside” provides the same choices through native keyboard controls. “Use in a sentence” keeps the selected word, owner, person, tense or demonstrative agreement.
- **A sentence:** follows the complete example into its actual words and attached pieces. Curved links show containment; optional arrows explain a particular relationship, such as `fī → i` or `hu → hi`. Only one branch and one compact chooser expand at a time. “More sentence patterns” contains descriptions, location phrases, activities and positive questions.
- **Quick tables:** small table icons open an inline reference for sounds, owner endings, this/that or common present/past pairs. The sounds table circles the intended real mark in its complete example. The grammar guide remains available from the table footer, with its twelve plain-language topics and example shortcuts.
- **Practise:** twenty original questions in rounds of six. Missed questions return later. Explanations appear after every answer.

The standalone word view uses one result surface, a short note and nearby controls. Vocabulary/owner/person choices open directly beneath their controls and close after a selection; sound inspection opens beneath “Look inside”. The larger sentence explorer retains its result above the connected branches. Neither view uses a modal backdrop or focus trap. Escape and close buttons restore the relevant opener. Device storage keeps validated word selections and practice progress with a usable fallback when storage is unavailable.

`arabic-studio.css` scopes the flatter layout, sans-serif English headings, restrained surfaces and smaller controls to this learning feature. Light/dark palettes retain independently coloured Arabic letters and marks. The Arabic page omits the duplicate section-picker and link rail; its compact Read & Learn link and global navigation remain available.

The word-part colours are green for beginnings/connectors, blue for the core meaning, pink for who/whose, and purple for number. Individual vowel marks have separate colours: amber for ḍamma/u, orange for fatḥa/a, and teal for kasra/i, including their doubled forms. Sukūn and shadda are also distinguished. The actual Arabic marks are coloured independently of their joined letters, across the word view, sentence view, references and practice. Larger labelled pronunciation-piece buttons provide equivalent accessible targets. The colour guide and form explanations are collapsed until requested.

The small vowel chooser changes the sentence around the noun as well as its ending, preserving a valid example. Tapping an internal word vowel opens vocabulary choices and explains that the sound belongs to that word; it does not imply that arbitrary spelling changes are valid. See [Arabic glyph rendering](arabic-glyphs.md) for the source-preserving local renderer and its generation/check workflow.

The **Listen** control uses an available Arabic voice on the visitor's own device. It explains when no suitable voice exists. It is not Quran recitation and is not a guarantee of scholarly pronunciation.

## Coverage and constraints

There are 80 curated nouns, 14 sound Form I verbs, 13 owner selections including no owner, 13 person selections and 5 time/negation options. See [grammar scope and primary references](arabic-grammar.md) for the exact rules and deliberate limits.

The sentence studio offers five activities that work without a direct-object slot: write, study, drink, sit and go out. It offers selected place relationships that suit those patterns. The other recorded actions remain available in word study and the sentence explorer. The app is not an unrestricted translator; it does not claim that every conceivable English thought can be expressed with these templates.

Positive questions use `hal`. Negative questions require a different construction and are not offered by this first guided sentence pattern. The app explains this constraint and returns to a statement when a negative time option is selected. Changing a case vowel changes the supporting sentence too; it never presents an arbitrary contradictory vowel choice as valid.

The core tool needs no network service, dictionary account or new database tables. It uses original practice examples and links to the site's original Quran reader. No Hans Wehr dictionary content or Quran morphology dataset is redistributed.

## Implementation and checks

- `src/features/arabic/vocabulary.mjs`: recorded vocabulary and option definitions.
- `src/features/arabic/grammar.mjs`: deterministic noun and verb forms with exact display segments and explanations.
- `src/features/arabic/sentences.mjs`: bounded sentence composition and English question order.
- `ArabicPlayground.jsx`, `GuidedWordStudy.jsx`, `ArabicQuickReference.jsx`, `ArabicStructureExplorer.jsx`, `ArabicControls.jsx`, `SentenceBuilder.jsx`: guided study, reference tables, editing and display.
- `guidedWordData.mjs`: fixed pointing words, source-based sound notes, normalised vocabulary search and canonical table examples.
- `GrammarExplorer.jsx`, `PracticePanel.jsx`, `learningContent.mjs`: lessons, repeat practice and storage validation.
- `src/features/arabic/arabic-playground.css`: scoped layout, colour system, compact choice trays and light/dark rendering. Imported by `ArabicPlayground.jsx`, so it loads only with the Arabic page. Sentence-specific layout lives in `src/features/arabic/sentence-builder.css`.

Run the grammar, sentence and learning tests with:

```sh
node --test tests/arabic-grammar.test.mjs tests/arabic-sentences.test.mjs tests/arabic-learning.test.mjs tests/arabic-glyphs.test.mjs tests/arabic-guided-data.test.mjs tests/arabic-guided-word-study.test.mjs
```

The grammar tests include independent expected Arabic forms and assembly checks across 53,352 noun configurations and 910 verb configurations. Those assembly checks are structural verification, not independent linguistic review of every possible phrase. Navigation, search, aliases and page previews also have integration coverage.

Use `npm run validate` for repository checks and a production build. Local browser verification uses test-only public backend settings; it does not prove live Supabase or hosting configuration. Phone layouts can be checked at 320 and 390 pixels alongside the desktop layout.

## Publication

This is an additive frontend feature. It requires no database migration, environment variable or change to existing permissions. Publish through the existing JIC Hostinger release process in [WEBSITE-RELEASE.md](WEBSITE-RELEASE.md). A GitHub commit or pull request is not evidence of a completed Hostinger deployment. Do not deploy a local validation build made with the fake CI backend settings.
