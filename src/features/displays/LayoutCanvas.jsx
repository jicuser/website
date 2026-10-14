import React, { useRef } from 'react';
import { layerStyle } from '../../../supabase/functions/_shared/tv-scenes.js';
import { transformLayoutRect, moveImageCrop } from '@/lib/layoutGestures';
import { TvScaledPreview } from './TvFinalPreview';
import '@/styles/layout-canvas.css';

const corners = [
  ['nw', 'top left'],
  ['ne', 'top right'],
  ['sw', 'bottom left'],
  ['se', 'bottom right'],
];

// Shared touch surface for automatic layouts and presentation scenes.
export default function LayoutCanvas({
  layers,
  selectedId,
  onSelect,
  onEdit,
  onChange,
  onCheckpoint,
  orientation = 'landscape',
  disabled = false,
  snap = true,
  crop = false,
  labelFor = (layer) => layer.type,
  children,
}) {
  const canvas = useRef(null);
  const gesture = useRef(null);
  const selected = layers.find((layer) => layer.id === selectedId && !layer.hidden);

  function begin(event, layer, handle = 'move') {
    if (disabled || event.button !== 0 || event.isPrimary === false || gesture.current) return;
    // A first tap selects. Only the selected item captures movement, leaving
    // ordinary page scrolling available through the rest of the canvas.
    if (layer.id !== selectedId) return;
    const bounds = canvas.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    event.preventDefault();
    event.stopPropagation();
    gesture.current = {
      layer,
      handle,
      bounds,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function move(event) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (
      disabled ||
      start.layer.id !== selectedId ||
      !layers.some((layer) => layer.id === start.layer.id)
    ) {
      gesture.current = null;
      return;
    }
    const px = event.clientX - start.startX,
      py = event.clientY - start.startY;
    if (!start.started) {
      if (Math.hypot(px, py) < 4) return;
      start.started = true;
      onCheckpoint?.();
    }
    const dx = (px / start.bounds.width) * 100,
      dy = (py / start.bounds.height) * 100;
    if (crop && start.handle === 'move') {
      onChange({
        ...start.layer,
        image_fit: 'cover',
        image_position: moveImageCrop(
          start.layer.image_position,
          (dx / start.layer.width) * 100,
          (dy / start.layer.height) * 100,
        ),
      });
    } else {
      onChange({ ...start.layer, ...transformLayoutRect(start.layer, dx, dy, start.handle, snap) });
    }
  }

  function finish(event) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    gesture.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!start.started && start.handle === 'move') onEdit?.(start.layer);
  }

  function cancel(event) {
    if (gesture.current?.pointerId === event.pointerId) gesture.current = null;
  }

  function keyDown(event, layer, handle = 'move') {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(layer.id);
      onEdit?.(layer);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (layer.id !== selectedId) onSelect(layer.id);
    onCheckpoint?.();
    const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (crop && layer.id === selectedId && handle === 'move')
      onChange({
        ...layer,
        image_fit: 'cover',
        image_position: moveImageCrop(layer.image_position, dx, dy),
      });
    else
      onChange({
        ...layer,
        ...transformLayoutRect(layer, dx, dy, event.shiftKey ? 'se' : handle, false),
      });
  }

  const pointerProps = (layer, handle) => ({
    onPointerDown: (event) => begin(event, layer, handle),
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
    onKeyDown: (event) => keyDown(event, layer, handle),
  });

  return (
    <div
      ref={canvas}
      className={`layout-canvas ${orientation === 'portrait' ? 'is-portrait' : ''} ${crop ? 'is-cropping' : ''}`}
      aria-label="Editable display layout"
    >
      <div className="layout-canvas-render" aria-hidden="true">
        <TvScaledPreview orientation={orientation}>{children}</TvScaledPreview>
      </div>
      {!layers.some((layer) => !layer.hidden) && (
        <p className="layout-canvas-empty">Add content to start this layout.</p>
      )}
      {layers
        .filter((layer) => !layer.hidden)
        .map((layer) => {
          const index = layers.indexOf(layer);
          return (
            <button
              key={layer.id}
              type="button"
              className={`layout-layer-hit ${layer.id === selectedId ? 'is-selected' : ''} ${layer.type === 'empty' ? 'is-empty' : ''}`}
              style={{ ...layerStyle(layer), zIndex: index + 1 }}
              aria-label={`Select ${labelFor(layer, index)}`}
              aria-pressed={layer.id === selectedId}
              disabled={disabled}
              onClick={() => {
                if (layer.id !== selectedId) onSelect(layer.id);
              }}
              onDoubleClick={() => onEdit?.(layer)}
              {...pointerProps(layer, 'move')}
            >
              {layer.type === 'empty' && <span>+ Select input</span>}
            </button>
          );
        })}
      {selected && !disabled && (
        <div className="layout-selection-frame" style={layerStyle(selected)}>
          {corners.map(([corner, label]) => (
            <button
              key={corner}
              type="button"
              className={`layout-corner is-${corner}`}
              aria-label={`Resize ${label} corner`}
              {...pointerProps(selected, corner)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
