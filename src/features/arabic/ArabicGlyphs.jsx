import React, { useMemo } from 'react';
import atlas from './glyphs/atlas.json';
import { buildGlyphModel, glyphColourFor } from './arabicGlyphModel.mjs';
import { resolveMarkFocus } from './arabicConnectionModel.mjs';

/**
 * Independently painted, correctly joined Arabic letters and harakat.
 *
 * The local atlas is imported only by the Arabic feature. No shaping engine,
 * network font, generated joiners, or modified source text is used at runtime.
 *
 * onPartClick receives the original segment id, plus optional character detail.
 * SVG targets provide direct pointer manipulation; the surrounding result's
 * large semantic buttons provide the equivalent keyboard/touch controls.
 * Screen readers and copy receive the exact original Arabic, not path labels.
 */
export default function ArabicGlyphs({
  result,
  onPartClick,
  selectedPart,
  selectedParts = [],
  selectedSourceIndex,
  highlightedParts = [],
  highlightedSourceIndices,
  colourFor = glyphColourFor,
  className = '',
}) {
  const model = useMemo(() => buildGlyphModel(result, atlas, colourFor), [result, colourFor]);

  function copyOriginal(event) {
    if (!event.clipboardData) return;
    event.clipboardData.setData('text/plain', model.text);
    event.preventDefault();
  }

  function groupProps(group, item, layer) {
    const clickable = Boolean(onPartClick && group.partId !== 'punctuation');
    return {
      className: [
        'arabic-glyph-group',
        `arabic-glyph-${layer}`,
        `arabic-colour-${group.colour}`,
        group.mark ? `arabic-haraka arabic-mark-${group.mark.id}` : 'arabic-letter',
        clickable ? 'is-interactive' : '',
        (
          selectedSourceIndex != null
            ? selectedSourceIndex === group.sourceIndex
            : selectedPart === group.partId || selectedParts.includes(group.partId)
        )
          ? 'is-selected'
          : '',
        selectedSourceIndex === group.sourceIndex ? 'is-mark-selected' : '',
        (
          highlightedSourceIndices
            ? highlightedSourceIndices.includes(group.sourceIndex)
            : highlightedParts.includes(group.partId)
        )
          ? 'is-changed'
          : '',
      ]
        .filter(Boolean)
        .join(' '),
      onClick: clickable
        ? () =>
            onPartClick(group.partId, {
              character: group.character,
              mark: group.mark?.id || null,
              sourceIndex: group.sourceIndex,
              word: item.text,
            })
        : undefined,
      style: clickable ? { cursor: 'pointer' } : undefined,
    };
  }

  function renderItem(item) {
    if (item.type === 'fallback')
      return (
        <span
          key={item.start}
          className={`arabic-glyph-fallback arabic-colour-${item.colour}`}
          data-renderer-fallback="unknown-word"
          onClick={onPartClick ? () => onPartClick(item.partId, { word: item.text }) : undefined}
        >
          {item.text}
        </span>
      );
    return (
      <svg
        key={item.start}
        className="arabic-glyph-word"
        viewBox={`0 ${model.top} ${item.width} ${model.bottom - model.top}`}
        width={`${item.width / model.units}em`}
        height={`${(model.bottom - model.top) / model.units}em`}
        style={{
          display: 'inline-block',
          verticalAlign: `${-model.bottom / model.units}em`,
          overflow: 'visible',
        }}
        focusable="false"
        data-word={item.text}
      >
        {partBounds(item.groups, highlightedParts, highlightedSourceIndices).map((ring) => (
          <ellipse
            key={ring.key}
            className={`arabic-glyph-change-ring arabic-colour-${ring.colour}`}
            data-changed-part={ring.partId}
            data-changed-sources={ring.sources.join(',')}
            cx={ring.cx}
            cy={ring.cy}
            rx={ring.rx}
            ry={ring.ry}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Expanded targets sit behind ALL ink. An overlapping neighbour's
            target must never intercept a tap directly on the visible mark. */}
        {onPartClick &&
          item.groups
            .filter((group) => group.partId !== 'punctuation')
            .map((group) => {
              const [x, y, width, height] = group.hitBox;
              return (
                <g key={`target-${group.sourceIndex}`} {...groupProps(group, item, 'target')}>
                  <rect
                    className="arabic-glyph-hit"
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={55}
                    fill="transparent"
                    pointerEvents="all"
                  />
                </g>
              );
            })}
        {item.groups.map((group) => (
          <g
            key={group.sourceIndex}
            {...groupProps(group, item, 'ink')}
            data-part={group.partId}
            data-character={group.character}
            data-source-index={group.sourceIndex}
            data-mark={group.mark?.id}
          >
            <title>
              {group.mark ? `${group.mark.name}: ${group.mark.sound}. ${group.label}` : group.label}
            </title>
            {group.paths.map((path, index) => (
              <path
                key={index}
                className="arabic-glyph-path"
                d={path.d}
                transform={`translate(${path.x} ${path.y})`}
                fill="currentColor"
                pointerEvents={
                  onPartClick && group.partId !== 'punctuation' ? 'visiblePainted' : 'none'
                }
              />
            ))}
          </g>
        ))}
      </svg>
    );
  }

  return (
    <span
      className={`arabic-glyphs ${className}`}
      lang="ar"
      dir="rtl"
      data-renderer={model.mode}
      data-renderer-fallback={model.fallbackReason}
      onCopy={copyOriginal}
    >
      <span className="sr-only">{model.text}</span>
      <span aria-hidden="true" className="arabic-glyph-visual">
        {model.mode === 'plain'
          ? model.text
          : model.tokens.map((token) =>
              token.type === 'space' ? (
                token.text
              ) : (
                <span
                  className="arabic-glyph-run"
                  key={token.start}
                  dir="rtl"
                  style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
                >
                  {token.items.map(renderItem)}
                </span>
              ),
            )}
      </span>
    </span>
  );
}

function partBounds(groups, ids, sourceIndices) {
  const selected = new Set(sourceIndices || ids);
  const selectedGroups = groups
    .filter((group) => selected.has(sourceIndices ? group.sourceIndex : group.partId))
    .sort((a, b) => a.sourceIndex - b.sourceIndex);
  const runs = [];
  for (const group of selectedGroups) {
    const old = runs.at(-1);
    const [left, top, right, bottom] = group.bounds;
    if (old && old.partId === group.partId && (!sourceIndices || old.end === group.sourceIndex)) {
      old.left = Math.min(old.left, left);
      old.top = Math.min(old.top, top);
      old.right = Math.max(old.right, right);
      old.bottom = Math.max(old.bottom, bottom);
      old.end = group.sourceIndex + group.character.length;
      old.sources.push(group.sourceIndex);
    } else
      runs.push({
        key: `${group.partId}-${group.sourceIndex}`,
        partId: group.partId,
        colour: group.colour,
        left,
        top,
        right,
        bottom,
        end: group.sourceIndex + group.character.length,
        sources: [group.sourceIndex],
      });
  }
  return runs.map((box) => ({
    ...box,
    cx: (box.left + box.right) / 2,
    cy: (box.top + box.bottom) / 2,
    rx: (box.right - box.left) / 2 + 50,
    ry: (box.bottom - box.top) / 2 + 45,
  }));
}

/** A crop of the ORIGINAL shaped word, not a rejoined or detached substitute. */
export function ArabicGlyphCloseup({
  result,
  sourceIndex,
  partId = 'case',
  className = '',
  colourFor = glyphColourFor,
}) {
  const model = useMemo(() => buildGlyphModel(result, atlas, colourFor), [result, colourFor]);
  const focus = resolveMarkFocus(result, sourceIndex == null ? { partId } : { sourceIndex });
  if (!focus || model.mode === 'plain') return null;
  const item = model.tokens
    .flatMap((token) => token.items || [])
    .find((word) => word.groups?.some((group) => group.sourceIndex === focus.sourceIndex));
  if (!item) return null;
  const letterGroups = item.groups.filter(
    (group) => group.sourceIndex >= focus.letterIndex && group.sourceIndex < focus.after,
  );
  const focused = item.groups.find((group) => group.sourceIndex === focus.sourceIndex);
  if (!letterGroups.length || !focused) return null;
  const box = letterGroups.reduce(
    (bounds, group) => [
      Math.min(bounds[0], group.bounds[0]),
      Math.min(bounds[1], group.bounds[1]),
      Math.max(bounds[2], group.bounds[2]),
      Math.max(bounds[3], group.bounds[3]),
    ],
    [...letterGroups[0].bounds],
  );
  const [left, top, right, bottom] = box;
  const pad = 80;
  return (
    <svg
      className={`arabic-glyph-closeup ${className}`}
      viewBox={`${left - pad} ${top - pad} ${right - left + pad * 2} ${bottom - top + pad * 2}`}
      aria-hidden="true"
      focusable="false"
      data-focus-letter={focus.letter}
      data-focus-character={focus.character}
      data-focus-source-index={focus.sourceIndex}
      data-source-word={item.text}
    >
      {item.groups.map((group) => (
        <g
          key={group.sourceIndex}
          className={`arabic-colour-${group.colour}`}
          opacity={
            group.sourceIndex >= focus.letterIndex && group.sourceIndex < focus.after ? 1 : 0.2
          }
        >
          {group.paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              transform={`translate(${path.x} ${path.y})`}
              fill="currentColor"
            />
          ))}
        </g>
      ))}
      <ellipse
        className={`arabic-closeup-ring arabic-colour-${focus.mark.colour}`}
        cx={(focused.bounds[0] + focused.bounds[2]) / 2}
        cy={(focused.bounds[1] + focused.bounds[3]) / 2}
        rx={(focused.bounds[2] - focused.bounds[0]) / 2 + 28}
        ry={(focused.bounds[3] - focused.bounds[1]) / 2 + 28}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
