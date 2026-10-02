import { validateImage } from './images.js';

// Client-side format validation, not malware scanning. Keep storage policies enforced.
export async function validateImageContents(file) {
  const extension = validateImage(file);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (start, length) => String.fromCharCode(...bytes.slice(start, start + length));
  const valid = {
    jpg: bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    png: [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte),
    webp: ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP',
  };
  if (!valid[extension]) throw new Error('The file contents do not match its image type.');
  return extension;
}

// Inject the client and bucket so this service can be reused without JIC configuration.
export function createImageUploader(client, bucket = 'site-images') {
  return async (file, folder = 'admin') => {
    if (
      typeof folder !== 'string' ||
      !folder.split('/').every((part) => /^[a-zA-Z0-9_-]+$/.test(part))
    ) {
      throw new Error('Invalid image folder.');
    }
    const extension = await validateImageContents(file);
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };
}
