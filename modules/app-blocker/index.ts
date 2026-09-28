import { requireNativeModule } from 'expo';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AppStatus = {
  package: string;
  usedMs: number;
  blockedUntil: number;
  allowedMinutes: number;
  blockMinutes: number;
};

export type BlockerStatus = {
  serviceEnabled: boolean;
  enabled: boolean;
  targets: string[];
  apps: AppStatus[];
  now: number;
};

export type AppLimits = { allowedMinutes: number; blockMinutes: number };

const Native = requireNativeModule('AppBlocker');

export const AppBlocker = {
  isServiceEnabled: (): boolean => Native.isServiceEnabled(),
  openAccessibilitySettings: (): void => Native.openAccessibilitySettings(),
  /** Master switch and the set of limited apps. */
  configure: (enabled: boolean, targets: string[]): void => Native.configure(enabled, targets),
  getAppLimits: (pkg: string): AppLimits => Native.getAppLimits(pkg),
  setAppLimits: (pkg: string, allowedMinutes: number, blockMinutes: number): void =>
    Native.setAppLimits(pkg, allowedMinutes, blockMinutes),
  /** The app's own icon as a base64 PNG, or null if it isn't installed. */
  getAppIcon: (pkg: string): string | null => Native.getAppIcon(pkg),
  hasUsageAccess: (): boolean => Native.hasUsageAccess(),
  openUsageAccessSettings: (): void => Native.openUsageAccessSettings(),
  /** Foreground time today in ms (same data as the phone's Screen time), or -1 without usage access. */
  getScreenTimeToday: (pkg: string): number => Native.getScreenTimeToday(pkg),
  getStatus: (): BlockerStatus => Native.getStatus(),
  resetApp: (pkg: string): void => Native.resetApp(pkg),
  resetSession: (): void => Native.resetSession(),
  getThemeMode: (): ThemeMode => Native.getThemeMode(),
  setThemeMode: (mode: ThemeMode): void => Native.setThemeMode(mode),
};
