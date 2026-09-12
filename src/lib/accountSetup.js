export function passwordError(password, confirmation) {
  if (typeof password !== 'string' || password.length < 12)
    return 'Use at least 12 characters for your password.';
  if (password !== confirmation) return 'The two passwords do not match.';
  return '';
}
