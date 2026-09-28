import type { AppStatus } from '../../modules/app-blocker';

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
