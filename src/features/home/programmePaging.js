/** Keep the full website's three-row feed; compact mode is explicitly requested. */
export function programmePageSize(compact = false, listing = false) {
  return compact && !listing ? 2 : 3;
}

/** A resize or a shorter feed must never leave inaccessible navigation controls. */
export function programmePageIndex(scrollLeft, width, pagesCount) {
  if (!Number.isFinite(scrollLeft) || !Number.isFinite(width) || width <= 0 || pagesCount <= 0) return 0;
  return Math.min(pagesCount - 1, Math.max(0, Math.round(scrollLeft / width)));
}
