import { DEFAULT_TV_SETTINGS, publicSettings } from '../../supabase/functions/_shared/tv.js';

export const validDeviceToken = (token) =>
  typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

export function initialDisplayState() {
  return {
    settings: DEFAULT_TV_SETTINGS,
    inputs: [],
    paired: false,
    displayMode: null,
    presentationId: null,
    deviceToken: '',
    status: 'loading',
    error: '',
  };
}

export function receivedDisplayState(data, token) {
  if (!['normal', 'teaching'].includes(data?.displayMode))
    throw new Error('Unable to confirm the current display mode. Retrying…');
  const paired = data.paired === true && validDeviceToken(token);
  return {
    ...data,
    settings: publicSettings(data.settings, paired),
    inputs: paired ? data.inputs || [] : [],
    paired,
    deviceToken: paired ? token : '',
    status: 'ready',
    error: '',
  };
}

// A network error must unmount private players, while keeping the credential for a retry.
export function interruptedDisplayState(previous, message) {
  return {
    ...previous,
    settings: publicSettings(previous.settings),
    inputs: [],
    paired: false,
    status: 'error',
    error: message || 'The hall stream is temporarily unavailable.',
  };
}

export function validateSessionJoin(name, code) {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter a name for this display, such as Classroom laptop.';
  else if (name.trim().length > 60) errors.name = 'Use a display name of 60 characters or fewer.';
  if (!/^\d{8}$/.test(code))
    errors.code = 'Enter the 8-digit session code from your teacher or organiser.';
  return errors;
}
