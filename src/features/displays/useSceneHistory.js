import { useCallback, useEffect, useRef, useState } from 'react';

const clone = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function useSceneHistory(key) {
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });

  const sync = useCallback(() => {
    setCounts({ undo: undoRef.current.length, redo: redoRef.current.length });
  }, []);

  useEffect(() => {
    undoRef.current = [];
    redoRef.current = [];
    sync();
  }, [key, sync]);

  const checkpoint = useCallback((scene) => {
    if (!scene) return;
    const snapshot = clone(scene);
    const last = undoRef.current.at(-1);
    if (last && same(last, snapshot)) return;
    undoRef.current = [...undoRef.current.slice(-29), snapshot];
    redoRef.current = [];
    sync();
  }, [sync]);

  const undo = useCallback((current, apply) => {
    const previous = undoRef.current.at(-1);
    if (!previous) return;
    undoRef.current = undoRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current.slice(-29), clone(current)];
    apply(clone(previous));
    sync();
  }, [sync]);

  const redo = useCallback((current, apply) => {
    const next = redoRef.current.at(-1);
    if (!next) return;
    redoRef.current = redoRef.current.slice(0, -1);
    undoRef.current = [...undoRef.current.slice(-29), clone(current)];
    apply(clone(next));
    sync();
  }, [sync]);

  return {
    canUndo: counts.undo > 0,
    canRedo: counts.redo > 0,
    checkpoint,
    undo,
    redo,
  };
}
