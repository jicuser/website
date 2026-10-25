import { useEffect, useState } from 'react';

const KEY = 'jic-reading-display-v1';
const defaults = { fontSize: 32, showMeaning: true, showTransliteration: true };

/** Shared display preferences; no reading choices are sent to the server. */
export default function useReadingDisplay() {
  const [display, setDisplay] = useState(() => {
    try {
      const value = JSON.parse(window.localStorage.getItem(KEY) || 'null');
      return {
        fontSize: Number.isInteger(value?.fontSize) && value.fontSize >= 24 && value.fontSize <= 48 && value.fontSize % 2 === 0 ? value.fontSize : 32,
        showMeaning: typeof value?.showMeaning === 'boolean' ? value.showMeaning : true,
        showTransliteration: typeof value?.showTransliteration === 'boolean' ? value.showTransliteration : true,
      };
    } catch { return { ...defaults }; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(display)); }
    catch { /* Reading still works when device storage is blocked. */ }
  }, [display]);
  const update = (patch) => setDisplay((previous) => ({ ...previous, ...patch }));
  return {
    ...display,
    setFontSize: (fontSize) => update({ fontSize }),
    setShowMeaning: (showMeaning) => update({ showMeaning }),
    setShowTransliteration: (showTransliteration) => update({ showTransliteration }),
  };
}
