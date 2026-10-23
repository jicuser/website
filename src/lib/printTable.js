export function printTable(node, title) {
  if (!node) throw new Error('The table is not ready to print.');
  const frame = document.createElement('iframe');
  frame.title = 'Print table';
  Object.assign(frame.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '900px',
    height: '700px',
    border: '0',
  });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    throw new Error('Printing is unavailable in this browser.');
  }
  doc.open();
  doc.write(
    '<!doctype html><html><head><meta charset="utf-8"><style>body{font:12px system-ui;color:#111;padding:20px}h1{font-size:20px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:7px;border:1px solid #aaa}thead{display:table-header-group}tr{break-inside:avoid}button,a{color:inherit;text-decoration:none}[data-print-exclude]{display:none} @page{margin:12mm}</style></head><body></body></html>',
  );
  doc.close();
  doc.title = title;
  const heading = doc.createElement('h1');
  heading.textContent = title;
  doc.body.appendChild(heading);
  doc.body.appendChild(doc.importNode(node, true));
  const cleanup = () => frame.remove();
  frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    }),
  );
  setTimeout(cleanup, 60000);
}
