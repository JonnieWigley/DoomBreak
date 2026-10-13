import { requireNativeModule } from 'expo';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AppStatus = {
  package: string;
  usedMs: number;
  blockedUntil: number;
  /** Scroll time that applies today, so already multiplied on an extra-time day. */
  allowedMinutes: number;
  blockMinutes: number;
};

export type BlockerStatus = {
  /** Usage access: needed to see which app is in front. */
  usageAccess: boolean;
  /** "Display over other apps": needed for the cards and to send you home. */
  overlay: boolean;
  enabled: boolean;
  targets: string[];
  /** Today is one of the extra-time days (and extra time is switched on). */
  bonusToday: boolean;
  apps: AppStatus[];
  now: number;
};

/** `known` is false for days from before the app started tracking, where 0 would mean "no data", not "no use". */
export type DayTotal = { dayStart: number; ms: number; known: boolean };

export type AppLimits = { allowedMinutes: number; blockMinutes: number };

/**
 * Extra time through the week: on each day every limited app's scroll time is multiplied by that day's multiplier.
 * `multipliers` has 7 entries, 0 = Sunday … 6 = Saturday; 1 means no extra time that day.
 */
export type BonusSchedule = { enabled: boolean; multipliers: number[] };

const Native = requireNativeModule('AppBlocker');

export const AppBlocker = {
  canDrawOverlays: (): boolean => Native.canDrawOverlays(),
  openOverlaySettings: (): void => Native.openOverlaySettings(),
  /** Master switch and the set of limited apps. */
  configure: (enabled: boolean, targets: string[]): void => Native.configure(enabled, targets),
  getAppLimits: (pkg: string): AppLimits => Native.getAppLimits(pkg),
  setAppLimits: (pkg: string, allowedMinutes: number, blockMinutes: number): void =>
    Native.setAppLimits(pkg, allowedMinutes, blockMinutes),
  getBonusSchedule: (): BonusSchedule => Native.getBonusSchedule(),
  setBonusSchedule: ({ enabled, multipliers }: BonusSchedule): void => Native.setBonusSchedule(enabled, multipliers),
  /** The app's own icon as a base64 PNG, or null if it isn't installed. */
  getAppIcon: (pkg: string): string | null => Native.getAppIcon(pkg),
  hasUsageAccess: (): boolean => Native.hasUsageAccess(),
  openUsageAccessSettings: (): void => Native.openUsageAccessSettings(),
  /** Per-day foreground time (same data as the phone's Screen time), oldest first. Empty without usage access. */
  getDailyScreenTime: (pkg: string, days: number): DayTotal[] => Native.getDailyScreenTime(pkg, days),
  getStatus: (): BlockerStatus => Native.getStatus(),
  resetApp: (pkg: string): void => Native.resetApp(pkg),
  resetSession: (): void => Native.resetSession(),
  getThemeMode: (): ThemeMode => Native.getThemeMode(),
  setThemeMode: (mode: ThemeMode): void => Native.setThemeMode(mode),
};
