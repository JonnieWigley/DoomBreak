import type { DayTotal } from '../../modules/app-blocker';

export type WeekTrend =
  | { kind: 'no-history' }
  | { kind: 'same'; thisWeek: number; lastWeek: number }
  | { kind: 'down' | 'up'; thisWeek: number; lastWeek: number; diff: number; percent: number };

const SAME_MS = 5 * 60_000; // under 5 min apart counts as "about the same"

/** Compares the latest 7 days with the 7 before, from a 14-day list (oldest first). */
export function weekTrend(days: DayTotal[]): WeekTrend {
  if (days.length < 14) return { kind: 'no-history' };
  const sum = (a: DayTotal[]) => a.reduce((t, d) => t + d.ms, 0);
  const prev = days.slice(-14, -7);
  const thisWeek = sum(days.slice(-7));
  const lastWeek = sum(prev);
  if (!prev.every((d) => d.known)) return { kind: 'no-history' }; // a partly-tracked week would look like a drop
  const diff = thisWeek - lastWeek;
  if (Math.abs(diff) < SAME_MS) return { kind: 'same', thisWeek, lastWeek };
  return {
    kind: diff < 0 ? 'down' : 'up',
    thisWeek,
    lastWeek,
    diff: Math.abs(diff),
    percent: Math.round((Math.abs(diff) / lastWeek) * 100),
  };
}
