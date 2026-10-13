import type { AppStatus, BonusSchedule } from '../../modules/app-blocker';

export const fmt = (ms: number) =>
  `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** 3725000 -> "1h 2m"; under a minute -> "<1m". */
export function fmtDuration(ms: number) {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return '<1m';
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

export const isBlocked = (app: AppStatus, now: number) => app.blockedUntil > now;

export function describe(app: AppStatus, now: number) {
  if (isBlocked(app, now)) return `Blocked for ${fmt(app.blockedUntil - now)}`;
  return `${fmt(Math.max(0, app.allowedMinutes * 60_000 - app.usedMs))} left`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** [1, 3, 6] -> "Monday, Wednesday and Saturday", listed Monday first. */
function listDays(days: number[]) {
  const names = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_NAMES[d]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
}

/** One line for the extra-time card. */
export function describeBonus({ enabled, days, multiplier }: BonusSchedule) {
  if (!enabled) return 'Get more scroll time on chosen days, like the weekend.';
  if (days.length === 0) return 'Pick the days that get extra time.';
  const amount = multiplier === 2 ? 'doubled' : `multiplied by ${multiplier}`;
  return `Every app’s scroll time is ${amount} on ${listDays(days)}.`;
}
