import React, { useLayoutEffect, useState } from 'react';
import { connectionGeometry } from './arabicConnectionModel.mjs';

/** One active connection. Geometry follows ink, never a guessed text box. */
export default function ArabicConnectionLayer({
  containerRef,
  controlKey,
  partIds = [],
  sourceIndex,
  colour = 'stem',
  measureKey,
}) {
  const [geometry, setGeometry] = useState(null);
  const partsKey = partIds.join('|');
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !controlKey || !partsKey) {
      setGeometry(null);
      return undefined;
    }
    const ids = new Set(partsKey.split('|'));
    let frame = 0;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const control = [...container.querySelectorAll('[data-connection-control]')].find(
        (element) => element.dataset.connectionControl === controlKey,
      );
      const groups = [
        ...container.querySelectorAll('.arabic-script .arabic-glyph-ink[data-part]'),
      ].filter(
        (element) =>
          ids.has(element.dataset.part) &&
          (sourceIndex == null || Number(element.dataset.sourceIndex) === sourceIndex),
      );
      const byWord = new Map();
      for (const element of groups) {
        const word = element.closest('svg');
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        if (!byWord.has(word)) byWord.set(word, new Map());
        const sameWord = byWord.get(word);
        const old = sameWord.get(element.dataset.part);
        sameWord.set(
          element.dataset.part,
          old
            ? {
                partId: old.partId,
                left: Math.min(old.left, rect.left),
                top: Math.min(old.top, rect.top),
                right: Math.max(old.right, rect.right),
                bottom: Math.max(old.bottom, rect.bottom),
              }
            : {
                partId: element.dataset.part,
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
              },
        );
      }
      const targets = [...byWord.values()].flatMap((group) =>
        [...group.values()].map((rect) => ({
          ...rect,
          width: rect.right - rect.left,
          height: rect.bottom - rect.top,
        })),
      );
      const next = control
        ? connectionGeometry(
            container.getBoundingClientRect(),
            control.getBoundingClientRect(),
            targets,
          )
        : null;
      setGeometry((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    observer?.observe(container);
    for (const element of container.querySelectorAll('.arabic-script, [data-connection-control]'))
      observer?.observe(element);
    window.addEventListener('resize', schedule, { passive: true });
    document.fonts?.addEventListener?.('loadingdone', schedule);
    document.fonts?.ready.then(() => {
      if (!disposed) schedule();
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      document.fonts?.removeEventListener?.('loadingdone', schedule);
    };
  }, [containerRef, controlKey, partsKey, sourceIndex, measureKey]);
  if (!geometry || !controlKey) return null;
  return (
    <svg
      className={`arabic-connection-layer arabic-colour-${colour}`}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      aria-hidden="true"
      focusable="false"
      data-connection-part={partsKey}
      data-connection-source-index={sourceIndex == null ? undefined : sourceIndex}
      data-connection-target={controlKey}
    >
      <path className="arabic-connection-line" d={geometry.d} />
      {geometry.rings.map((ring, index) => (
        <ellipse
          key={index}
          className="arabic-connection-ring"
          data-part={ring.partId}
          cx={ring.cx}
          cy={ring.cy}
          rx={ring.rx}
          ry={ring.ry}
        />
      ))}
    </svg>
  );
}
