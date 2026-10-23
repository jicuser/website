export const RAMADAN_KINDS = {
  iftar: 'Sponsor an Iftar',
  suhoor: 'Sponsor a Suhoor',
  daily: 'Daily Giving',
};
export const RAMADAN_PATHS = {
  iftar: '/ramadan/iftar',
  suhoor: '/ramadan/suhoor',
  daily: '/ramadan/daily-giving',
};
export const RAMADAN_DEFAULTS = {
  website_enabled: true,
  iftar_enabled: true,
  suhoor_enabled: true,
  daily_enabled: true,
  home_enabled: false,
  home_layout: 'card',
  tv_enabled: true,
};
export const RAMADAN_COLOURS = {
  available: '#21835b',
  pending: '#b77900',
  confirmed: '#3c6fba',
  closed: '#68758a',
};
export const SPONSORSHIP_STATUS = {
  pending: 'Requested',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};
export const ramadanSettings = (data) => ({ ...RAMADAN_DEFAULTS, ...data?.settings });
export const ramadanOpen = (data, kind) => {
  const options = ramadanSettings(data);
  return options.website_enabled && options[`${kind}_enabled`] === true;
};
export function ramadanDay(data, kind, date) {
  const row = data?.days?.find((entry) => entry.kind === kind && entry.day_date === date);
  const enabled =
    data?.day_settings?.find((entry) => entry.kind === kind && entry.day_date === date)?.enabled !==
    false;
  return {
    ...row,
    enabled,
    status: !enabled
      ? 'closed'
      : Number(row?.confirmed) > 0
        ? 'confirmed'
        : Number(row?.pending) > 0
          ? 'pending'
          : 'available',
  };
}
export const ramadanStatus = (kind, status) =>
  status === 'confirmed'
    ? kind === 'daily'
      ? 'Supported'
      : 'Sponsored'
    : status === 'pending'
      ? 'Reserved'
      : status === 'closed'
        ? 'Closed'
        : 'Available';
export const canSponsorDay = (data, kind, date) => {
  const day = ramadanDay(data, kind, date);
  return ramadanOpen(data, kind) && day.enabled && (kind === 'daily' || day.status === 'available');
};
