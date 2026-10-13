import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Appearance, AppState, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppBlocker,
  type BlockerStatus,
  type Schedule,
  type ScheduleMode,
  type ThemeMode,
} from '../../modules/app-blocker';
import { TimeSelect } from '../components/time-select';
import { SOCIAL_APPS } from '../constants/apps';
import { describeSchedule, fmtClock, minutesOfDay } from '../constants/format';
import { useStyles } from '../hooks/use-styles';

// Monday first; day numbers match the native side (0 = Sunday).
const WEEK = [
  { day: 1, letter: 'M' },
  { day: 2, letter: 'T' },
  { day: 3, letter: 'W' },
  { day: 4, letter: 'T' },
  { day: 5, letter: 'F' },
  { day: 6, letter: 'S' },
  { day: 0, letter: 'S' },
];
// Extra time always doubles scroll time.
const EXTRA_MULTIPLIER = 2;
const MODES: { mode: ScheduleMode; label: string }[] = [
  { mode: 'focus', label: 'Block apps' },
  { mode: 'extra', label: 'Double time' },
];
const FOCUS_LENGTHS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 120, label: '2 hours' },
];

export default function Home() {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<BlockerStatus | null>(null);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => AppBlocker.getThemeMode());
  const [schedule, setScheduleState] = useState<Schedule>(() => {
    // Schedules saved before the card was simplified may be all day or use another amount; bring them in line.
    const saved = AppBlocker.getSchedule();
    if (!saved.allDay && saved.multiplier === EXTRA_MULTIPLIER) return saved;
    const next = { ...saved, allDay: false, multiplier: EXTRA_MULTIPLIER };
    AppBlocker.setSchedule(next);
    return next;
  });
  // A day only counts as picked while the schedule is on; it turns off when no day is picked.
  const pickedDays = schedule.enabled ? schedule.days : [];

  const refresh = useCallback(() => setStatus(AppBlocker.getStatus()), []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refresh());
    const id = setInterval(refresh, 1000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [refresh]);

  if (!status) return null;

  const setEnabled = (enabled: boolean) => {
    AppBlocker.configure(enabled, status.targets);
    refresh();
  };

  const saveSchedule = (changes: Partial<Schedule>) => {
    // Always between the start and end time, and extra time is a fixed amount.
    const next = { ...schedule, ...changes, allDay: false, multiplier: EXTRA_MULTIPLIER };
    AppBlocker.setSchedule(next);
    setScheduleState(next);
    refresh();
  };

  const toggleDay = (day: number) => {
    const days = pickedDays.includes(day) ? pickedDays.filter((d) => d !== day) : [...pickedDays, day];
    saveSchedule({ days, enabled: days.length > 0 });
  };

  const chooseTheme = (mode: ThemeMode) => {
    AppBlocker.setThemeMode(mode);
    setThemeModeState(mode);
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      {!status.usageAccess && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Blocking is off until you allow “Usage access” for DoomBreak, so it can see which app is open.
          </Text>
          <Pressable style={styles.button} onPress={AppBlocker.openUsageAccessSettings}>
            <Text style={styles.buttonText}>Allow usage access</Text>
          </Pressable>
        </View>
      )}
      {!status.overlay && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Blocking is off until you allow DoomBreak to “Display over other apps”, so it can show its warnings and
            close apps.
          </Text>
          <Pressable style={styles.button} onPress={AppBlocker.openOverlaySettings}>
            <Text style={styles.buttonText}>Allow display over other apps</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={[styles.card, styles.row]} onPress={() => router.push('/apps')}>
        <View style={styles.grow}>
          <Text style={styles.appName}>Apps</Text>
          <Text style={styles.sub}>
            {SOCIAL_APPS.filter((a) => status.targets.includes(a.package)).length} of {SOCIAL_APPS.length} limited
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <View style={[styles.card, styles.row]}>
        <View style={styles.grow}>
          <Text style={styles.appName}>Blocking enabled</Text>
          <Text style={styles.sub}>Turn off to pause every limit.</Text>
        </View>
        <Switch value={status.enabled} onValueChange={setEnabled} />
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Schedule</Text>
        {/* One line only, so picking days never changes the card's height and makes the screen jump. */}
        <Text style={styles.sub} numberOfLines={1}>
          {describeSchedule(schedule)}
        </Text>
        <View style={styles.dayChips}>
          {WEEK.map(({ day, letter }) => {
            const on = pickedDays.includes(day);
            return (
              <Pressable key={day} style={[styles.dayChip, on && styles.dayChipActive]} onPress={() => toggleDay(day)}>
                <Text style={[styles.segmentText, on && styles.segmentTextActive]}>{letter}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row}>
          <TimeSelect value={schedule.startMinutes} onChange={(startMinutes) => saveSchedule({ startMinutes })} />
          <Text style={styles.sub}>to</Text>
          <TimeSelect value={schedule.endMinutes} onChange={(endMinutes) => saveSchedule({ endMinutes })} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>During schedule</Text>
        <View style={styles.segments}>
          {MODES.map(({ mode, label }) => {
            const on = schedule.mode === mode;
            return (
              <Pressable
                key={mode}
                style={[styles.segment, on && styles.segmentActive]}
                onPress={() => saveSchedule({ mode })}>
                <Text style={[styles.segmentText, on && styles.segmentTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.sub}>
          Block apps: your limited apps stay blocked during the schedule. Double time: they get double the scroll time.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Focus now</Text>
        <Text style={styles.sub}>Block your limited apps right now, even outside your schedule.</Text>
        {status.focusNowUntil > status.now ? (
          <View style={styles.row}>
            <Text style={[styles.label, styles.grow]}>Focusing until {fmtClock(minutesOfDay(status.focusNowUntil))}</Text>
            <Pressable
              style={[styles.button, styles.secondary]}
              onPress={() => {
                AppBlocker.stopFocus();
                refresh();
              }}>
              <Text style={styles.buttonText}>Stop</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.segments}>
            {FOCUS_LENGTHS.map(({ minutes, label }) => (
              <Pressable
                key={minutes}
                style={styles.segment}
                onPress={() => {
                  AppBlocker.startFocus(minutes);
                  refresh();
                }}>
                <Text style={styles.segmentText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={() => {
          AppBlocker.resetSession();
          refresh();
        }}>
        <Text style={styles.buttonText}>Reset all timers</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.heading}>Appearance</Text>
        <View style={styles.segments}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.segment, themeMode === mode && styles.segmentActive]}
              onPress={() => chooseTheme(mode)}>
              <Text style={[styles.segmentText, themeMode === mode && styles.segmentTextActive]}>
                {mode === 'system' ? 'System default' : mode === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
