# Arabic letters and independently coloured harakat

`ArabicGlyphs` draws the learning playground's checked Arabic words as local SVG
outlines. Each word was shaped as a complete word with HarfBuzz and the repository's
Noto Naskh Arabic font. Joining, lam–alif forms, mark placement and letter dots are
therefore calculated by the font's own shaping rules. The browser paints each
resulting path separately, so a ḍamma can be gold while the joined ت below it stays
blue.

No runtime shaping library, remote font, network rendering API, inserted joiner or
substituted Arabic character is used. The exact original Arabic remains the source
for speech, accessible text and copying. A word absent from the checked atlas is
shown as normal, complete Arabic text; it is never omitted or split into guessed
letter forms.

## Component contract

```jsx
import ArabicGlyphs from './ArabicGlyphs.jsx';

<ArabicGlyphs
  result={result}
  onPartClick={(segmentId, character) => openChoices(segmentId, character)}
  selectedPart={selectedPart}
  colourFor={colourFor}
/>;
```

`result.arabic` is the exact source. `result.segments` is the existing grammar-engine
array. An example can supply only `{ arabic: example.ar }`; its letters are then
assigned to `stem`, while its vowel marks retain their individual colours. Segment
text must concatenate exactly to `result.arabic`; otherwise the whole original
phrase is shown as plain text.

The optional second callback argument is:

```js
{ character: 'ُ', mark: 'damma', sourceIndex: 5, word: 'بَيْتُنَا' }
```

`sourceIndex` is the character's UTF-16 position in the full original Arabic, as
used by JavaScript strings. A letter's `mark` is `null`. A native-text fallback
returns only `{ word }`. The first callback argument always remains the original
segment ID, including sentence scopes such as `place:case`.

The SVG is an additional pointer interface, with expanded transparent targets
around the small marks. The surrounding result's large semantic buttons remain
the keyboard and touch alternative; the vector paths are hidden from assistive
technology to avoid reading duplicated letters or dozens of unlabeled shapes.
The component exposes the complete original Arabic through actual screen-reader
text, and its copy handler writes that original string. It does not replace the
existing device-speech control.

### Styling hooks

- `.arabic-glyph-group` contains the paths belonging to one original character.
- `.arabic-letter` includes the letter's dots and any hamza components.
- `.arabic-haraka` identifies a real separate Unicode mark.
- `.arabic-mark-fatha`, `.arabic-mark-damma`, `.arabic-mark-kasra`,
  `.arabic-mark-fathatan`, `.arabic-mark-dammatan`, `.arabic-mark-kasratan`,
  `.arabic-mark-shadda`, and `.arabic-mark-sukun` identify the mark shape.
- `.arabic-colour-fatha|damma|kasra|shadda|sukun` supplies mark colours. The three
  tanwin shapes use their corresponding vowel colour. Letter groups use the
  supplied `colourFor(segmentId)`.
- `.arabic-glyph-hit` is the expanded rounded hit rectangle;
  `.arabic-glyph-path` is the actual visible outline.
- `.is-selected` follows the current selected segment.
- `data-part`, `data-character`, `data-source-index`, and `data-mark` expose the
  original identity. `data-word` is on each word SVG.
- `data-renderer="mixed"` indicates that at least one token uses plain text.
  `data-renderer-fallback="unknown-word"` marks that visible token. A segmentation
  mismatch produces `data-renderer="plain"` and a `segment-mismatch` reason.

The component inherits font size from its host. SVG dimensions use `em`, share a
common baseline and scale with the site's existing responsive Arabic typography.
Words can wrap at spaces; a following question mark stays attached to its word.

## Generated asset and regeneration

The checked atlas is `src/features/arabic/glyphs/atlas.json`. It is imported only
by this component and therefore travels with the site's lazy Arabic feature.
It is 714,579 bytes raw, 110,332 bytes gzip, with 3,011 word records and 82 shared
outlines at the time this renderer was added. There is no extra runtime package.
Most data is compact numeric glyph positions; outlines are shared between words.

To regenerate after changing bounded vocabulary, inflections or teaching examples:

```sh
python scripts/generate-arabic-glyphs.py
node --test tests/arabic-glyphs.test.mjs
```

Build-time requirements are Node, Python `fontTools`, and the system HarfBuzz
library. The script reads the existing local font and never downloads one. It
enumerates all noun and verb options through the real grammar engine, plus Arabic
examples and options from `GRAMMAR_TOPICS` and `PRACTICE_QUESTIONS`. The practice
comparison arrow `←` deliberately uses normal browser text because the Naskh font
does not contain it. This atlas is bounded learning content, not a general Qur'an
renderer.

The atlas stores its source-font SHA-256 and the complete copyright/OFL notice
from `scripts/fonts/OFL.txt`. The derived font outlines retain that license.

### Shaping details that must stay correct

HarfBuzz is run with character-level clusters so a combining mark's original
character position survives reordering. Its shaped positions are retained exactly.
Font `GDEF` mark classes cannot identify vowels: this Noto font also decomposes
letter dots and hamza into mark-class glyphs. Classification therefore uses the
original Unicode character, never the font's glyph class.

Noto's `ccmp` substitutions sometimes combine shadda with kasra or tanwin in one
outline. The generator partitions that outline's existing contours into the two
original marks. Their coordinates remain unchanged. It checks the expected
contour structure and fails if a different font needs review. In particular, a
kasra drawn below shadda above a letter is not incorrectly moved below the base
letter.

Focused tests cover the original baytunā colouring failure, separate case/owner
kasras, combined marks, letter dots and hamza, lam–alif joining, scoped sentence
parts, punctuation, exact-text fallback, the full bounded vocabulary, and every
vowel's source mapping. Coverage fails when a new emitted Arabic word needs an
atlas regeneration.

## Technical references

- [HarfBuzz: working with clusters](https://harfbuzz.github.io/working-with-harfbuzz-clusters.html)
  explains source-character mapping, mark merging and the different cluster levels.
- [HarfBuzz: cluster level 2](https://harfbuzz.github.io/level-2.html)
  describes character-level cluster values when marks are reordered.
- [HarfBuzz: buffer and glyph information](https://harfbuzz.github.io/harfbuzz-hb-buffer.html)
  documents the source clusters and shaped glyph records used by the generator.
- [fontTools: SVGPathPen](https://fonttools.readthedocs.io/en/latest/pens/svgPathPen.html)
  documents drawing the local glyph outlines as SVG paths and the coordinate flip
  between font and SVG drawing systems.
- [Noto Arabic font sources](https://github.com/notofonts/arabic)
  identifies the source project; the bundled `scripts/fonts/OFL.txt` is the actual
  license notice distributed with this repository's font.
