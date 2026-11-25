# Arabic structure explorer

The explorer is a hierarchy of actual source text: **sentence → words → meaningful pieces inside a word**. Its initial sentence is `هَذَا بَيْتِي` / `hādhā baytī` / “This is my house”. It is backed by the existing bounded grammar engine; it does not parse arbitrary Arabic or generate unrecorded words.

## Pure model API

`src/features/arabic/arabicExplorerModel.mjs` exports:

- `INITIAL_EXPLORER_NOUN`: house, my, this, singular, indefinite setting. The owner makes the actual noun definite.
- `EXPLORER_FAMILIES`: Pointing (`this`, `that`), Location (`in`, `from`, `to`), and Actions (`saw`, `opened`, `entered`). These are replacement families, not children in the source tree.
- `buildExplorerModel({ mode = 'noun', noun = {}, verb = {}, result })`: accepts the existing noun/verb selections, and optionally their existing result. Returns `result`, `rootId`, `nodes`, `wordIds`, `structureEdges`, `ruleEdges`, `families`, `mode`, and `state`.
- `getExplorerNodeResult(model, nodeId)`: returns a standard glyph/result object for that node's exact source slice, preserving its segment IDs. Unknown IDs return `null`.
- `explainExplorerMark(model, sourceIndex)`: explains the actual Unicode mark at a **global** source index. Returns `null` for a non-mark. Its result includes the node/word, selector, kind, title/body, relevant rule IDs, and checked full examples.
- `isExplorerContextCompatible(contextId, nounId)`: checks the bounded action/noun compatibility used by the UI.

Nodes have `id`, `kind` (`sentence`, `word`, `part`), `parentId`, `children`, `arabic`, `latin`, `meaning`, `sourceStart`, `sourceEnd`, `segmentIds`, `segments`, `selector`, `familyId`, and `description`. Selectors use the existing control IDs: `stem`, `owner`, `context`, `case`, `number`, `article`, `person`, `tense`, or `null`.

The default tree uses the stable IDs `sentence`, `word:context:0`, `word:noun`, `part:stem`, and `part:owner`. Definite identifying sentences can also contain `word:context:1` for the separating pronoun. Fixed action words have `part:context:stem` and `part:context:ending`. Ordinary verb mode uses `word:verb` and the actual engine part IDs.

## Source and rendering invariants

1. Offsets are half-open UTF-16 ranges into the exact full `model.result.arabic`, matching the glyph renderer's `sourceIndex`. The Arabic source slice equals each node's `arabic` byte for byte.
2. A structural child lies inside its parent, and has exactly one structural parent. The noun's stem and owner are children of the noun word, not direct children of the whole sentence.
3. The initial `baytī` has `bayt + ī`; it has **no separate case node**. Dual-plus-my and sound-masculine-plural-plus-my remain one combined actual ending. There is no duplicated or fabricated ink.
4. Whole words retain the glyph atlas's shaping. For an isolated part card, crop the **original full word's shaped glyphs** using the global range, rather than inserting a joiner or displaying a leading combining mark as a newly shaped word. `getExplorerNodeResult` preserves the exact substring but does not itself provide a new shape for a detached suffix.
5. If using a sliced result's click callback, add its `sourceStart` to the callback's local `sourceIndex` before asking the full model for an explanation.
6. The full Arabic, Latin, and English strings remain unchanged. Only the explorer's fixed action context is refined from the engine's `context` segment into `context:stem` and `context:ending`, so the actual `-tu` and English “I” share the person colour. The base engine and family option results retain their existing `context` segment contract.
7. A vowel is a sound, not a separate English word. For example, the kasra and yāʾ together form the long possessive `ī`; the kasra is not an extra case piece. In `-tu`, the full ending means “I”, not the ḍamma alone.

`structureEdges` contain `{ id, from, to, type: 'structure' }`. `ruleEdges` are separate records with `{ id, from, to, type: 'rule', label, description, effect, sourceIndices, targetSourceIndices }`. The UI should reveal rule arrows as explanations, not draw them as containment. `effect` distinguishes a changed form, a sound change, agreement, and an unchanged visible ending.

For `fī baytihi`, the causal chain is the location word → the noun's kasra → the `hu`/`hi` sound change. The second edge points specifically to the owner's changed vowel. For identifying sentences, the explanation names the noun's **sentence role**; it does not claim that `hādhā` governs a case as a preposition does.

## Added checked forms and compatibility

The farther-away context uses `dhālika` for masculine singular, `tilka` for feminine singular and nonhuman plural, `dhānika` / `tānika` for the two-item subject forms, and `ulāʾika` for human plural. The existing near forms and definite-predicate separating pronouns remain supported. These are the forms for this identifying pattern, not a general demonstrative declension API.

The new fixed first-person past examples are `fataḥtu` (“I opened”) and `dakhaltu` (“I entered”), using the already-recorded sound verbs. `raʾaytu` (“I saw”) remains a fixed checked context; its appearance in the tree does not enable a guessed weak/hamzated conjugation table.

`CONTEXTS[].compatibleNounIds` restricts the learner-facing new action choices:

| Context                           | Checked nouns               |
| --------------------------------- | --------------------------- |
| `opened`                          | door, book, letter          |
| `entered`                         | house, mosque, school, room |
| `saw` and other existing contexts | Existing coverage retained  |

Family options have `id`, `label`, `result`, `patch`, `disabled`, `reason`, and `exampleOnly`. An incompatible action is disabled with a reason. Its result is an explicitly illustrative compatible example; its patch never silently replaces the user's noun. A word-picker change can check compatibility, switch to the pointing pattern, and explain that switch. Merely switching family tabs must not mutate the sentence.

## Primary references checked

These references support the grammar additions; the model, descriptions, and example combinations are original code/content.

- Al Jazeera Learning Arabic, [Demonstrative pronouns](https://learning.aljazeera.net/ar/node/19454): near/far singular, dual and plural inventory, including `ذَانِكَ`, `تَانِكَ`, and `أُولَئِكَ`.
- Al Jazeera Learning Arabic, [Gender and agreement](https://learning.aljazeera.net/ar/node/961): matching pointing forms and the usual feminine-singular agreement for nonhuman plurals.
- Al Jazeera Learning Arabic, [The perfect](https://learning.aljazeera.net/ar/node/19492): past-action forms and the attached `-tu`, `-ta`, `-ti` subject endings.
- Al Jazeera Learning Arabic, [The direct object](https://learning.aljazeera.net/ar/node/19634): the action's object takes the accusative role.
- Al Jazeera Learning Arabic, [Transitivity with a preposition](https://learning.aljazeera.net/ar/node/619): explicitly permits both `دخلت البيتَ` and `دخلت في البيتِ`, supporting the checked direct-entry example and its different noun ending.
- Quranic Arabic Corpus, [Root f-t-ḥ](https://corpus.quran.com/qurandictionary.jsp?q=ftH): the recorded Form I “open” verb and object examples. Practice sentences are not Quran quotations.

The full original scope, possessive exceptions, and licensing boundaries remain in [arabic-grammar.md](arabic-grammar.md). Glyph generation and font attribution remain in [arabic-glyphs.md](arabic-glyphs.md).

## Verification and atlas rebuild

Run the targeted grammar/model tests:

```sh
node --test tests/arabic-grammar.test.mjs tests/arabic-explorer-model.test.mjs
```

After adding canonical word forms, rebuild the existing atlas and check its bounded source coverage:

```sh
python scripts/generate-arabic-glyphs.py
node --test tests/arabic-glyphs.test.mjs
```

The tests independently specify the new forms, check the exact default hierarchy and fused endings, separate structure from cause, verify action/owner colour IDs, exercise disabled action choices, and validate ranges and exact slice assembly across selected noun/verb forms. The existing grammar sweep continues to check all configured settings. None of these structural sweeps is a claim that every possible semantic combination is natural usage.
