import React, { useMemo } from 'react';
import atlas from './glyphs/atlas.json';
import { buildGlyphModel, glyphColourFor } from './arabicGlyphModel.mjs';

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
        selectedPart === group.partId ? 'is-selected' : '',
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
