// Reuse our approved SVG for browser icons and system media artwork.
// Asset generation only; sharp is provided by the development runtime.
const fs = require('node:fs');
const sharp = require('sharp');
(async () => {
  fs.mkdirSync('public/icons', { recursive: true });
  fs.copyFileSync('public/favicon.svg', 'public/icons/jic-icon.svg');
  const images = new Map();
  for (const size of [16, 32, 48, 180, 192, 512]) {
    const png = await sharp('public/favicon.svg').resize(size, size).png().toBuffer();
    images.set(size, png);
    fs.writeFileSync(`public/icons/jic-icon-${size}.png`, png);
  }
  fs.copyFileSync('public/icons/jic-icon-180.png', 'public/apple-touch-icon.png');
  const sizes = [16, 32, 48], header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, index) => {
    const at = 6 + index * 16, png = images.get(size);
    header[at] = size; header[at + 1] = size;
    header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(png.length, at + 8); header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  fs.writeFileSync('public/favicon.ico', Buffer.concat([header, ...sizes.map(size => images.get(size))]));
})();
