import React from 'react';
import { tvBoardLayout } from '@/lib/tvBoardLayouts';

const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

/** An illustrative miniature using the same block positions as the real preset. */
export default function TvLayoutThumbnail({ layoutId, orientation, scene: suppliedScene }) {
  const scene = suppliedScene || tvBoardLayout(layoutId, orientation);
  return (
    <span
      className={`tv-design-thumbnail ${orientation === 'portrait' ? 'is-portrait' : ''}`}
      aria-hidden="true"
    >
      <span className="tv-design-thumbnail-canvas">
        {scene.layers
          .filter((layer) => !layer.hidden && layer.type !== 'empty')
          .map((layer) => (
            <span
              key={layer.id}
              className={`tv-design-mini-block is-${layer.type} ${layer.layout === 'horizontal' ? 'is-horizontal' : ''}`}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                height: `${layer.height}%`,
              }}
            >
              {layer.type === 'brand' && <b>JIC</b>}
              {layer.type === 'clock' && <span>Clock</span>}
              {layer.type === 'ramadan' && (
                <>
                  <b>
                    {layer.ramadan_kind === 'daily'
                      ? 'Daily Giving'
                      : layer.ramadan_kind === 'suhoor'
                        ? 'Suhoor'
                        : 'Iftar'}
                  </b>
                  <span className="tv-design-mini-days">
                    {Array.from({ length: 30 }, (_, index) => (
                      <i key={index} />
                    ))}
                  </span>
                </>
              )}
              {['poster', 'poster-next'].includes(layer.type) && (
                <>
                  <i />
                  <b>Notices</b>
                  <i />
                </>
              )}
              {layer.type === 'text' && <span>{layer.text || 'Notice'}</span>}
              {layer.type === 'state' && <b>{scene.name}</b>}
              {['input', 'youtube', 'video', 'camera', 'schedule'].includes(layer.type) && (
                <b>Video</b>
              )}
              {layer.type === 'next' && (
                <>
                  <span>Next jama’ah</span>
                  <b>{layoutId === 'countdown' ? 'Countdown' : 'Prayer time'}</b>
                </>
              )}
              {layer.type === 'times' &&
                prayers.map((prayer) => (
                  <span key={prayer}>
                    {prayer}
                    <i />
                  </span>
                ))}
            </span>
          ))}
      </span>
    </span>
  );
}
