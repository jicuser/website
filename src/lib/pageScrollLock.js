const locks = new WeakMap();

// Freeze the page behind a modal on touch browsers; nested dialogs share one lock.
export function lockPageScroll(browser = window) {
  const { document } = browser;
  let lock = locks.get(document);
  if (!lock) {
    const { body, documentElement } = document;
    const x = browser.scrollX;
    const y = browser.scrollY;
    const properties = ['position', 'top', 'left', 'right', 'width', 'overflow', 'padding-right'];
    const saved = properties.map((name) => [
      name,
      body.style.getPropertyValue(name),
      body.style.getPropertyPriority(name),
    ]);
    const gutter = Math.max(0, browser.innerWidth - documentElement.clientWidth);
    const padding = Number.parseFloat(browser.getComputedStyle(body).paddingRight) || 0;
    Object.assign(body.style, {
      position: 'fixed',
      top: `${-y}px`,
      left: `${-x}px`,
      right: '0',
      width: '100%',
      overflow: 'hidden',
    });
    if (gutter) body.style.paddingRight = `${padding + gutter}px`;
    lock = {
      count: 0,
      restore() {
        saved.forEach(([name, value, priority]) => {
          if (value) body.style.setProperty(name, value, priority);
          else body.style.removeProperty(name);
        });
        browser.scrollTo({ left: x, top: y, behavior: 'instant' });
      },
    };
    locks.set(document, lock);
  }
  lock.count++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--lock.count === 0) {
      locks.delete(document);
      lock.restore();
    }
  };
}
