// Lazy routes and timetable data may arrive after navigation has finished.
export function scrollToAnchor(hash) {
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed shared URL must not break the page.
  }
  let frame;
  let timeout;
  let observer;
  let found = false;
  const stopWatching = () => {
    observer?.disconnect();
    window.clearTimeout(timeout);
  };
  const findTarget = () => {
    const target = document.getElementById(id);
    if (!target || found) return;
    found = true;
    stopWatching();
    frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
    });
  };
  findTarget();
  if (!found) {
    observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    timeout = window.setTimeout(stopWatching, 10000);
  }
  return () => {
    stopWatching();
    window.cancelAnimationFrame(frame);
  };
}
