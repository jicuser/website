/** Export the approved vector sources without redrawing their geometry. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const source = 'scripts/brand-source';
const destination = 'public/brand';
mkdirSync(destination, { recursive: true });
const master = readFileSync(`${source}/approved-master.svg`, 'utf8');
const lettering = master.match(/<g id="outlined-lettering"[^>]*>[\s\S]*?<\/g>/)[0];
const definitions = master.match(/<defs>[\s\S]*?<\/defs>/)[0];
const masterArt = master.slice(master.indexOf('</defs>') + 7, master.lastIndexOf('</svg>'));
const entranceArt = masterArt.replace(lettering, '').replace(/<path id="ground-line"[^>]*\/>/, '');
const wrap = (name, width, height, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Jamatia Islamic Centre"><title>Jamatia Islamic Centre — ${name}</title>${body}</svg>\n`;
const variants = [
  'horizontal',
  'centred',
  'compact',
  'pillars',
  'arch',
  'minaret',
  'minaret-compact',
];
const artwork = Object.fromEntries(
  variants.map((name) => [name, readFileSync(`${source}/${name}.svg`, 'utf8')]),
);
artwork.wordmark = wrap(
  'Lettering',
  680,
  265,
  lettering.replace(' transform="translate(299,230)"', ''),
);
artwork.entrance = wrap(
  'Entrance symbol',
  926,
  1064,
  `${definitions}<g transform="translate(-180 -62)">${entranceArt}</g>`,
);

for (const [name, original] of Object.entries(artwork)) {
  for (const theme of ['light', 'dark']) {
    // Only the lettering changes in dark mode. Stone, glazing and finials stay intact.
    const svg = theme === 'dark' ? original.replaceAll('#06162f', '#F4F6FA') : original;
    const path = `${destination}/jic-${name}-${theme}`;
    writeFileSync(`${path}.svg`, svg);
    await sharp(Buffer.from(svg))
      .resize({ width: 1200, height: 1200, fit: 'inside' })
      .png()
      .toFile(`${path}.png`);
  }
}

writeFileSync(
  `${destination}/jic-variations.svg`,
  readFileSync(`${source}/variations.svg`, 'utf8'),
);

// Favicon and home-screen artwork use the same entrance, without tiny lettering.
const tile = (scale, x, y) =>
  wrap(
    'App icon',
    512,
    512,
    `<rect width="512" height="512" fill="#F1F4F5"/>${definitions}<g transform="translate(${x} ${y}) scale(${scale})"><g transform="translate(-180 -62)">${entranceArt}</g></g>`,
  );
writeFileSync('public/favicon.svg', tile(0.447, 49, 18));
mkdirSync('public/icons', { recursive: true });
await sharp(Buffer.from(tile(0.32, 108, 84)))
  .png()
  .toFile('public/icons/jic-icon-maskable-512.png');
console.log(`Exported ${Object.keys(artwork).length} approved logo compositions in SVG and PNG.`);
