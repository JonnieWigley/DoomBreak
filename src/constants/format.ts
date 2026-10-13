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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One line for the extra-time card, e.g. "Sat & Sun: 2× scroll time". */
export function describeBonus({ enabled, multipliers }: BonusSchedule) {
  if (!enabled) return 'Get more scroll time on the days you choose, like the weekend.';
  // Monday first, to match the day picker.
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => multipliers[d] > 1);
  if (days.length === 0) return 'Tap the days that get extra time.';
  return `${dayList(days)}: ${multipliers[days[0]]}× scroll time`;
}

function dayList(days: number[]) {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
  const names = days.map((d) => DAY_NAMES[d]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0];
}
