const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rounded = (value, snap) => (snap ? Math.round(value) : Math.round(value * 100) / 100);

// Keep the opposite corner fixed during a resize. All clients store percentages.
export function transformLayoutRect(rect, dx, dy, handle = 'move', snap = true) {
  if (handle === 'move')
    return {
      x: clamp(rounded(rect.x + dx, snap), 0, 100 - rect.width),
      y: clamp(rounded(rect.y + dy, snap), 0, 100 - rect.height),
      width: rect.width,
      height: rect.height,
    };
  let left = rect.x,
    top = rect.y,
    right = rect.x + rect.width,
    bottom = rect.y + rect.height;
  if (handle.includes('w')) left = clamp(rounded(left + dx, snap), 0, right - 5);
  if (handle.includes('e')) right = clamp(rounded(right + dx, snap), left + 5, 100);
  if (handle.includes('n')) top = clamp(rounded(top + dy, snap), 0, bottom - 5);
  if (handle.includes('s')) bottom = clamp(rounded(bottom + dy, snap), top + 5, 100);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function moveImageCrop(position = { x: 50, y: 50 }, dx, dy) {
  return {
    x: clamp(Math.round(position.x - dx), 0, 100),
    y: clamp(Math.round(position.y - dy), 0, 100),
  };
}
