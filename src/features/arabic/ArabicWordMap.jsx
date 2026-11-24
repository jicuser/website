import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react';
import ArabicGlyphs from './ArabicGlyphs';
import { getWordMapModel, wordMapCurve, wordMapTrayCurve } from './arabicWordMapModel.mjs';
import './arabic-word-map.css';

const relativeBox = (element, origin) => {
  const box = element.getBoundingClientRect();
  return {
    x: box.left - origin.left,
    y: box.top - origin.top,
    width: box.width,
    height: box.height,
  };
};

/** Controlled view of the builder's existing choices; children supply its single choice tray. */
export default function ArabicWordMap({
  mode = 'noun',
  noun,
  verb,
  result,
  selector,
  onSelect,
  onBack,
  children,
}) {
  const titleId = useId();
  const trayId = useId();
  const canvas = useRef(null);
  const nodes = useRef({});
  const anchor = useRef(null);
  const [drawing, setDrawing] = useState({ width: 1, height: 1, paths: [] });
  const model = useMemo(
    () => getWordMapModel({ mode, noun, verb, result }),
    [mode, noun, verb, result],
  );
  const allBranches = [...model.branches, ...(model.article ? [model.article] : [])];
  const activeBranch = allBranches.find((branch) => branch.id === selector);
  const active = selector === 'stem' ? 'stem' : activeBranch?.id || null;
  const hasChoices = Boolean(active && children);
  const activeColour = activeBranch?.colour || 'stem';

  useEffect(() => {
    const surface = canvas.current;
    if (!surface) return undefined;
    let frame;
    const measure = () => {
      const origin = surface.getBoundingClientRect();
      if (!origin.width || !origin.height || !nodes.current.stem) return;
      const word = relativeBox(nodes.current.stem, origin);
      const paths = model.branches.flatMap((branch) => {
        const node = nodes.current[branch.id];
        return node
          ? [
              {
                id: branch.id,
                d: wordMapCurve(word, relativeBox(node, origin)),
                colour: branch.colour,
                active: active === branch.id || (branch.id === 'owner' && active === 'article'),
              },
            ]
          : [];
      });
      if (model.article && nodes.current.owner && nodes.current.article)
        paths.push({
          id: 'article',
          d: wordMapCurve(
            relativeBox(nodes.current.owner, origin),
            relativeBox(nodes.current.article, origin),
          ),
          colour: 'context',
          active: active === 'article',
        });
      if (hasChoices && anchor.current && nodes.current[active])
        paths.push({
          id: 'choices',
          d: wordMapTrayCurve(
            relativeBox(nodes.current[active], origin),
            relativeBox(anchor.current, origin),
            origin.width,
            active === 'stem',
          ),
          colour: activeColour,
          active: true,
        });
      const next = { width: origin.width, height: origin.height, paths };
      setDrawing((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(surface);
    Object.values(nodes.current).forEach((node) => node && observer?.observe(node));
    window.addEventListener('resize', schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [active, activeColour, hasChoices, model]);

  const select = (key, hint = '', forceOpen = false) => onSelect(key, hint, forceOpen);
  const selectPiece = (id, detail = {}) => {
    const meaning = detail.meaningId || id;
    let key;
    if (mode === 'verb') {
      key = ['stem', 'root'].includes(id)
        ? 'stem'
        : ['context', 'case'].includes(id)
          ? 'tense'
          : 'person';
    } else key = ['owner', 'number', 'case', 'article'].includes(meaning) ? meaning : 'stem';
    const hint =
      detail.mark && ['stem', 'root'].includes(id)
        ? 'This sound belongs to the word. Choose another word to compare.'
        : '';
    select(key, hint, Boolean(detail.mark));
  };
  const disclosure = (key) => ({
    'aria-expanded': hasChoices && active === key,
    'aria-controls': hasChoices && active === key ? trayId : undefined,
    onClick: () => select(key),
  });
  const branchButton = (branch, leaf = false) => (
    <button
      key={branch.id}
      type="button"
      ref={(node) => {
        nodes.current[branch.id] = node;
      }}
      className={`arabic-map-node arabic-colour-${branch.colour} ${leaf ? 'arabic-map-leaf' : ''} ${active === branch.id ? 'is-selected' : ''}`}
      aria-label={`${branch.label}: ${branch.value}. Show choices`}
      {...disclosure(branch.id)}
    >
      <span className="arabic-map-node-label">
        {branch.label}
        {active === branch.id ? (
          <Check size={15} aria-hidden="true" />
        ) : (
          <ChevronDown size={15} aria-hidden="true" />
        )}
      </span>
      <strong>{branch.value}</strong>
      {branch.token && (
        <span className="arabic-map-token" dir="ltr">
          {branch.token}
        </span>
      )}
    </button>
  );

  return (
    <section className={`arabic-word-map is-${mode}`} aria-labelledby={titleId}>
      <header className="arabic-map-heading">
        <div>
          <h2 id={titleId}>Word map</h2>
          <p>Choose a branch to change this word.</p>
        </div>
        <button type="button" className="arabic-map-back" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" />
          Back to builder
        </button>
      </header>
      <div
        className={`arabic-panel arabic-builder arabic-map-builder ${hasChoices ? 'has-choices' : ''}`}
      >
        <div ref={canvas} className="arabic-map-canvas">
          <svg
            className="arabic-map-lines"
            viewBox={`0 0 ${drawing.width} ${drawing.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {drawing.paths.map((path) => (
              <path
                key={path.id}
                d={path.d}
                className={`arabic-colour-${path.colour} ${path.active ? 'is-active' : ''}`}
              />
            ))}
          </svg>
          <div className="arabic-map-nodes">
            <div
              ref={(node) => {
                nodes.current.stem = node;
              }}
              className={`arabic-map-word ${active === 'stem' ? 'is-selected' : ''}`}
            >
              <button
                type="button"
                className="arabic-map-word-button arabic-colour-stem"
                aria-label={`Change ${mode === 'verb' ? 'action' : 'word'}: ${model.wordLabel}`}
                {...disclosure('stem')}
              >
                <span>{mode === 'verb' ? 'Action' : 'Word'}</span>
                <strong>{model.wordLabel}</strong>
                {active === 'stem' ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <ChevronDown size={16} aria-hidden="true" />
                )}
              </button>
              <div className="arabic-map-word-arabic" lang="ar" dir="rtl">
                <ArabicGlyphs
                  result={model.preview}
                  selectedPart={active === 'stem' ? 'stem' : activeBranch?.partId}
                  onPartClick={selectPiece}
                />
              </div>
              <p className="arabic-map-pronunciation" dir="ltr">
                {model.preview.latin}
              </p>
              <p className="arabic-map-meaning">{model.preview.translation}</p>
            </div>
            {model.branches.map((branch) => (
              <div key={branch.id} className={`arabic-map-branch arabic-map-area-${branch.area}`}>
                {branchButton(branch)}
                {branch.id === 'owner' && model.article && branchButton(model.article, true)}
              </div>
            ))}
          </div>
          {hasChoices && (
            <div id={trayId} className={`arabic-map-choices arabic-colour-${activeColour}`}>
              <span ref={anchor} className="arabic-map-tray-anchor" aria-hidden="true" />
              {children}
            </div>
          )}
        </div>
        {!hasChoices && (
          <p className="arabic-map-invitation">Open a branch to see its choices here.</p>
        )}
      </div>
      <span className="sr-only" role="status">
        {result.latin}. {result.translation}
      </span>
    </section>
  );
}
