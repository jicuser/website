export const NAVIGATION_CONTENT_KEY = 'site_navigation';

const safePath = (value) => typeof value === 'string' && /^\/(?!\/)[^?#\s]*$/.test(value);
const label = (value) => (typeof value === 'string' ? value.trim().slice(0, 80) : '');
const order = (value) =>
  Array.isArray(value) ? [...new Set(value.filter(safePath))].slice(0, 200) : [];

/** Tolerate old or malformed saved settings without losing the built-in menu. */
export function readNavigationConfiguration(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const labels = Object.fromEntries(
      Object.entries(value?.labels || {})
        .filter(([path, name]) => safePath(path) && label(name))
        .map(([path, name]) => [path, label(name)]),
    );
    const children = Object.fromEntries(
      Object.entries(value?.children || {})
        .filter(([path]) => safePath(path))
        .map(([path, paths]) => [path, order(paths)]),
    );
    return { labels, order: order(value?.order), children };
  } catch {
    return { labels: {}, order: [], children: {} };
  }
}

export function orderedNavigation(items, paths = []) {
  const rank = new Map(paths.map((path, index) => [path, index]));
  return [...items].sort(
    (a, b) => (rank.get(a.path) ?? paths.length) - (rank.get(b.path) ?? paths.length),
  );
}

export function navigationName(getContent, path, fallback) {
  return (
    readNavigationConfiguration(getContent(NAVIGATION_CONTENT_KEY, '{}')).labels[path] || fallback
  );
}

export function presentNavigation(groups, configuration) {
  return orderedNavigation(
    groups.map((group) => ({
      ...group,
      ...(configuration.labels[group.path]
        ? { name: configuration.labels[group.path], customName: true }
        : {}),
      ...(configuration.children[group.path]?.length
        ? { childOrder: configuration.children[group.path] }
        : {}),
      children: orderedNavigation(
        (group.children || []).map((child) => ({
          ...child,
          // Overview labels describe their parent; renaming the parent must not
          // make two adjacent links repeat that name.
          ...(child.path !== group.path && configuration.labels[child.path]
            ? { name: configuration.labels[child.path] }
            : {}),
        })),
        configuration.children[group.path],
      ),
    })),
    configuration.order,
  );
}
