# Learn Arabic playground

The public learning tool lives at `/learning/arabic`. It belongs to **Read & Learn**, the online-resource home at `/worship`, and is also linked from the Quran reader. `/education/arabic` redirects to the canonical address. Education remains the place for mosque classes, courses, Madrassah and enrolment. The tool loads lazily and uses the existing website theme, navigation, page metadata and focused-task layout.

A small rounded **Read & Learn** invitation appears on the homepage after eight seconds and offers separate **Read now** and **Learn Arabic** actions, plus an × close button. Read now opens the first visible reader, normally the Qur’an; Learn Arabic opens the playground. Actions respect their destination’s visibility and the overview’s visibility, and either action remembers dismissal on the current device. The invitation keeps the earlier dismissal preference, is nonmodal, does not move keyboard focus, and stays clear of the installed-app controls. Existing notices and open dialogs take priority. It is absent from Education, reading and learning pages, CMS previews and editing mode. If browser storage is blocked, dismissal still lasts for the current visit.

## Reading, learning and mosque services

The Read & Learn home has two primary choices: **Read**, containing the Qur’an and Adhkar readers, and **Learn Arabic**, opening the playground. Prayer guides and Dala’il al-Khayrat programme information are secondary. The Dala’il page remains information about reading sessions and contacting the centre; it is not advertised as an online text reader. All original reader addresses and functionality are retained.

`src/content/readLearn.js` owns `READ_LEARN_RESOURCES` and `getVisibleReadLearnResources(getContent)`. Its categories are `read`, `learn` and `guide`; Dala’il carries the additional `kind: 'programme'` label. Visibility is evaluated for the overview and each destination at render time. These resources are separate from `SERVICE_CATALOG`, which describes mosque services, classes, participation and account access. Community Hub keeps seven service groups and offers a smaller Read & Learn website-resource link outside that service grid.

The menu keeps its six ordinary rows. Above them, **Read & Learn — Use online** and **Education — Classes at JIC** distinguish tools from classes. Read & Learn also has a direct desktop menu. These navigation shortcuts respect configured names, order, page placement and visibility. The Arabic page’s own section link follows its visible configured parent. Existing fallback programme links open the programme directory instead of the online-resource home.

## Learning experience

- **Words:** choose a thing or an action. Tap the joined Arabic or the larger pronunciation pieces below it to open the relevant options. English meaning uses the same colour roles. A change highlights all affected pieces, including the two changes in `baytuhu → fī baytihi`.
- **Sentences:** identify something, say where it is, or combine an activity with a place. Select a noun, owner, number, person or time; add/remove a place or turn a positive statement into a yes/no question. Copy the Arabic, pronunciation and meaning together. Compositions survive switching between learning tabs.
- **Rule map:** twelve plain-language questions connect ownership, word pieces, vowels, number, definiteness, gender, roots, actions and sentence structure. Each topic opens one explanation at a time, with optional grammar terminology and a shortcut to a relevant builder example.
- **Practise:** twenty original questions in rounds of six. Missed questions return later. Explanations appear after every answer. Browser storage keeps validated progress IDs and word selections, with a working session-only fallback when storage is unavailable.

The colour key is consistent: green for beginnings/connectors, blue for the core meaning, amber for how a form fits, pink for who/whose, and purple for number. Text labels and selected/changed states accompany colours. Arabic remains joined; large Latin-piece buttons provide accessible targets for small combining marks. Native dialogs support keyboard focus, Escape and dismissal.

The **Listen** control uses an available Arabic voice on the visitor's own device. It explains when no suitable voice exists. It is not Quran recitation and is not a guarantee of scholarly pronunciation.

## Coverage and constraints

There are 26 curated nouns, 8 sound Form I verbs, 13 owner selections including no owner, 13 person selections and 5 time/negation options. See [grammar scope and primary references](arabic-grammar.md) for the exact rules and deliberate limits.

The sentence studio offers five activities that work without a direct-object slot: write, study, drink, sit and go out. It offers selected place relationships that suit those patterns. Open, hear and enter remain available in the word builder. The app is not an unrestricted translator; it does not claim that every conceivable English thought can be expressed with these templates.

Positive questions use `hal`. Negative questions require a different construction and are not offered by this first guided sentence pattern. The app explains this constraint and returns to a statement when a negative time option is selected. Changing a case vowel changes the supporting sentence too; it never presents an arbitrary contradictory vowel choice as valid.

The core tool needs no network service, dictionary account or new database tables. It uses original practice examples and links to the site's original Quran reader. No Hans Wehr dictionary content or Quran morphology dataset is redistributed.

## Implementation and checks

- `src/features/arabic/vocabulary.mjs`: recorded vocabulary and option definitions.
- `src/features/arabic/grammar.mjs`: deterministic noun and verb forms with exact display segments and explanations.
- `src/features/arabic/sentences.mjs`: bounded sentence composition and English question order.
- `ArabicPlayground.jsx`, `ArabicControls.jsx`, `SentenceBuilder.jsx`: editing and display.
- `GrammarExplorer.jsx`, `PracticePanel.jsx`, `learningContent.mjs`: lessons, repeat practice and storage validation.
- `src/styles/arabic-playground.css`: scoped layout, colour system, responsive sheets and light/dark rendering. Imported through the site's canonical CSS entry point.

Run the grammar, sentence and learning tests with:

```sh
node --test tests/arabic-grammar.test.mjs tests/arabic-sentences.test.mjs tests/arabic-learning.test.mjs
```

The grammar tests include independent expected Arabic forms and assembly checks across 12,012 noun configurations and 520 verb configurations. Those assembly checks are structural verification, not independent linguistic review of every possible phrase. Navigation, search, aliases and page previews also have integration coverage.

Use `npm run validate` for repository checks and a production build. Local browser verification uses test-only public backend settings; it does not prove live Supabase or hosting configuration. Phone layouts can be checked at 320 and 390 pixels alongside the desktop layout.

## Publication

This is an additive frontend feature. It requires no database migration, environment variable or change to existing permissions. Publish through the existing JIC Hostinger release process in [WEBSITE-RELEASE.md](WEBSITE-RELEASE.md). A GitHub commit or pull request is not evidence of a completed Hostinger deployment. Do not deploy a local validation build made with the fake CI backend settings.
