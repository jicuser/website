// @ts-check
/** @typedef {import('./contracts.js').AccountOriginSettings} AccountOriginSettings */

export const ACCOUNT_PRODUCTION_ORIGIN = 'https://jicmasjid.org';

/** @param {unknown} value */
function parseOrigin(value) {
  if (typeof value !== 'string' || !value || value.length > 2048)
    throw new Error('Invalid account return configuration.');
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid account return configuration.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    ![url.origin, `${url.origin}/`].includes(value) ||
    url.hostname.includes('*')
  )
    throw new Error('Invalid account return configuration.');
  return url;
}

/** @param {URL} url */
const loopback = (url) => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

/**
 * Only the JIC origin, loopback development or one explicitly approved preview
 * may receive an account return. Values are never included in errors.
 * @param {string | undefined} [currentOrigin]
 * @param {AccountOriginSettings} [settings]
 */
export function accountReturnOrigin(currentOrigin, settings = import.meta.env ?? {}) {
  const preview = settings.VITE_ACCOUNT_PREVIEW_ORIGIN
    ? parseOrigin(settings.VITE_ACCOUNT_PREVIEW_ORIGIN)
    : null;
  if (preview && (preview.protocol !== 'https:' || loopback(preview)))
    throw new Error('Invalid approved account preview configuration.');
  /** @param {URL} url */
  const trusted = (url) =>
    url.origin === ACCOUNT_PRODUCTION_ORIGIN ||
    (settings.DEV === true && loopback(url)) ||
    url.origin === preview?.origin;
  const configured = settings.VITE_ACCOUNT_RETURN_ORIGIN
    ? parseOrigin(settings.VITE_ACCOUNT_RETURN_ORIGIN)
    : null;
  if (configured && !trusted(configured))
    throw new Error('Unapproved account return configuration.');
  const current = currentOrigin === undefined ? null : parseOrigin(currentOrigin);
  if (current && !trusted(current)) throw new Error('Unapproved account return origin.');
  return configured?.origin ?? current?.origin ?? ACCOUNT_PRODUCTION_ORIGIN;
}

/**
 * @param {import('./contracts.js').AccountReturnPath} path
 * @param {string | undefined} [currentOrigin]
 * @param {AccountOriginSettings} [settings]
 */
export function accountReturnUrl(path, currentOrigin, settings) {
  if (!['/portal', '/admin/setup'].includes(path)) throw new Error('Invalid account return path.');
  return new URL(path, accountReturnOrigin(currentOrigin, settings)).href;
}
