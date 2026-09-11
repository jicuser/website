import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { IMAGES } from '@/content/images';

export function useSiteImages() {
  const [images, setImages] = useState(IMAGES);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('content_value')
        .eq('content_key', 'site_images')
        .maybeSingle();
      if (!alive || error || !data?.content_value) return;
      try {
        const saved = JSON.parse(data.content_value);
        if (saved && typeof saved === 'object') setImages({ ...IMAGES, ...saved });
      } catch {}
    };
    load();
    const refresh = () => load();
    window.addEventListener('jic-content-updated', refresh);
    return () => {
      alive = false;
      window.removeEventListener('jic-content-updated', refresh);
    };
  }, []);
  return images;
}
