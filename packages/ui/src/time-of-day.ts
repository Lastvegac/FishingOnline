/**
 * Real local time of the device. The browser already knows the user's time zone,
 * so this works unchanged wherever the game is played.
 */
export type DayPhase = 'NIGHT' | 'DAWN' | 'DAY' | 'GOLDEN' | 'DUSK';

/** Hour in [0, 24) on the device clock, e.g. 18.5 for 18:30. */
export function localHour(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/** IANA zone of the device, e.g. "Asia/Ho_Chi_Minh" or "Europe/Berlin". */
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Coarse phase used by sound and labels. Sunrise/sunset are fixed at about
 * 06:00/18:00; latitude/season-accurate sun times need an opt-in location later.
 */
export function dayPhase(hour: number): DayPhase {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5 || h >= 19.5) return 'NIGHT';
  if (h < 7) return 'DAWN';
  if (h < 16.5) return 'DAY';
  if (h < 18) return 'GOLDEN';
  return 'DUSK';
}

/** 0 at full day, 1 at full night, smooth through dawn and dusk. */
export function nightAmount(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  const ramp = (from: number, to: number) =>
    Math.min(1, Math.max(0, (h - from) / (to - from)));
  if (h < 12) return 1 - ramp(4.8, 6.6);
  return ramp(17.8, 19.6);
}
