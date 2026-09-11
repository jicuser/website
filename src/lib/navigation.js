/** Only same-site paths are suitable for CMS-driven React Router links. */
export function internalPath(value, fallback = '/') {
  if (
    typeof value !== 'string' ||
    !/^\/(?!\/)/.test(value) ||
    /[\\\s]|%5c|%2f/i.test(value) ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  )
    return fallback;
  return value;
}
