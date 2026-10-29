export function installPlatform(navigator = {}) {
  if (
    /iPhone|iPad|iPod/.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
    return 'ios';
  return /Android/i.test(navigator.userAgent || '') ? 'android' : 'other';
}
export function isInstalledApp(window) {
  return (
    window.navigator?.standalone === true ||
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches)
  );
}
export function requestAppInstall() {
  window.dispatchEvent(new Event('jic-install-app'));
}
