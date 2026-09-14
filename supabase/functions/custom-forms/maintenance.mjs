/** Compare fixed-size digests, so header length and string prefix do not leak the secret. */
export async function validWorkerSecret(authorization, secret) {
  if (
    typeof secret !== 'string' ||
    secret.length < 32 ||
    typeof authorization !== 'string' ||
    authorization.length > 4096
  )
    return false;
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(authorization)),
    crypto.subtle.digest('SHA-256', encoder.encode(`Bearer ${secret}`)),
  ]);
  const a = new Uint8Array(actual),
    b = new Uint8Array(expected);
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}
