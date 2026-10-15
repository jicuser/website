export const CERTIFICATES_ENABLED = import.meta.env?.VITE_ENABLE_CERTIFICATES === 'true';
export const CERTIFICATE_KINDS = [
  ['nikah', 'Nikah'],
  ['shahadah', 'Shahadah'],
  ['course', 'Course completion'],
  ['ijazah', 'Ijazah'],
];
export const certificateKind = (kind) =>
  CERTIFICATE_KINDS.find(([id]) => id === kind)?.[1] || 'Certificate';
export const isVerificationToken = (value) => /^[0-9a-f]{32}$/.test(value || '');
export const verificationPath = (token) =>
  isVerificationToken(token) ? `/verify/${token}` : null;
export const certificateDate = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' :
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
};
