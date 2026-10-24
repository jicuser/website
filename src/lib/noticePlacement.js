export const NOTICE_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const HOME_POSITIONS = ['before-events', 'after-events', 'after-community'];
export function noticePlacement(value) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    placement: HOME_POSITIONS.includes(data.placement) ? data.placement : 'before-events',
    notification: data.notification === true,
    position: NOTICE_POSITIONS.includes(data.position) ? data.position : 'bottom-right',
  };
}
