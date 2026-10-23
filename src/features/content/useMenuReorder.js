import { useEffect, useRef, useState } from 'react';

/** Pointer handles work on touch screens; the same handles also offer move buttons. */
export default function useMenuReorder(onReorder) {
  const session = useRef(null);
  const frame = useRef(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState(null);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const findTarget = () => {
    const current = session.current;
    if (!current?.moved) return;
    const row = document
      .elementsFromPoint(current.x, current.y)
      .map((node) => node.closest?.('[data-menu-path]'))
      .find((node) => node?.dataset.menuParent === (current.parent || ''));
    const index = current.items.findIndex((item) => item.path === row?.dataset.menuPath);
    if (index < 0 || index === current.target) return;
    current.target = index;
    setDrag({ ...current });
  };

  const scroll = () => {
    const current = session.current;
    if (!current) return;
    if (current.moved) {
      const top = Math.max(
        0,
        document.querySelector('.admin-toolbar')?.getBoundingClientRect().bottom || 0,
      );
      const delta = current.y < top + 48 ? -8 : current.y > innerHeight - 48 ? 8 : 0;
      if (delta) {
        window.scrollBy(0, delta);
        findTarget();
      }
    }
    frame.current = requestAnimationFrame(scroll);
  };

  const finish = (event, cancelled = false) => {
    const current = session.current;
    if (!current || event.pointerId !== current.pointerId) return;
    session.current = null;
    cancelAnimationFrame(frame.current);
    setDrag(null);
    suppressClick.current = current.moved || cancelled;
    if (event.currentTarget.hasPointerCapture(current.pointerId))
      event.currentTarget.releasePointerCapture(current.pointerId);
    if (!cancelled && current.moved)
      onReorder(current.items, current.path, current.target, current.parent);
  };

  const handle = (items, path, parent) => ({
    onPointerDown: (event) => {
      suppressClick.current = false;
      if (event.button !== 0 || event.isPrimary === false || items.length < 2) return;
      const current = {
        items,
        path,
        parent,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        target: items.findIndex((item) => item.path === path),
        moved: false,
      };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        return;
      }
      session.current = current;
      frame.current = requestAnimationFrame(scroll);
    },
    onPointerMove: (event) => {
      const current = session.current;
      if (!current || current.pointerId !== event.pointerId) return;
      current.x = event.clientX;
      current.y = event.clientY;
      if (
        !current.moved &&
        Math.hypot(current.x - current.startX, current.y - current.startY) > 6
      ) {
        current.moved = true;
        setDrag({ ...current });
      }
      findTarget();
    },
    onPointerUp: (event) => finish(event),
    onPointerCancel: (event) => finish(event, true),
    onLostPointerCapture: (event) => finish(event, true),
    onKeyDown: (event) => {
      if (event.key === 'Escape' && session.current) {
        finish({ currentTarget: event.currentTarget, pointerId: session.current.pointerId }, true);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        onReorder(
          items,
          path,
          items.findIndex((item) => item.path === path) + (event.key === 'ArrowUp' ? -1 : 1),
          parent,
        );
      }
    },
  });

  return {
    drag,
    handle,
    consumeDragClick: () => {
      const suppressed = suppressClick.current;
      suppressClick.current = false;
      return suppressed;
    },
  };
}
