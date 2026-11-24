/**
 * Source-preserving model for the pre-shaped Arabic glyph atlas.
 *
 * Every path points to its ORIGINAL Unicode character, not its Unicode grapheme
 * cluster. That distinction lets a vowel have a different colour from its base
 * without breaking Arabic joining. Letter dots/hamza retain the letter's colour.
 */
export const HARAKAT = Object.freeze({
  '\u064e': { id: 'fatha', name: 'Fatḥa', sound: 'a', colour: 'fatha' },
  '\u064f': { id: 'damma', name: 'Ḍamma', sound: 'u', colour: 'damma' },
  '\u0650': { id: 'kasra', name: 'Kasra', sound: 'i', colour: 'kasra' },
  '\u064b': { id: 'fathatan', name: 'Two fatḥas', sound: 'an', colour: 'fatha' },
  '\u064c': { id: 'dammatan', name: 'Two ḍammas', sound: 'un', colour: 'damma' },
  '\u064d': { id: 'kasratan', name: 'Two kasras', sound: 'in', colour: 'kasra' },
  '\u0651': { id: 'shadda', name: 'Shadda', sound: 'double this letter', colour: 'shadda' },
  '\u0652': { id: 'sukun', name: 'Sukūn', sound: 'no vowel after this letter', colour: 'sukun' },
  '\u0670': { id: 'dagger-alif', name: 'Small alif', sound: 'ā', colour: 'fatha' },
});

const DEFAULT_COLOURS = {
  context: 'context',
  particle: 'context',
  article: 'context',
  stem: 'stem',
  root: 'stem',
  case: 'case',
  vowel: 'case',
  prefix: 'owner',
  ending: 'owner',
  owner: 'owner',
  subject: 'owner',
  suffix: 'owner',
  person: 'owner',
  number: 'number',
};

export const glyphColourFor = (id) => DEFAULT_COLOURS[id.split(':').at(-1)] || 'stem';

const combineBounds = (bounds, next) =>
  bounds
    ? [
        Math.min(bounds[0], next[0]),
        Math.min(bounds[1], next[1]),
        Math.max(bounds[2], next[2]),
        Math.max(bounds[3], next[3]),
      ]
    : next;

function hitBounds(bounds, mark) {
  const [left, top, right, bottom] = bounds;
  const width = Math.max(right - left + 70, mark ? 300 : 170);
  const height = Math.max(bottom - top + 60, mark ? 270 : 160);
  return [(left + right - width) / 2, (top + bottom - height) / 2, width, height];
}

function characterOffsets(text) {
  let offset = 0;
  return Array.from(text, (character) => {
    const entry = { character, offset };
    offset += character.length;
    return entry;
  });
}

/**
 * The model always retains result.arabic byte-for-byte. Unknown words render as
 * plain whole words, and a stale/mismatched segmentation falls back to the entire
 * original phrase. No shaping hints, joiners or substitute characters are added.
 */
export function buildGlyphModel(result, atlas, colourFor = glyphColourFor) {
  const text = result?.arabic || '';
  const segments = result?.segments?.length
    ? result.segments
    : [{ id: 'stem', arabic: text, label: 'Arabic word', meaning: '' }];
  if (segments.map((segment) => segment.arabic).join('') !== text) {
    return { text, mode: 'plain', fallbackReason: 'segment-mismatch', tokens: [] };
  }

  let offset = 0;
  const ranges = segments.map((segment) => {
    const range = { segment, start: offset, end: offset + segment.arabic.length };
    offset = range.end;
    return range;
  });
  const segmentAt = (index) =>
    ranges.find((range) => range.start <= index && index < range.end)?.segment;
  let missing = 0;
  const tokens = Array.from(text.matchAll(/\s+|\S+/gu), (run) => {
    if (/^\s/u.test(run[0])) return { type: 'space', text: run[0], start: run.index };
    // Keep attached punctuation in the same unbreakable run as the word.
    const items = Array.from(
      run[0].matchAll(/[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]/gu),
      (match) => {
        const word = match[0];
        const start = run.index + match.index;
        const shaped = atlas.words[word];
        if (!shaped) {
          missing += 1;
          return {
            type: 'fallback',
            text: word,
            start,
            partId: segmentAt(start)?.id || 'stem',
            colour: colourFor(segmentAt(start)?.id || 'stem'),
          };
        }
        const characters = characterOffsets(word);
        const groups = new Map();
        for (const [glyphId, x, y, source] of shaped[1]) {
          const outline = atlas.glyphs[glyphId];
          if (!outline[0] || !outline[1]) continue;
          const { character, offset: sourceOffset } = characters[source];
          const sourceIndex = start + sourceOffset;
          const segment = segmentAt(sourceIndex);
          const mark = HARAKAT[character] || null;
          if (!groups.has(source))
            groups.set(source, {
              sourceIndex,
              character,
              partId: segment?.id || 'stem',
              label: segment?.label || 'Arabic word',
              meaning: segment?.meaning || '',
              colour: mark?.colour || colourFor(segment?.id || 'stem'),
              mark,
              paths: [],
              bounds: null,
            });
          const group = groups.get(source);
          group.paths.push({ glyphId, d: outline[0], x, y });
          group.bounds = combineBounds(group.bounds, [
            outline[1][0] + x,
            outline[1][1] + y,
            outline[1][2] + x,
            outline[1][3] + y,
          ]);
        }
        const characterGroups = [...groups.values()].map((group) => ({
          ...group,
          hitBox: hitBounds(group.bounds, group.mark),
        }));
        // Draw base-letter targets first. Mark targets are on top and therefore
        // receive taps even when their generous bounds approach the letter.
        characterGroups.sort((a, b) => Number(Boolean(a.mark)) - Number(Boolean(b.mark)));
        return { type: 'shaped', text: word, start, width: shaped[0], groups: characterGroups };
      },
    );
    return { type: 'run', text: run[0], start: run.index, items };
  });
  return {
    text,
    mode: missing ? 'mixed' : 'shaped',
    missing,
    units: atlas.units,
    top: atlas.top,
    bottom: atlas.bottom,
    tokens,
  };
}
