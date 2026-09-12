const MAX_ENTRIES = 50;

export function rememberPage(entries, index, pathname, navigationType) {
  const kept = entries.filter(
    (entry) => entry.index !== index && (navigationType !== 'PUSH' || entry.index < index),
  );
  return [...kept, { index, pathname }].slice(-MAX_ENTRIES);
}

export function readNavigationHistory(storage) {
  try {
    const entries = JSON.parse(storage.getItem('jic-navigation-history'));
    if (!Array.isArray(entries)) return [];
    return entries
      .filter(
        (entry) =>
          Number.isSafeInteger(entry?.index) &&
          entry.index >= 0 &&
          typeof entry.pathname === 'string' &&
          entry.pathname.startsWith('/'),
      )
      .slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}
