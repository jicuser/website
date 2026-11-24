# Arabic playground: grammar and vocabulary scope

This is a deterministic learning builder for selected Standard/Classical Arabic patterns. It is not a free-text translator, a complete parser, or a promise that an arbitrary Arabic word can be inflected with the same rules.

## Supported combinations

- 26 curated nouns, with singular and dual forms. 25 also have a recorded plural. `laylah` deliberately excludes its special final-y plural rather than inventing one.
- Twelve attached-owner choices, plus no owner. English labels distinguish the person being addressed from the gender of the noun.
- The contexts “this is”, “in”, “from”, “to”, “I saw”, and a standalone comparison form.
- Ordinary singular and broken-plural endings; the first-person singular possessive; tāʾ marbūṭah; selected diptote plurals; sound feminine and masculine plurals; and dual forms, including the merged first-person endings.
- Eight sound Form I verbs with recorded past/present middle vowels. Thirteen person choices represent all distinct person/gender/number combinations needed here: the second-person dual is shared by both genders.
- Past, present, future with `sa-`, negative present with `lā`, and negative past with `mā`.
- Number/gender-appropriate demonstratives. For a definite predicate, a separating pronoun makes “This is the house” explicit.

`buildNoun`, `buildVerb`, and `getAvailableNumbers` reject unknown or unsupported selections. Each result provides a complete Arabic string and a complete transliteration, exact joinable coloured segments, ordered English parts, and short explanations. The form's underlying case is distinct from its visible ending: for example, the sound feminine plural can have an underlying object role while showing `i`.

## Teaching decisions

1. The word `baytunā` is analysed as `bayt + u + nā`. The `t` belongs to the word for house. It is not part of “our”, “my”, or “your”.
2. A changed case vowel normally changes how a noun fits into a sentence, not its dictionary meaning. The UI changes a whole supporting example instead of suggesting that arbitrary vowel substitutions always create a valid sentence.
3. The first-person ending `ī` occupies the visible ending for the regular nouns here. Do not show `baytuī`, `baytiī`, or an additional case sound.
4. Possession is labelled “Whose?” and explained as ownership **or association**. A person, day, or idea is not excluded simply because it is not property.
5. An owner already makes these noun phrases definite. Adding an owner suppresses both `al-` and tanwīn.
6. The h-vowel in `hu/humā/hum/hunna` changes after an i-sound or unvowelled y. `hā` does not make the same change.
7. Plural forms and verb middle vowels are stored facts. They are not guessed from a root.
8. A plural of nonhuman things normally takes a feminine singular demonstrative in these examples. A human plural uses `hāʾulāʾ`.
9. Formal terms remain optional. The primary explanations use “who”, “whose”, “two”, “the thing I saw”, and “after in/from/to”.
10. The transliteration displays learning pieces and full endings. It is not a phonetic transcription of every connected-speech or pausal change. The joined Arabic remains the authoritative displayed form.

## Deliberate boundaries

The builder does not support arbitrary pasted words, weak/geminate/hamzated verb conjugation, noun roots as a generative dictionary, all derived verb forms, arbitrary adjective agreement, free word order, or every Classical/Quranic reading. It does not rewrite Quran verses. Browser speech, when offered by the interface, is device-generated speech rather than a recitation or a pronunciation certification.

The internal-verb vowel rules and attached possessives should not be conflated. For example, `nā` in the selected past subject form means “we”, but attached `nā` in other verb constructions may mean “us”.

The noun `āyah` is glossed “sign” here, with a note that it also means a verse in an appropriate context. `sūrah` is glossed as a Quran chapter. The examples are original practice phrases, not Quran quotations.

## References checked

These are grammar references; the explanations and example matrix in this feature are newly written. No dictionary pages or proprietary lexicon were copied.

- Al Jazeera Learning Arabic, [Attached pronouns](https://learning.aljazeera.net/ar/node/19503): owner suffix inventory, gender/number distinctions, and ة becoming ت before suffixes.
- Al Jazeera Learning Arabic, [Iḍāfah / annexation](https://learning.aljazeera.net/ar/node/19501): association as well as ownership; loss of tanwīn and dual/sound-masculine n when annexed.
- Quranic Arabic Corpus, [Possessive construction](https://corpus.quran.com/documentation/possessiveconstruction.jsp): exclusion of `al-` and tanwīn from the head; the head noun's own role still determines its case.
- Quranic Arabic Corpus, [Preposition phrases](https://corpus.quran.com/documentation/prepositionphrase.jsp): prepositions govern the genitive and may be separate words or prefixes.
- Al Jazeera Learning Arabic, [Noun attached to the speaker's yāʾ](https://learning.aljazeera.net/ar/node/122): the case vowel need not appear when the noun carries the first-person possessive.
- Al Jazeera Learning Arabic, [The hāʾ pronoun after kasrah/yāʾ](https://learning.aljazeera.net/en/node/21999): the ordinary sound change and why Quranic reading exceptions should not be overwritten by a general rule.
- Al Jazeera Learning Arabic, [Dual endings](https://learning.aljazeera.net/ar/node/19692): `āni/ayni` and the loss of n in annexation.
- Al Jazeera Learning Arabic, [Sound feminine plural](https://learning.aljazeera.net/ar/node/531): `i` in both object and after-preposition positions.
- Al Jazeera Learning Arabic, [Sound masculine plural with “my”](https://learning.aljazeera.net/ar/node/329): merger into `-iyya`.
- Al Jazeera Learning Arabic, [Gender and agreement](https://learning.aljazeera.net/ar/node/961): demonstratives and nonhuman plural agreement.
- Al Jazeera Learning Arabic, [Verb forms/times](https://learning.aljazeera.net/ar/node/19444) and [verbs](https://learning.aljazeera.net/ar/node/19701): past/present/command distinction and differing stem vowels.
- Al Jazeera Learning Arabic, [Question words](https://learning.aljazeera.net/ar/node/19499): ordinary positive `hal` questions.
- King Salman Global Academy for Arabic Language, [linguistic correction study](https://library.ksaa.gov.sa/links/epubs/Altsswib_Allghawy.pdf): Classical `hal` takes an affirmative clause; interrogative hamza is used for negative questions. Basic sentence builders should not mechanically prepend `hal` to negative forms.

## Quran vocabulary and licensing

The existing site's Quran feature can remain a separate reading/source route. Source text should remain unchanged; practice forms should be labelled as generated learning examples.

- [Tanzil text licence](https://tanzil.net/docs/Text_License) permits verbatim distribution with attribution, a link, and the notice; it explicitly disallows changing its text.
- [Quranic Arabic Corpus download terms](https://corpus.quran.com/download/) require its source/notice/link and describe verbatim distribution. Its FAQ also discusses research/noncommercial use. Do not assume this permits unrestricted redistribution or modification of the entire annotation database.
- [Quran Foundation API documentation](https://api-docs.quran.foundation/docs/content_apis_versioned/4.0.0/verses-by-chapter-number/) exposes word-level fields. API credentials, resource terms, and storage conditions must be checked before a new integration; the core builder requires no API.
- Hans Wehr has not been imported or represented as freely reusable. A dictionary would add word meanings; it would not replace the inflection and sentence rules above.

## Verification

Run `node --test tests/arabic-grammar.test.mjs`.

The tests include independent exact Arabic/Latin examples for the learner's original confusions, possessives, duals, three plural families, demonstratives, all person forms of `kataba`, the recorded verb stem pairs, and negation. A bounded sweep checks exact segment assembly and invalid combinations across 12,012 noun settings and 520 verb settings. This sweep verifies structural invariants; it is not a claim of independent scholarly review of every generated sentence.
