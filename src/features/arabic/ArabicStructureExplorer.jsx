import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import ArabicGlyphs, { ArabicGlyphCloseup } from './ArabicGlyphs';
import ArabicConnectionLayer from './ArabicConnectionLayer';
import { SpeakButton } from './ArabicControls';
import { buildGlyphModel, glyphColourFor, HARAKAT } from './arabicGlyphModel.mjs';
import { meaningConnections } from './arabicConnectionModel.mjs';
import atlas from './glyphs/atlas.json';
import {
  buildExplorerModel,
  getExplorerNodeResult,
  explainExplorerMark,
} from './arabicExplorerModel.mjs';
import './arabic-structure-explorer.css';

const nodeColour = (node) => {
  if (node?.id === 'word:noun') return 'stem';
  if (node?.selector === 'case')
    return (
      Array.from(node.arabic)
        .map((character) => HARAKAT[character]?.colour)
        .find(Boolean) || 'case'
    );
  return glyphColourFor(node?.segmentIds?.[0] || 'stem');
};
const segmentColour = (segment) =>
  segment.id.split(':').at(-1) === 'case'
    ? Array.from(segment.arabic)
        .map((character) => HARAKAT[character]?.colour)
        .find(Boolean) || 'case'
    : glyphColourFor(segment.id);
const partLabel = (node) => (node.selector === 'case' ? 'Ending sound' : node.meaning);
const nodeAttributes = (node) => ({
  'data-structure-node': node.id,
  'data-explorer-node': node.id,
  'data-kind': node.kind,
});
const rectWithin = (element, origin) => {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left - origin.left,
    y: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
  };
};
const curve = (from, to, sideways = false) => {
  const a = { x: from.x + from.width / 2, y: from.y + from.height };
  const b = { x: to.x + to.width / 2, y: to.y };
  if (!sideways && to.y + to.height <= from.y) {
    a.y = from.y;
    b.y = to.y + to.height;
  }
  if (sideways) {
    const right = b.x > a.x;
    a.x = from.x + (right ? from.width : 0);
    a.y = from.y + from.height / 2;
    b.x = to.x + (right ? 0 : to.width);
    b.y = to.y + to.height / 2;
    const mid = (a.x + b.x) / 2;
    return `M ${a.x} ${a.y} C ${mid} ${a.y} ${mid} ${b.y} ${b.x} ${b.y}`;
  }
  const mid = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${mid} ${b.x} ${mid} ${b.x} ${b.y}`;
};

// Keep semantic connectors in the gaps. A direct curve is preferred; a narrow
// outside lane is used only when an intervening card blocks that curve.
const routedCurve = (from, to, obstacles, width) => {
  const overlap = Math.min(from.y + from.height, to.y + to.height) - Math.max(from.y, to.y);
  const sideways = overlap > Math.min(from.height, to.height) / 2;
  const direct = curve(from, to, sideways);
  const points = direct.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const blocked = obstacles.some((box) => {
    for (let step = 1; step < 32; step += 1) {
      const t = step / 32,
        u = 1 - t;
      const x =
        u ** 3 * points[0] +
        3 * u ** 2 * t * points[2] +
        3 * u * t ** 2 * points[4] +
        t ** 3 * points[6];
      const y =
        u ** 3 * points[1] +
        3 * u ** 2 * t * points[3] +
        3 * u * t ** 2 * points[5] +
        t ** 3 * points[7];
      if (x > box.x - 2 && x < box.x + box.width + 2 && y > box.y - 2 && y < box.y + box.height + 2)
        return true;
    }
    return false;
  });
  if (!blocked) return direct;
  if (sideways) {
    const fromX = from.x + from.width / 2;
    const toX = to.x + to.width / 2;
    const shelf = Math.min(from.y, to.y) - 12;
    return `M ${fromX} ${from.y} C ${fromX} ${shelf} ${toX} ${shelf} ${toX} ${to.y}`;
  }
  const downward = to.y >= from.y + from.height;
  const a = { x: from.x + from.width / 2, y: downward ? from.y + from.height : from.y };
  const b = { x: to.x + to.width / 2, y: downward ? to.y : to.y + to.height };
  const direction = downward ? 1 : -1;
  const lane = a.x + b.x < width ? 3 : width - 3;
  const outY = a.y + direction * 9;
  const inY = b.y - direction * 9;
  return `M ${a.x} ${a.y} C ${a.x} ${outY} ${a.x} ${outY} ${lane} ${outY} L ${lane} ${inY} C ${lane} ${inY} ${b.x} ${inY} ${b.x} ${b.y}`;
};

/** Original positioned ink, cropped to a real source range; no rejoining characters. */
function SourcePart({ shaped, node, onPick }) {
  const word = shaped.tokens
    .flatMap((token) => token.items || [])
    .find((item) =>
      item.groups?.some(
        (group) => group.sourceIndex >= node.sourceStart && group.sourceIndex < node.sourceEnd,
      ),
    );
  const selected = word?.groups.filter(
    (group) => group.sourceIndex >= node.sourceStart && group.sourceIndex < node.sourceEnd,
  );
  if (!selected?.length)
    return (
      <span className="arabic-structure-part-fallback" lang="ar" dir="rtl">
        {node.arabic}
      </span>
    );
  const frame = [...selected];
  if (selected.every((group) => group.mark)) {
    const carrier = word.groups
      .filter((group) => !group.mark && group.sourceIndex < node.sourceStart)
      .sort((a, b) => b.sourceIndex - a.sourceIndex)[0];
    if (carrier) frame.push(carrier);
  }
  const bounds = frame.reduce(
    (box, group) => [
      Math.min(box[0], group.bounds[0]),
      Math.min(box[1], group.bounds[1]),
      Math.max(box[2], group.bounds[2]),
      Math.max(box[3], group.bounds[3]),
    ],
    [...frame[0].bounds],
  );
  const pad = 75;
  const pickGroup = (group, event) => {
    event.stopPropagation();
    onPick(group.partId, {
      sourceIndex: group.sourceIndex,
      character: group.character,
      mark: group.mark?.id,
      word: word.text,
    });
  };
  return (
    <svg
      className="arabic-structure-part-ink"
      viewBox={`${bounds[0] - pad} ${bounds[1] - pad} ${bounds[2] - bounds[0] + pad * 2} ${bounds[3] - bounds[1] + pad * 2}`}
      aria-hidden="true"
      focusable="false"
      data-source-start={node.sourceStart}
      data-source-end={node.sourceEnd}
      data-source-word={word.text}
    >
      {/* Touch coordinates can round just outside a very small painted vowel.
          Keep its source-aware hit area behind every original ink path, so a
          nearby mark remains selectable without covering a neighbour's ink. */}
      {selected.map((group) => {
        const [x, y, width, height] = group.hitBox;
        return (
          <g
            key={`target-${group.sourceIndex}`}
            className="arabic-structure-crop-target"
            data-source-index={group.sourceIndex}
            data-mark={group.mark?.id}
            onClick={(event) => pickGroup(group, event)}
          >
            <rect
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
      {word.groups.map((group) => {
        const included =
          group.sourceIndex >= node.sourceStart && group.sourceIndex < node.sourceEnd;
        return (
          <g
            key={group.sourceIndex}
            className={`arabic-colour-${group.colour} ${included ? 'arabic-structure-crop-ink' : ''}`}
            opacity={included ? 1 : 0.16}
            data-source-index={group.sourceIndex}
            data-mark={group.mark?.id}
            onClick={included ? (event) => pickGroup(group, event) : undefined}
          >
            {group.paths.map((path, index) => (
              <path
                key={index}
                d={path.d}
                transform={`translate(${path.x} ${path.y})`}
                fill="currentColor"
                pointerEvents={included ? 'visiblePainted' : 'none'}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function ArabicStructureExplorer({
  mode = 'noun',
  noun,
  verb,
  result,
  previous,
  selector,
  onSelect,
  children,
}) {
  const id = useId();
  const model = useMemo(
    () => buildExplorerModel({ mode, noun, verb, result }),
    [mode, noun, verb, result],
  );
  const byId = useMemo(() => new Map(model.nodes.map((node) => [node.id, node])), [model]);
  const root = byId.get(model.rootId);
  const defaultWord = byId.has('word:noun')
    ? 'word:noun'
    : byId.has('word:verb')
      ? 'word:verb'
      : model.wordIds[0];
  const [expanded, setExpanded] = useState(defaultWord);
  const [focus, setFocus] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [ruleId, setRuleId] = useState(null);
  const surfaceRef = useRef(null);
  const resultRef = useRef(null);
  const nodeRefs = useRef({});
  // The outline measures in a child layout effect. A changing callback ref is
  // detached before that effect and reattached afterwards, hiding the container
  // exactly when a new part or mark needs its first measurement.
  const attachResult = useCallback((node) => {
    resultRef.current = node;
    nodeRefs.current.sentence = node;
  }, []);
  const choiceRef = useRef(null);
  const [drawing, setDrawing] = useState({ width: 1, height: 1, paths: [] });
  const expandedId = expanded && !byId.has(expanded) ? defaultWord : expanded;
  const expandedNode = byId.get(expandedId);
  const rememberedNode = byId.get(focus?.nodeId);
  const focusedNode =
    rememberedNode ||
    (selector
      ? model.nodes.find((node) => node.kind === 'part' && node.selector === selector)
      : null);
  // Adding a missing piece can replace its auxiliary button with a real node.
  // Keep the open tray connected to that newly visible piece.
  const replacementNode =
    focus?.controlId && selector
      ? model.nodes.find(
          (node) =>
            node.selector === selector &&
            (node.kind === 'word' || (node.kind === 'part' && node.parentId === expandedId)),
        )
      : null;
  const choiceNode = replacementNode || focusedNode || expandedNode;
  const hasChoices = Boolean(children && selector && choiceNode);
  const anchorId = replacementNode?.id || focus?.controlId || choiceNode?.id;
  const markIndex =
    focus?.mark &&
    rememberedNode &&
    focus.offset < rememberedNode.sourceEnd - rememberedNode.sourceStart
      ? rememberedNode.sourceStart + focus.offset
      : null;
  const currentMark =
    markIndex != null && HARAKAT[model.result.arabic[markIndex]]
      ? explainExplorerMark(model, markIndex)
      : null;
  const markSegment = currentMark
    ? model.nodes.find(
        (node) =>
          node.kind === 'part' && node.sourceStart <= markIndex && node.sourceEnd > markIndex,
      )?.segmentIds[0] || focusedNode?.segmentIds[0]
    : null;
  const shaped = useMemo(() => buildGlyphModel(model.result, atlas), [model.result]);
  const meanings = useMemo(
    () =>
      meaningConnections(
        model.result,
        model.result.grammar?.number === 'dual' && model.result.grammar?.ownerId === 'my'
          ? { number: 'owner' }
          : {},
      ),
    [model.result],
  );
  const targetIds = currentMark
    ? [markSegment].filter(Boolean)
    : (replacementNode || rememberedNode)?.segmentIds || [];
  const applicableRules = model.ruleEdges.filter(
    (edge) =>
      currentMark?.ruleIds?.includes(edge.id) ||
      edge.to === focusedNode?.id ||
      edge.from === focusedNode?.id ||
      edge.from === expandedNode?.id ||
      expandedNode?.children.includes(edge.to),
  );
  const activeRule = applicableRules.find((edge) => edge.id === ruleId) || applicableRules[0];
  const visibleRule = showRules ? activeRule : null;

  useEffect(() => {
    setExpanded(defaultWord);
    setFocus(null);
    setShowRules(false);
  }, [mode, defaultWord]);

  const previousRef = useRef(previous);
  useEffect(() => {
    if (previousRef.current !== previous && !previous && !selector) {
      setFocus(null);
      setShowRules(false);
    }
    previousRef.current = previous;
  }, [previous, selector]);

  const close = () => {
    setFocus(null);
    setShowRules(false);
    onSelect(null);
  };
  const selectNode = (node, detail = {}, override) => {
    const key = override ?? node.selector;
    const wordId = node.kind === 'word' ? node.id : node.parentId;
    const controlId = detail.controlId || null;
    if (
      !detail.forceOpen &&
      !detail.mark &&
      hasChoices &&
      anchorId === (controlId || node.id) &&
      selector === key
    ) {
      close();
      return;
    }
    setExpanded(wordId);
    setShowRules(false);
    setFocus({
      nodeId: node.id,
      controlId,
      mark: detail.mark || null,
      offset: (detail.sourceIndex ?? node.sourceStart) - node.sourceStart,
    });
    onSelect(key, {
      nodeId: node.id,
      wordId,
      familyId: node.familyId || byId.get(wordId)?.familyId,
      segmentIds: node.segmentIds,
      ...detail,
    });
  };
  const pickGlyph = (segmentId, detail = {}) => {
    const index = detail.sourceIndex;
    const node =
      model.nodes.find(
        (item) => item.kind === 'part' && item.sourceStart <= index && item.sourceEnd > index,
      ) ||
      model.nodes.find(
        (item) => item.kind === 'word' && item.sourceStart <= index && item.sourceEnd > index,
      );
    if (!node) return;
    const explanation = detail.mark ? explainExplorerMark(model, index) : null;
    selectNode(
      node,
      { ...detail, segmentId, forceOpen: true },
      explanation?.selector && explanation.selector !== node.selector
        ? explanation.selector
        : undefined,
    );
  };
  const selectWord = (word) => {
    if (!word.children.length) {
      selectNode(word);
      return;
    }
    setExpanded(expandedId === word.id ? null : word.id);
    setFocus(null);
    setShowRules(false);
    onSelect(null);
  };
  const revealRule = (rule) => {
    if (!rule) return;
    const target = byId.get(rule.to);
    const source = byId.get(rule.from);
    if (target?.kind === 'part') setExpanded(target.parentId);
    else if (source?.kind === 'part') setExpanded(source.parentId);
    setRuleId(rule.id);
    setShowRules(true);
    onSelect(null);
  };

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return undefined;
    let frame = 0;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const origin = surface.getBoundingClientRect();
      if (!origin.width || !origin.height) return;
      const paths = [];
      const rectangles = new Map(
        Object.entries(nodeRefs.current)
          .filter(([, element]) => element)
          .map(([key, element]) => [key, rectWithin(element, origin)]),
      );
      if (choiceRef.current) rectangles.set('choices', rectWithin(choiceRef.current, origin));
      const route = (fromId, toId) =>
        routedCurve(
          rectangles.get(fromId),
          rectangles.get(toId),
          [...rectangles].filter(([key]) => key !== fromId && key !== toId).map(([, box]) => box),
          origin.width,
        );
      for (const edge of model.structureEdges) {
        const from = nodeRefs.current[edge.from];
        const to = nodeRefs.current[edge.to];
        if (from && to)
          paths.push({
            ...edge,
            kind: 'contains',
            colour: nodeColour(byId.get(edge.to)),
            d: route(edge.from, edge.to),
          });
      }
      if (hasChoices && nodeRefs.current[anchorId] && choiceRef.current)
        paths.push({
          id: 'replacement',
          from: anchorId,
          to: 'choices',
          kind: 'replaces',
          colour: nodeColour(choiceNode),
          d: route(anchorId, 'choices'),
        });
      if (visibleRule && nodeRefs.current[visibleRule.from] && nodeRefs.current[visibleRule.to])
        paths.push({
          ...visibleRule,
          kind: 'causes',
          d: route(visibleRule.from, visibleRule.to),
        });
      const next = { width: origin.width, height: origin.height, paths };
      setDrawing((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    schedule();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(surface);
    Object.values(nodeRefs.current).forEach((node) => node && observer?.observe(node));
    if (choiceRef.current) observer?.observe(choiceRef.current);
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    document.fonts?.ready.then(() => {
      if (!disposed) schedule();
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
    };
  }, [
    model,
    byId,
    expandedId,
    hasChoices,
    anchorId,
    choiceNode,
    visibleRule,
    currentMark?.sourceIndex,
  ]);

  const extraControls =
    expandedNode && (expandedNode.id === 'word:noun' || expandedNode.id === 'word:verb')
      ? (mode === 'noun'
          ? [
              ['owner', 'Whose?'],
              ['number', 'How many?'],
              ['article', 'A / the / my'],
              ...(!model.wordIds.some((wordId) => byId.get(wordId)?.selector === 'context')
                ? [['context', 'Add a beginning']]
                : []),
            ]
          : [
              ['person', 'Who?'],
              ['tense', 'When?'],
            ]
        ).filter(
          ([key]) => !expandedNode.children.some((child) => byId.get(child)?.selector === key),
        )
      : [];

  return (
    <section
      className="arabic-structure-explorer arabic-builder"
      aria-labelledby={`${id}-title`}
      ref={surfaceRef}
    >
      <svg
        className="arabic-structure-lines"
        viewBox={`0 0 ${drawing.width} ${drawing.height}`}
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id={`${id}-rule-arrow`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" />
          </marker>
        </defs>
        {drawing.paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            data-edge-kind={path.kind}
            data-from={path.from}
            data-to={path.to}
            className={`is-${path.kind} arabic-colour-${path.colour || 'case'}`}
            markerEnd={path.kind === 'causes' ? `url(#${id}-rule-arrow)` : undefined}
          />
        ))}
      </svg>
      <div
        className="arabic-result arabic-structure-sentence"
        {...nodeAttributes(root)}
        ref={attachResult}
        data-focus-source-index={currentMark?.sourceIndex}
      >
        <div className="arabic-result-heading">
          <h2 id={`${id}-title`}>Sentence structure</h2>
          <SpeakButton arabic={model.result.arabic} />
        </div>
        <div className="arabic-script" lang="ar" dir="rtl">
          <ArabicGlyphs
            result={model.result}
            onPartClick={pickGlyph}
            selectedSourceIndex={currentMark?.sourceIndex}
            selectedParts={currentMark ? [] : targetIds}
          />
        </div>
        <p className="arabic-pronunciation" dir="ltr" aria-label={model.result.latin}>
          {model.result.segments.map((segment, index) => (
            <span
              key={`${segment.id}-${index}`}
              className={`arabic-colour-${segmentColour(segment)}`}
            >
              {segment.latin}
            </span>
          ))}
        </p>
        <p className="arabic-translation">
          {meanings.map((meaning) => {
            const node =
              model.nodes.find(
                (item) =>
                  item.kind === 'part' &&
                  item.segmentIds.some((partId) => meaning.targetIds.includes(partId)),
              ) ||
              model.nodes.find(
                (item) =>
                  item.kind === 'word' &&
                  item.segmentIds.some((partId) => meaning.targetIds.includes(partId)),
              );
            if (!node) return <span key={meaning.key}>{meaning.text}</span>;
            const key = meaning.id === 'number' ? 'number' : node.selector;
            const active = hasChoices && selector === key && choiceNode?.id === node.id;
            return (
              <button
                type="button"
                key={meaning.key}
                className={`arabic-structure-meaning arabic-colour-${glyphColourFor(meaning.targetIds[0])}`}
                aria-label={`${meaning.text.trim()}. ${key ? 'Explore this meaning' : 'Explain this meaning'}`}
                aria-expanded={active}
                aria-controls={active ? `${id}-choices` : undefined}
                onClick={() => selectNode(node, { meaningId: meaning.id }, key)}
              >
                {meaning.text}
              </button>
            );
          })}
        </p>
        {targetIds.length > 0 && (
          <>
            <span className="sr-only" data-connection-control="structure-mark">
              Selected sound
            </span>
            <ArabicConnectionLayer
              containerRef={resultRef}
              controlKey="structure-mark"
              partIds={targetIds}
              sourceIndex={currentMark?.sourceIndex}
              colour={
                currentMark
                  ? HARAKAT[model.result.arabic[markIndex]]?.colour || 'case'
                  : nodeColour(rememberedNode)
              }
              measureKey={model.result.arabic}
            />
          </>
        )}
      </div>
      <div className="arabic-structure-words" dir="rtl" aria-label="Words in the sentence">
        {model.wordIds.map((wordId, index) => {
          const word = byId.get(wordId);
          const isExpanded = expandedId === wordId;
          const partsId = `${id}-parts-${index}`;
          return (
            <div
              className={`arabic-structure-word-branch ${isExpanded ? 'is-expanded' : ''}`}
              key={wordId}
            >
              <button
                type="button"
                className={`arabic-structure-word arabic-colour-${nodeColour(word)} ${isExpanded ? 'is-selected' : ''}`}
                {...nodeAttributes(word)}
                ref={(node) => {
                  nodeRefs.current[wordId] = node;
                }}
                aria-label={`Explore word: ${word.latin}`}
                aria-expanded={
                  word.children.length ? isExpanded : hasChoices && choiceNode?.id === wordId
                }
                aria-controls={
                  word.children.length && isExpanded
                    ? partsId
                    : hasChoices && choiceNode?.id === wordId
                      ? `${id}-choices`
                      : undefined
                }
                onClick={() => selectWord(word)}
              >
                <span
                  className="arabic-structure-word-script"
                  lang="ar"
                  dir="rtl"
                  onClick={(event) => {
                    if (event.target.closest('.arabic-glyph-group')) event.stopPropagation();
                  }}
                >
                  <ArabicGlyphs
                    result={getExplorerNodeResult(model, wordId)}
                    onPartClick={(partId, detail = {}) =>
                      detail.mark
                        ? pickGlyph(partId, {
                            ...detail,
                            sourceIndex: word.sourceStart + (detail.sourceIndex || 0),
                          })
                        : selectWord(word)
                    }
                  />
                </span>
                <span className="arabic-structure-node-latin" dir="ltr">
                  {word.latin}
                </span>
                <strong dir="ltr">
                  {wordId === 'word:noun'
                    ? model.result.englishParts
                        .filter((part) => part.id !== 'context' && !part.id.startsWith('context:'))
                        .map((part, partIndex) => (
                          <span
                            key={`${part.id}-${partIndex}`}
                            className={`arabic-colour-${glyphColourFor(part.id)}`}
                          >
                            {part.text}
                          </span>
                        ))
                    : word.meaning}
                </strong>
                <ChevronDown className="arabic-structure-disclosure" size={15} aria-hidden="true" />
              </button>
              {isExpanded && word.children.length > 0 && (
                <div id={partsId} className="arabic-structure-parts" data-parts-for={wordId}>
                  {word.children.map((partId) => {
                    const part = byId.get(partId);
                    return (
                      <button
                        type="button"
                        key={partId}
                        className={`arabic-structure-part arabic-colour-${nodeColour(part)} ${choiceNode?.id === partId ? 'is-selected' : ''}`}
                        {...nodeAttributes(part)}
                        ref={(node) => {
                          nodeRefs.current[partId] = node;
                        }}
                        aria-label={`Change part: ${partLabel(part) || part.description}`}
                        aria-expanded={hasChoices && choiceNode?.id === partId}
                        aria-controls={
                          hasChoices && choiceNode?.id === partId ? `${id}-choices` : undefined
                        }
                        onClick={() => {
                          const mark =
                            part.selector === 'case'
                              ? Array.from(
                                  { length: part.sourceEnd - part.sourceStart },
                                  (_, offset) => part.sourceStart + offset,
                                ).find((offset) => HARAKAT[model.result.arabic[offset]])
                              : null;
                          selectNode(
                            part,
                            mark != null
                              ? {
                                  sourceIndex: mark,
                                  character: model.result.arabic[mark],
                                  mark: HARAKAT[model.result.arabic[mark]].id,
                                  forceOpen: true,
                                }
                              : {},
                          );
                        }}
                      >
                        <SourcePart shaped={shaped} node={part} onPick={pickGlyph} />
                        <span className="arabic-structure-node-latin" dir="ltr">
                          {part.latin}
                        </span>
                        <strong dir="ltr">{partLabel(part)}</strong>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hasChoices && (
        <div
          id={`${id}-choices`}
          className="arabic-structure-choices"
          data-choice-for={anchorId}
          ref={choiceRef}
        >
          {children}
        </div>
      )}
      {currentMark && (
        <figure className="arabic-structure-mark-note" data-mark-explanation={currentMark.kind}>
          <ArabicGlyphCloseup result={model.result} sourceIndex={currentMark.sourceIndex} />
          <figcaption>
            <strong>{currentMark.title}</strong>
            <p>{currentMark.body}</p>
          </figcaption>
          <button type="button" aria-label="Close sound explanation" onClick={close}>
            <X size={16} aria-hidden="true" />
          </button>
        </figure>
      )}
      {!currentMark && rememberedNode && !rememberedNode.selector && !focus?.controlId && (
        <p className="arabic-structure-part-note" role="note">
          {rememberedNode.description}
        </p>
      )}
      {expandedNode && extraControls.length > 0 && (
        <div
          className="arabic-structure-word-options"
          dir="ltr"
          data-controls-for={expandedId}
          aria-label="More choices for this word"
        >
          {extraControls.map(([key, label]) => {
            const controlId = `control:${expandedId}:${key}`;
            return (
              <button
                type="button"
                key={key}
                ref={(node) => {
                  nodeRefs.current[controlId] = node;
                }}
                data-explorer-control={key}
                aria-expanded={hasChoices && focus?.controlId === controlId}
                aria-controls={
                  hasChoices && focus?.controlId === controlId ? `${id}-choices` : undefined
                }
                onClick={() => selectNode(expandedNode, { controlId }, key)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      {applicableRules.length > 0 && (
        <details
          className="arabic-structure-rule"
          open={showRules}
          onToggle={(event) => {
            if (event.currentTarget.open) revealRule(activeRule);
            else setShowRules(false);
          }}
        >
          <summary>Why this form?</summary>
          {applicableRules.length > 1 && (
            <div
              className="arabic-structure-rule-options"
              role="group"
              aria-label="Choose a relationship to explain"
            >
              {applicableRules.map((rule) => (
                <button
                  type="button"
                  key={rule.id}
                  aria-pressed={activeRule?.id === rule.id}
                  onClick={() => revealRule(rule)}
                >
                  {rule.label}
                </button>
              ))}
            </div>
          )}
          {activeRule && (
            <p data-rule-explanation={activeRule.id}>
              <strong>{activeRule.label}. </strong>
              {activeRule.description}
            </p>
          )}
        </details>
      )}
      <span className="sr-only" role="status">
        {model.result.latin}. {model.result.translation}
      </span>
    </section>
  );
}
