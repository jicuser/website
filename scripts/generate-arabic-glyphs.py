#!/usr/bin/env python3
"""Pre-shape the Arabic playground's bounded vocabulary with its local Naskh font.

Run from any directory: python scripts/generate-arabic-glyphs.py
Build-time requirements: Python fontTools, Node, system libharfbuzz (no runtime deps).

The SVG atlas keeps HarfBuzz's joining/positioning, and the source character for
EVERY path. Unicode marks can therefore be painted separately from their bases.
Never use the font's mark class to identify a haraka: Noto also uses that class
for the dots and hamza which are part of an Arabic letter.
"""
from __future__ import annotations

import ctypes as ct
import ctypes.util
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen, replayRecording
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / 'scripts/fonts/NotoNaskhArabic-Regular.ttf'
OUTPUT = ROOT / 'src/features/arabic/glyphs/atlas.json'

# Shape the canonical outputs, not a hand-maintained list of possible spellings.
# Questions add only hal and a question mark to these words. Punctuation is a
# separate token at runtime so it does not require every word to be duplicated.
ENUMERATE = r"""
import { buildNoun, buildVerb, NOUNS, OWNERS, CONTEXTS, DEFINITENESS,
  VERBS, PERSONS, TENSES, getAvailableNumbers } from './src/features/arabic/grammar.mjs';
import { GRAMMAR_TOPICS, PRACTICE_QUESTIONS } from './src/features/arabic/learningContent.mjs';
import { guidedGlyphResults } from './src/features/arabic/guidedWordData.mjs';
const words = new Set(['هَلْ', '؟', '،', '؛', '.', '!', ':']);
const add = result => (result.arabic.match(/[\p{L}\p{M}\p{N}]+|[^\s\p{L}\p{M}\p{N}]/gu) || []).forEach(word => words.add(word));
for (const noun of NOUNS)
  for (const owner of OWNERS)
    for (const context of CONTEXTS)
      for (const number of getAvailableNumbers(noun.id))
        for (const definite of DEFINITENESS)
          add(buildNoun({nounId:noun.id,ownerId:owner.id,contextId:context.id,
            number:number.id,definiteness:definite.id}));
for (const verb of VERBS)
  for (const person of PERSONS)
    for (const tense of TENSES)
      add(buildVerb({verbId:verb.id,personId:person.id,tenseId:tense.id}));
for (const result of guidedGlyphResults()) add(result);
for (const topic of GRAMMAR_TOPICS)
  for (const example of topic.examples) add({ arabic: example.ar });
for (const question of PRACTICE_QUESTIONS) {
  if (question.promptArabic) add({ arabic: question.promptArabic });
  for (const option of question.options) if (option.ar) add({ arabic: option.ar });
}
process.stdout.write(JSON.stringify([...words].sort()));
"""
words = json.loads(subprocess.check_output(
    ['node', '--input-type=module', '-e', ENUMERATE], cwd=ROOT, text=True))

font_file = TTFont(FONT)
glyph_set = font_file.getGlyphSet()
glyph_order = font_file.getGlyphOrder()
units = font_file['head'].unitsPerEm

lib_name = ct.util.find_library('harfbuzz')
if not lib_name:
    raise SystemExit('Install the system HarfBuzz library to regenerate this build-time atlas.')
hb = ct.CDLL(lib_name)
ptr, ui, ii = ct.c_void_p, ct.c_uint, ct.c_int


def bind(name, restype, args):
    method = getattr(hb, name)
    method.restype, method.argtypes = restype, args
    return method


blob = bind('hb_blob_create_from_file_or_fail', ptr, [ct.c_char_p])(str(FONT).encode())
if not blob:
    raise SystemExit('HarfBuzz could not open the local Arabic font.')
face = bind('hb_face_create', ptr, [ptr, ui])(blob, 0)
font = bind('hb_font_create', ptr, [ptr])(face)
bind('hb_ot_font_set_funcs', None, [ptr])(font)
bind('hb_font_set_scale', None, [ptr, ii, ii])(font, units, units)
new_buffer = bind('hb_buffer_create', ptr, [])
destroy_buffer = bind('hb_buffer_destroy', None, [ptr])
add_codepoints = bind('hb_buffer_add_codepoints', None, [ptr, ct.POINTER(ui), ii, ui, ii])
set_cluster_level = bind('hb_buffer_set_cluster_level', None, [ptr, ui])
guess_properties = bind('hb_buffer_guess_segment_properties', None, [ptr])
shape = bind('hb_shape', None, [ptr, ptr, ptr, ui])


class GlyphInfo(ct.Structure):
    _fields_ = [('codepoint', ui), ('mask', ui), ('cluster', ui), ('var1', ui), ('var2', ui)]


class GlyphPosition(ct.Structure):
    _fields_ = [('advance_x', ii), ('advance_y', ii), ('offset_x', ii), ('offset_y', ii), ('var', ui)]


get_infos = bind('hb_buffer_get_glyph_infos', ct.POINTER(GlyphInfo), [ptr, ct.POINTER(ui)])
get_positions = bind('hb_buffer_get_glyph_positions', ct.POINTER(GlyphPosition), [ptr, ct.POINTER(ui)])

# Noto's ccmp can combine shadda with another mark. Splitting the exact existing
# contours preserves its positioning (including the kasra placed under shadda
# ABOVE a letter), unlike redrawing marks with guessed browser coordinates.
COMBINED_MARKS = {
    'uni0651064B': '\u064b',
    'uni0651064D': '\u064d',
    'uni06510650': '\u0650',
    'uni06510670': '\u0670',
    'uni06510670.small': '\u0670',
}
MARKS = set('\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652\u0670')
glyphs, glyph_ids = [], {}
combined_count = 0


def number(value):
    rounded = round(value, 3)
    return str(int(rounded)) if rounded == int(rounded) else str(rounded)


def drawing(records):
    svg = SVGPathPen(glyph_set, ntos=number)
    bounds = BoundsPen(glyph_set)
    replayRecording(records, TransformPen(svg, (1, 0, 0, -1, 0, 0)))
    replayRecording(records, TransformPen(bounds, (1, 0, 0, -1, 0, 0)))
    return svg.getCommands(), list(bounds.bounds) if bounds.bounds else None


def outline(glyph_name):
    pen = DecomposingRecordingPen(glyph_set)
    glyph_set[glyph_name].draw(pen)
    return pen.value


def intern(glyph_name, part=None):
    key = glyph_name if part is None else f'{glyph_name}:{part}'
    if key not in glyph_ids:
        records = outline(glyph_name)
        if part is not None:
            contours, contour = [], []
            for entry in records:
                contour.append(entry)
                if entry[0] in ('closePath', 'endPath'):
                    contours.append(contour)
                    contour = []
            assert not contour, f'Unclosed contour in {glyph_name}'
            sizes = [sum(len(entry[1]) for entry in contour) for contour in contours]
            shadda_index = sizes.index(max(sizes))
            # Checked against this pinned font: a shadda has 41 outline points;
            # every companion vowel stroke has at most 15. Fail if font changes.
            assert sizes[shadda_index] > 30 and all(
                size < 20 for index, size in enumerate(sizes) if index != shadda_index
            ), f'Combined mark contours need review: {glyph_name}, {sizes}'
            records = [entry for index, contour in enumerate(contours)
                       if (index == shadda_index) == (part == 'shadda') for entry in contour]
        path, bounds = drawing(records)
        glyph_ids[key] = len(glyphs)
        # id -> [SVG path, [left, top, right, bottom]] in font units, y down.
        glyphs.append([path, bounds])
    return glyph_ids[key]


def mark_index(text, cluster, mark):
    start, end = cluster, cluster + 1
    while start > 0 and text[start - 1] in MARKS:
        start -= 1
    while end < len(text) and text[end] in MARKS:
        end += 1
    matches = [index for index in range(start, end) if text[index] == mark]
    if len(matches) != 1:
        raise ValueError(f'Cannot map {mark!r} in combined mark at {cluster}: {text}')
    return matches[0]


shaped_words = {}
# This comparison arrow appears in one practice option. It is not an Arabic
# glyph in Noto Naskh; the renderer deliberately keeps it as exact native text.
native_text_tokens = ['←']
top, bottom = 0, 0
for word in words:
    if word in native_text_tokens:
        continue
    buffer = new_buffer()
    codepoints = (ui * len(word))(*map(ord, word))
    add_codepoints(buffer, codepoints, len(word), 0, len(word))
    # CHARACTERS keeps source mark indices even when mark ordering changes.
    # Ligature outlines are explicitly handled above, not assumed separable.
    set_cluster_level(buffer, 2)
    guess_properties(buffer)
    shape(font, buffer, None, 0)
    length = ui()
    infos = get_infos(buffer, ct.byref(length))
    positions = get_positions(buffer, ct.byref(length))
    x, y, records = 0, 0, []
    for index in range(length.value):
        info, position = infos[index], positions[index]
        name = glyph_order[info.codepoint]
        if name == '.notdef':
            raise ValueError(f'Missing font glyph in {word!r}')
        at_x, at_y = x + position.offset_x, -(y + position.offset_y)
        if name in COMBINED_MARKS:
            combined_count += 1
            for part, char in [('shadda', '\u0651'), ('vowel', COMBINED_MARKS[name])]:
                records.append([intern(name, part), at_x, at_y, mark_index(word, info.cluster, char)])
        else:
            records.append([intern(name), at_x, at_y, info.cluster])
        x += position.advance_x
        y += position.advance_y
    for glyph_id, at_x, at_y, source in records:
        bounds = glyphs[glyph_id][1]
        if bounds:
            top = min(top, at_y + bounds[1])
            bottom = max(bottom, at_y + bounds[3])
    shaped_words[word] = [x, records]
    destroy_buffer(buffer)

atlas = {
    'version': 1,
    'font': {
        'name': 'JIC Arabic learning paths',
        'source': 'Noto Naskh Arabic Regular',
        'sha256': hashlib.sha256(FONT.read_bytes()).hexdigest(),
        'license': (ROOT / 'scripts/fonts/OFL.txt').read_text(),
    },
    'units': units,
    # Extra room for touch hit regions and focus outlines. One common line box
    # keeps the baseline stable when vowel or owner choices change.
    'top': int(top) - 90,
    'bottom': int(bottom) + 90,
    'glyphs': glyphs,
    'nativeTextTokens': native_text_tokens,
    'words': shaped_words,
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
encoded = (json.dumps(atlas, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
OUTPUT.write_bytes(encoded)
print(json.dumps({
    'file': str(OUTPUT.relative_to(ROOT)), 'words': len(shaped_words),
    'outlines': len(glyphs), 'combinedMarksSplit': combined_count,
    'rawBytes': len(encoded), 'gzipBytes': len(gzip.compress(encoded, mtime=0)),
    'top': atlas['top'], 'bottom': atlas['bottom'],
}, indent=2))
