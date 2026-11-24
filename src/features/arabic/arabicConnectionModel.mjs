import { HARAKAT } from './arabicGlyphModel.mjs';

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const last = (id) => id.split(':').at(-1);
const scoped = (id, name) =>
  id.includes(':') ? `${id.slice(0, id.lastIndexOf(':') + 1)}${name}` : name;

export function segmentRanges(result) {
  let start = 0;
  return (result.segments || []).map((segment) => {
    const entry = { ...segment, start, end: start + segment.arabic.length };
    start = entry.end;
    return entry;
  });
}

/** English words with no actual counterpart stay unlinked: no a -> al or is -> fi. */
export function meaningConnections(result, targets = {}) {
  const actual = new Set(
    (result.segments || []).filter((part) => part.arabic.trim()).map((part) => part.id),
  );
  return (result.englishParts || [{ id: 'translation', text: result.translation }]).map(
    (part, index) => {
      let requested = own(targets, part.id) ? targets[part.id] : part.id;
      const ending = scoped(part.id, 'ending');
      // Present person information can be shared between a prefix and an ending.
      // The ordinary final -u is id=case and never gets included as a person marker.
      if (!own(targets, part.id) && last(part.id) === 'prefix' && actual.has(ending))
        requested = [part.id, ending];
      if (
        !/[\p{L}\p{N}]/u.test(part.text) ||
        (last(part.id) === 'article' && /^(a|an|some)$/iu.test(part.text.trim()))
      )
        requested = null;
      const targetIds = [
        ...new Set(
          (Array.isArray(requested) ? requested : requested ? [requested] : []).filter((id) =>
            actual.has(id),
          ),
        ),
      ];
      return {
        ...part,
        key: `meaning-${index}-${part.id}`,
        targetIds,
        actionId: targetIds[0] || null,
      };
    },
  );
}

/** Separate the edit meaning from a fused physical Arabic segment. */
export function selectedMeaningConnection(
  connections,
  { selectedPart, selectedMeaningId, rememberedKey } = {},
) {
  const matching = connections.filter((part) => part.targetIds.includes(selectedPart));
  return (
    matching.find((part) => part.id === selectedMeaningId) ||
    matching.find((part) => part.key === rememberedKey) ||
    matching[0] ||
    null
  );
}

export function unmatchedArabicParts(result, connections) {
  const linked = new Set(connections.flatMap((part) => part.targetIds));
  return (result.segments || []).filter(
    (part) => part.id !== 'punctuation' && part.arabic.trim() && !linked.has(part.id),
  );
}

/** Resolve by offset within a segment, so a case u can follow its change to i. */
export function resolveMarkFocus(result, { partId, localOffset, sourceIndex } = {}) {
  const ranges = segmentRanges(result);
  let range = partId
    ? ranges.find((part) => part.id === partId)
    : ranges.find((part) => part.start <= sourceIndex && sourceIndex < part.end);
  if (!range) return null;
  let offset = localOffset;
  if (offset == null && sourceIndex != null) offset = sourceIndex - range.start;
  if (offset == null) offset = range.arabic.search(/[\u064b-\u0652\u0670]/u);
  const index = range.start + offset;
  const character = result.arabic[index];
  if (offset < 0 || index < range.start || index >= range.end || !HARAKAT[character]) return null;
  let letterIndex = index - 1;
  while (letterIndex >= 0 && /\p{M}/u.test(result.arabic[letterIndex])) letterIndex -= 1;
  if (letterIndex < 0 || !/\p{L}/u.test(result.arabic[letterIndex])) return null;
  let after = letterIndex + 1;
  while (after < result.arabic.length && /\p{M}/u.test(result.arabic[after])) after += 1;
  return {
    partId: range.id,
    sourceIndex: index,
    localOffset: offset,
    character,
    mark: HARAKAT[character],
    letterIndex,
    letter: result.arabic[letterIndex],
    grapheme: result.arabic.slice(letterIndex, after),
    after,
  };
}

const textById = (parts, key) => {
  const map = new Map();
  for (const part of parts || [])
    map.set(part.id, `${map.get(part.id) || ''}${part[key] || ''}`.trim());
  return map;
};

function changedCharacterOffsets(before, after) {
  const a = Array.from(before),
    b = Array.from(after);
  const lengths = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1)
    for (let j = b.length - 1; j >= 0; j -= 1)
      lengths[i][j] =
        a[i] === b[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const old = [],
    next = [];
  let i = 0,
    j = 0,
    oldOffset = 0,
    nextOffset = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      oldOffset += a[i++].length;
      nextOffset += b[j++].length;
    } else if (i < a.length && (j === b.length || lengths[i + 1][j] >= lengths[i][j + 1])) {
      if (!/\s/u.test(a[i])) old.push(oldOffset);
      oldOffset += a[i++].length;
    } else {
      if (!/\s/u.test(b[j])) next.push(nextOffset);
      nextOffset += b[j++].length;
    }
  }
  return { old, next };
}

export function compareArabicResults(previous, result) {
  if (!previous)
    return {
      changed: false,
      before: [],
      after: [],
      beforeSources: [],
      afterSources: [],
      beforeMeaning: [],
      afterMeaning: [],
    };
  const old = textById(previous.segments, 'arabic');
  const next = textById(result.segments, 'arabic');
  const oldMeaning = textById(previous.englishParts, 'text');
  const nextMeaning = textById(result.englishParts, 'text');
  const changedKeys = (from, to) => [...from.keys()].filter((id) => from.get(id) !== to.get(id));
  const beforeRanges = new Map(segmentRanges(previous).map((part) => [part.id, part]));
  const afterRanges = new Map(segmentRanges(result).map((part) => [part.id, part]));
  const beforeSources = [],
    afterSources = [];
  for (const id of new Set([...beforeRanges.keys(), ...afterRanges.keys()])) {
    const from = beforeRanges.get(id),
      to = afterRanges.get(id);
    const changed = changedCharacterOffsets(from?.arabic || '', to?.arabic || '');
    if (from) beforeSources.push(...changed.old.map((offset) => from.start + offset));
    if (to) afterSources.push(...changed.next.map((offset) => to.start + offset));
  }
  return {
    changed:
      previous.arabic !== result.arabic ||
      previous.latin !== result.latin ||
      previous.translation !== result.translation,
    before: changedKeys(old, next),
    after: changedKeys(next, old),
    beforeSources,
    afterSources,
    beforeMeaning: changedKeys(oldMeaning, nextMeaning),
    afterMeaning: changedKeys(nextMeaning, oldMeaning),
  };
}

const round = (n) => Math.round(n * 10) / 10;
/** Inputs are visible ink rectangles, already grouped by word and segment. */
export function connectionGeometry(container, control, targets) {
  if (!container?.width || !container?.height || !control?.width || !targets.length) return null;
  const rings = targets
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({
      partId: rect.partId,
      cx: round(rect.left - container.left + rect.width / 2),
      cy: round(rect.top - container.top + rect.height / 2),
      rx: round(Math.max(8, rect.width / 2 + 5)),
      ry: round(Math.max(8, rect.height / 2 + 4)),
    }));
  if (!rings.length) return null;
  const x = round(control.left - container.left + control.width / 2);
  const y = round(control.top - container.top - 2);
  const d = rings
    .map((ring) => {
      const targetY = round(ring.cy + ring.ry + 1);
      const middle = round((y + targetY) / 2);
      return `M ${x} ${y} C ${x} ${middle} ${ring.cx} ${middle} ${ring.cx} ${targetY}`;
    })
    .join(' ');
  return { width: round(container.width), height: round(container.height), rings, d };
}
