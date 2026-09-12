import { useMemo } from 'react';
import { useContent } from '@/context/ContentContext';
import { POSTERS_KEY, posterCatalogue } from '@/lib/posters';
export { POSTERS_KEY, posterImage } from '@/lib/posters';

// One published catalogue powers website pages, both TV modes and every picker.
export default function usePosters() {
  const { getContent } = useContent();
  const raw = getContent(POSTERS_KEY, null);
  return useMemo(() => posterCatalogue(raw), [raw]);
}
