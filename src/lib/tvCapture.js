// Check capabilities, not the device's user-agent string: desktop mode on a phone
// does not add screen capture, and an embedded browser can restrict a capable laptop.
export function captureProblem(kind, environment = globalThis) {
  const { navigator, document, isSecureContext } = environment;
  if (isSecureContext === false)
    return 'Open Admin using its HTTPS address to share from this device.';
  const method = kind === 'screen' ? 'getDisplayMedia' : 'getUserMedia';
  if (typeof navigator?.mediaDevices?.[method] !== 'function')
    return kind === 'screen'
      ? 'Screen sharing is unavailable in this browser. Open Admin directly in Chrome, Edge, Firefox or Safari on the laptop. Phone browsers can use a camera source instead.'
      : 'Camera capture is unavailable in this browser. Open Admin directly in a browser with camera support.';
  const policy = document?.permissionsPolicy || document?.featurePolicy;
  const feature = kind === 'screen' ? 'display-capture' : 'camera';
  // Unknown policy features must not disable an otherwise supported capture API.
  if (policy?.features?.().includes(feature) && !policy.allowsFeature(feature))
    return 'This page or its embedded browser blocks capture. Open the HTTPS Admin address directly in a new browser tab.';
  return '';
}

export function requestCapture(kind, audio, environment = globalThis) {
  const problem = captureProblem(kind, environment);
  if (problem) throw new Error(problem);
  // Call synchronously from the user's click, before authentication/network awaits.
  const media = environment.navigator.mediaDevices;
  return kind === 'screen'
    ? media.getDisplayMedia({
        video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { max: 30 } },
        audio,
      })
    : media.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio,
      });
}

export function captureError(error, kind) {
  if (error.status) return error.message;
  switch (error.name) {
    case 'NotAllowedError':
      return kind === 'screen'
        ? 'Screen sharing was cancelled or denied. Click Share this screen again and choose a tab, window or screen. If no chooser opens, check browser and system screen-recording permissions.'
        : 'Camera or microphone access was denied. Allow access in this browser’s site permissions, then try again.';
    case 'InvalidStateError':
      return 'Bring this Admin tab to the front and click the sharing button again.';
    case 'NotReadableError':
      return kind === 'screen'
        ? 'The system could not capture that screen. Check screen-recording permissions for this browser, reopen it if required, then try sharing a tab.'
        : 'The camera could not start. Close other apps using it and try again.';
    case 'NotFoundError':
      return kind === 'screen'
        ? 'No screen is available to share on this device.'
        : 'No camera was found on this device.';
    case 'AbortError':
      return 'Capture did not start. Please try again.';
    default:
      return error.message || 'Capture did not start. Please try again.';
  }
}
