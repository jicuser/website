export const PRAYER_DOCK_SCROLL_DISTANCE = 12;

// Watch the page, not nested timetable, menu or image-preview scroll areas.
// Visibility never changes the panel's measured size or the page's scroll range.
export function observePrayerDockScroll({ panel, onChange, browser = window, quiet = false }) {
  const { document } = browser;
  const inFlow = browser.matchMedia('(max-height: 500px) and (orientation: landscape)');
  let previousY = Math.max(0, browser.scrollY);
  let previousWidth = browser.innerWidth;
  let distance = 0;
  let upwardDistance = 0;
  let hidden = false;
  let scrollHidden = false;
  let keyboardFocus = false;
  let pointerInside = false;
  let footerVisible = false;
  let manualOpen = null;
  let focusTimer;

  const editing = () =>
    document.activeElement?.matches?.(
      'input,textarea,select,[contenteditable="true"],[contenteditable=""]',
    );
  const setHidden = (value) => {
    if (hidden === value) return;
    hidden = value;
    onChange(value);
  };
  const settle = () => {
    if (
      inFlow.matches ||
      pointerInside ||
      (keyboardFocus && panel.contains(document.activeElement))
    ) {
      setHidden(false);
    } else if (manualOpen !== null) {
      setHidden(!manualOpen);
    } else {
      setHidden(
        quiet ||
          scrollHidden ||
          (browser.innerWidth < 768 && (footerVisible || Boolean(editing()))),
      );
    }
  };

  const show = () => {
    scrollHidden = false;
    distance = 0;
    upwardDistance = 0;
    previousY = Math.max(0, browser.scrollY);
    settle();
  };
  const onScroll = (event) => {
    if (event.target !== document) return;
    const y = Math.max(0, browser.scrollY);
    if (
      inFlow.matches ||
      pointerInside ||
      (keyboardFocus && panel.contains(document.activeElement)) ||
      y === 0
    ) {
      show();
      return;
    }
    const delta = y - previousY;
    const movement = Math.abs(delta);
    previousY = y;
    if (!movement) return;
    manualOpen = null;
    if (delta < 0) {
      upwardDistance += movement;
      distance = 0;
      if (upwardDistance >= PRAYER_DOCK_SCROLL_DISTANCE) {
        show();
        return;
      }
    } else {
      upwardDistance = 0;
      distance += movement;
      if (distance >= PRAYER_DOCK_SCROLL_DISTANCE) scrollHidden = true;
    }
    settle();
  };
  const onPointerDown = () => {
    pointerInside = true;
    show();
  };
  const onPointerEnd = () => {
    pointerInside = false;
  };
  const onPagePointer = () => {
    keyboardFocus = false;
  };
  const onKeyDown = () => {
    keyboardFocus = true;
  };
  const onResize = () => {
    // Mobile browser bars can change viewport height during a scroll. That
    // must not reveal the panel before the gesture and its momentum finish.
    if (browser.innerWidth === previousWidth) return;
    previousWidth = browser.innerWidth;
    show();
  };
  const onFocus = () => {
    browser.clearTimeout(focusTimer);
    manualOpen = null;
    // Wait until focus has moved from the old field to its destination.
    focusTimer = browser.setTimeout(settle, 0);
  };
  const footer = document.querySelector?.('.jic-site-footer');
  const observer =
    footer && browser.IntersectionObserver
      ? new browser.IntersectionObserver(([entry]) => {
          footerVisible = entry.isIntersecting;
          settle();
        })
      : null;
  observer?.observe(footer);
  const passive = { passive: true };
  browser.addEventListener('scroll', onScroll, passive);
  browser.addEventListener('resize', onResize, passive);
  browser.addEventListener('pointerup', onPointerEnd, passive);
  browser.addEventListener('pointercancel', onPointerEnd, passive);
  panel.addEventListener('pointerdown', onPointerDown, passive);
  panel.addEventListener('focusin', show);
  document.addEventListener('pointerdown', onPagePointer, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('visibilitychange', show);
  document.addEventListener('focusin', onFocus);
  document.addEventListener('focusout', onFocus);
  inFlow.addEventListener('change', show);
  settle();
  const cleanup = () => {
    browser.clearTimeout(focusTimer);
    observer?.disconnect();
    browser.removeEventListener('scroll', onScroll);
    browser.removeEventListener('resize', onResize);
    browser.removeEventListener('pointerup', onPointerEnd);
    browser.removeEventListener('pointercancel', onPointerEnd);
    panel.removeEventListener('pointerdown', onPointerDown);
    panel.removeEventListener('focusin', show);
    document.removeEventListener('pointerdown', onPagePointer, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('visibilitychange', show);
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('focusout', onFocus);
    inFlow.removeEventListener('change', show);
  };
  // An explicit tap wins over automatic hiding until the next page movement.
  cleanup.toggle = () => {
    browser.clearTimeout(focusTimer);
    manualOpen = hidden;
    show();
    if (inFlow.matches) panel.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  };
  return cleanup;
}
