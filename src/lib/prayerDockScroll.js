export const PRAYER_DOCK_SCROLL_DISTANCE = 12;
export const PRAYER_DOCK_IDLE_MS = 700;

// Watch the page, not nested timetable, menu or image-preview scroll areas.
// Visibility never changes the panel's measured size or the page's scroll range.
export function observePrayerDockScroll({ panel, onChange, browser = window }) {
  const { document } = browser;
  const inFlow = browser.matchMedia('(max-height: 500px) and (orientation: landscape)');
  let previousY = Math.max(0, browser.scrollY);
  let previousWidth = browser.innerWidth;
  let distance = 0;
  let hidden = false;
  let pointerInside = false;
  let idleTimer;

  const show = () => {
    browser.clearTimeout(idleTimer);
    distance = 0;
    previousY = Math.max(0, browser.scrollY);
    if (hidden) {
      hidden = false;
      onChange(false);
    }
  };
  const onScroll = (event) => {
    if (event.target !== document) return;
    const y = Math.max(0, browser.scrollY);
    if (inFlow.matches || pointerInside || panel.contains(document.activeElement) || y === 0) {
      show();
      return;
    }
    const movement = Math.abs(y - previousY);
    previousY = y;
    if (!movement) return;
    distance += movement;
    if (!hidden && distance >= PRAYER_DOCK_SCROLL_DISTANCE) {
      hidden = true;
      onChange(true);
    }
    browser.clearTimeout(idleTimer);
    idleTimer = browser.setTimeout(show, PRAYER_DOCK_IDLE_MS);
  };
  const onPointerDown = () => {
    pointerInside = true;
    show();
  };
  const onPointerEnd = () => {
    pointerInside = false;
  };
  const onResize = () => {
    // Mobile browser bars can change viewport height during a scroll. That
    // must not reveal the panel before the gesture and its momentum finish.
    if (browser.innerWidth === previousWidth) return;
    previousWidth = browser.innerWidth;
    show();
  };
  const passive = { passive: true };
  browser.addEventListener('scroll', onScroll, passive);
  browser.addEventListener('resize', onResize, passive);
  browser.addEventListener('pointerup', onPointerEnd, passive);
  browser.addEventListener('pointercancel', onPointerEnd, passive);
  panel.addEventListener('pointerdown', onPointerDown, passive);
  panel.addEventListener('focusin', show);
  document.addEventListener('visibilitychange', show);
  inFlow.addEventListener('change', show);
  return () => {
    browser.clearTimeout(idleTimer);
    browser.removeEventListener('scroll', onScroll);
    browser.removeEventListener('resize', onResize);
    browser.removeEventListener('pointerup', onPointerEnd);
    browser.removeEventListener('pointercancel', onPointerEnd);
    panel.removeEventListener('pointerdown', onPointerDown);
    panel.removeEventListener('focusin', show);
    document.removeEventListener('visibilitychange', show);
    inFlow.removeEventListener('change', show);
  };
}
