import { useEffect, useState } from 'react';
import { isInstalledApp } from '@/lib/appInstall';
export default function useInstalledApp() {
  const [installed, setInstalled] = useState(
    () => typeof window !== 'undefined' && isInstalledApp(window),
  );
  useEffect(() => {
    const query = window.matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(isInstalledApp(window));
    query.addEventListener('change', update);
    window.addEventListener('pageshow', update);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('pageshow', update);
    };
  }, []);
  return installed;
}
