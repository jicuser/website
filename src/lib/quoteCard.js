export function safeQuoteSource(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
const escape = (value) => String(value).replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
export function quoteCardSvg(quote, { title, speaker }) {
  if (!quote?.text || quote.text.length > 400) throw Error('Choose a reviewed quote of up to 400 characters.');
  const lines = [];
  for (const word of quote.text.split(/\s+/)) {
    if (!lines.length || `${lines.at(-1)} ${word}`.length > 37) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  const height = Math.max(1080, 360 + lines.length * 62);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}"><rect width="1080" height="${height}" fill="#101c2c"/><path d="M80 80H1000M80 ${height - 80}H1000" stroke="#d39f27" stroke-width="3"/><text x="90" y="160" fill="#d39f27" font-family="sans-serif" font-size="28">${escape(String(title).slice(0, 55))}</text><g fill="#fffaf0" font-family="sans-serif" font-size="45">${lines.map((line, i) => `<text x="90" y="${260 + i * 62}">${escape(line)}</text>`).join('')}</g><text x="90" y="${height - 180}" fill="#d39f27" font-family="sans-serif" font-size="28">${escape(String(speaker || 'Talk excerpt').slice(0, 60))}</text><text x="90" y="${height - 130}" fill="#e3dfd4" font-family="sans-serif" font-size="23">${escape(String(quote.reference || 'Reviewed transcript excerpt').slice(0, 75))}</text></svg>`;
}
export async function downloadQuoteCard(quote, talk, format = 'png') {
  const svg = quoteCardSvg(quote, talk);
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  let target = source;
  try {
    if (format === 'png') {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = source; });
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw Error('Could not create quote image.');
      target = URL.createObjectURL(blob);
    }
    const anchor = document.createElement('a'); anchor.href = target; anchor.download = `talk-quote.${format}`; anchor.click();
  } finally { setTimeout(() => { URL.revokeObjectURL(source); if (target !== source) URL.revokeObjectURL(target); }, 5000); }
}
