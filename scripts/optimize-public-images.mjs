import fs from 'node:fs';
import sharp from 'sharp';

const sources = [
  'jic-aerial-sunset.jpg',
  ...fs
    .readdirSync('public/posters')
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .map((name) => `posters/${name}`),
];
fs.mkdirSync('public/optimized', { recursive: true });
const images = {};
for (const source of sources) {
  const output = `/optimized/${source
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, '.webp')}`;
  await sharp(`public/${source}`)
    .rotate()
    .resize({ width: source.startsWith('posters/') ? 640 : 1150, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(`public${output}`);
  images[`/${source}`] = output;
}
fs.writeFileSync(
  'src/content/optimizedImages.js',
  '// Smaller display assets; original posters remain available for zoom and download.\n' +
    `export const OPTIMIZED_IMAGES = ${JSON.stringify(images, null, 2)};\n`,
);
