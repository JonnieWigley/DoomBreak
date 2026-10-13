import type { AppStatus, Schedule } from '../../modules/app-blocker';

export const fmt = (ms: number) =>
  `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** 3725000 -> "1h 2m"; under a minute -> "<1m". */
export function fmtDuration(ms: number) {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return '<1m';
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

/** 540 -> "9:00 AM", 780 -> "1:00 PM". */
export function fmtClock(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  return `${h % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** A moment (ms) as minutes after its local midnight, for [fmtClock]. */
export function minutesOfDay(ms: number) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/** [focusUntil] is when a focus window ends (0 when not focusing); it blocks every limited app. */
export const isBlocked = (app: AppStatus, now: number, focusUntil = 0) => focusUntil > now || app.blockedUntil > now;

export function describe(app: AppStatus, now: number, focusUntil = 0) {
  if (focusUntil > now) {
    return `Blocked while you focus, until ${fmtClock(minutesOfDay(focusUntil))}`;
  }
  if (app.blockedUntil > now) return `Blocked for ${fmt(app.blockedUntil - now)}`;
  return `${fmt(Math.max(0, app.allowedMinutes * 60_000 - app.usedMs))} left`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One line for the schedule card, e.g. "Weekdays, 9:00 AM to 5:00 PM". */
export function describeSchedule(s: Schedule) {
  // Monday first, to match the day picker.
  const days = s.enabled ? [1, 2, 3, 4, 5, 6, 0].filter((d) => s.days.includes(d)) : [];
  if (days.length === 0) return 'Tap the days you want the schedule on.';
  // The mode has its own card, so this stays short enough for one line.
  return `${dayList(days)}, ${fmtClock(s.startMinutes)} to ${fmtClock(s.endMinutes)}`;
}

function dayList(days: number[]) {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  const names = days.map((d) => DAY_NAMES[d]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0];
}
