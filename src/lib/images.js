export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export function validateImage(file) {
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file?.type];
  if (!ext || !file.size || file.size > 8 * 1024 * 1024) {
    throw new Error('Choose a JPG, PNG or WebP picture under 8 MB. On iPhone, export HEIC photos as JPG first.');
  }
  return ext;
}
