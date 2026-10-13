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

/** 540 -> "09:00". */
export const fmtClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** [focusUntil] is when a focus window ends (0 when not focusing); it blocks every limited app. */
export const isBlocked = (app: AppStatus, now: number, focusUntil = 0) => focusUntil > now || app.blockedUntil > now;

export function describe(app: AppStatus, now: number, focusUntil = 0) {
  if (focusUntil > now) {
    const end = new Date(focusUntil);
    return `Blocked while you focus, until ${fmtClock(end.getHours() * 60 + end.getMinutes())}`;
  }
  if (app.blockedUntil > now) return `Blocked for ${fmt(app.blockedUntil - now)}`;
  return `${fmt(Math.max(0, app.allowedMinutes * 60_000 - app.usedMs))} left`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One line for the schedule card, e.g. "Weekdays, 09:00 to 17:00: focus" or "Sat & Sun: 2× scroll time". */
export function describeSchedule(s: Schedule) {
  if (!s.enabled) return 'Focus during work or study, or get extra time at the weekend.';
  // Monday first, to match the day picker.
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => s.days.includes(d));
  if (days.length === 0) return 'Tap the days the schedule applies.';
  const when = s.allDay ? dayList(days) : `${dayList(days)}, ${fmtClock(s.startMinutes)} to ${fmtClock(s.endMinutes)}`;
  return s.mode === 'focus' ? `${when}: apps blocked` : `${when}: ${s.multiplier}× scroll time`;
}

function dayList(days: number[]) {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  const names = days.map((d) => DAY_NAMES[d]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0];
}
