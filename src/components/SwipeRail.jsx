import React, { useId, useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Native scrolling keeps vertical page swipes and browser back gestures intact. */
export default function SwipeRail({ title, children, className }) {
  const id = useId();
  const rail = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const node = rail.current;
    const update = () =>
      setEdges({
        start: node.scrollLeft < 2,
        end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2,
      });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    node.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', update);
    };
  }, [children]);
  function move(direction) {
    const node = rail.current;
    node.scrollBy({
      left: direction * node.clientWidth * 0.85,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
  return (
    <section className={cn('jic-rail-section', className)} aria-labelledby={`${id}-heading`}>
      <div className="jic-rail-heading">
        <h2 id={`${id}-heading`}>{title}</h2>
        <div className="jic-rail-controls">
          <button
            type="button"
            aria-label={`Previous ${title.toLowerCase()}`}
            aria-controls={id}
            disabled={edges.start}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label={`Next ${title.toLowerCase()}`}
            aria-controls={id}
            disabled={edges.end}
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        id={id}
        ref={rail}
        className="jic-swipe-rail"
        role="region"
        aria-label={title}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            move(event.key === 'ArrowRight' ? 1 : -1);
          }
        }}
      >
        {children}
      </div>
    </section>
  );
}
