import { useMemo } from 'react';
import { useContent } from '@/context/ContentContext';
import { PROGRAMMES } from '@/content/programmes';
import { safeWebUrl } from '@/lib/video';

export const POSTERS_KEY = 'programme_posters';
export const posterImage = (url) =>
  typeof url === 'string' && (/^\/(?!\/)[^\\]*$/.test(url) || Boolean(safeWebUrl(url)));

// One catalogue powers the website, the picker and the TV. Bundled posters remain
// the initial catalogue until an editor explicitly publishes a replacement.
export default function usePosters() {
  const { getContent } = useContent();
  const raw = getContent(POSTERS_KEY, null);
  return useMemo(() => {
    try {
      const posters = raw === null ? PROGRAMMES : JSON.parse(raw);
      if (!Array.isArray(posters)) return PROGRAMMES;
      return posters
        .filter(
          (p) =>
            p && typeof p.id === 'string' && typeof p.title === 'string' && posterImage(p.image),
        )
        .map((p) => ({
          ...p,
          groups: Array.isArray(p.groups) ? p.groups : [],
          to: typeof p.to === 'string' && /^\/(?!\/)[^\\]*$/.test(p.to) ? p.to : '/contact',
        }));
    } catch {
      return PROGRAMMES;
    }
  }, [raw]);
}
