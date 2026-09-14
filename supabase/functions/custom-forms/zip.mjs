// ZIP "store" mode keeps existing image/PDF/ZIP attachments unchanged. No archive is ever extracted.
const encoder = new TextEncoder();
const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export function createZip(files) {
  if (!Array.isArray(files) || files.length > 51) throw new Error('Too many export files.');
  const entries = [], names = new Set();
  let offset = 0, total = 0;
  for (const file of files) {
    if (typeof file.name !== 'string' || file.name.length > 240 || file.name.startsWith('/') || file.name.split('/').some((part) => !part || part === '.' || part === '..') || /[\\\u0000-\u001f]/.test(file.name) || names.has(file.name) || !(file.bytes instanceof Uint8Array)) throw new Error('Invalid export filename.');
    names.add(file.name);
    total += file.bytes.length;
    if (total > 28 * 1024 * 1024) throw new Error('Select fewer responses for this export.');
    const name = encoder.encode(file.name), crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length), header = new DataView(local.buffer);
    header.setUint32(0, 0x04034b50, true); header.setUint16(4, 20, true); header.setUint16(6, 0x0800, true);
    header.setUint16(12, 33, true); header.setUint32(14, crc, true); header.setUint32(18, file.bytes.length, true);
    header.setUint32(22, file.bytes.length, true); header.setUint16(26, name.length, true); local.set(name, 30);
    const central = new Uint8Array(46 + name.length), directory = new DataView(central.buffer);
    directory.setUint32(0, 0x02014b50, true); directory.setUint16(4, 20, true); directory.setUint16(6, 20, true);
    directory.setUint16(8, 0x0800, true); directory.setUint16(14, 33, true); directory.setUint32(16, crc, true);
    directory.setUint32(20, file.bytes.length, true); directory.setUint32(24, file.bytes.length, true);
    directory.setUint16(28, name.length, true); directory.setUint32(42, offset, true); central.set(name, 46);
    entries.push({ local, bytes: file.bytes, central }); offset += local.length + file.bytes.length;
  }
  const directorySize = entries.reduce((sum, entry) => sum + entry.central.length, 0);
  const result = new Uint8Array(offset + directorySize + 22);
  let cursor = 0;
  for (const entry of entries) { result.set(entry.local, cursor); cursor += entry.local.length; result.set(entry.bytes, cursor); cursor += entry.bytes.length; }
  for (const entry of entries) { result.set(entry.central, cursor); cursor += entry.central.length; }
  const end = new DataView(result.buffer, cursor, 22);
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, directorySize, true); end.setUint32(16, offset, true);
  return result;
}
