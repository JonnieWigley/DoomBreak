import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBlocker, type AppLimits, type BlockerStatus, type DayTotal } from '../../../modules/app-blocker';
import { AppIcon } from '../../components/app-icon';
import { ScreenTimeChart, WeekTrendSection } from '../../components/screen-time-chart';
import { Stepper } from '../../components/stepper';
import { SOCIAL_APPS } from '../../constants/apps';
import { describe, fmtDuration, isBlocked } from '../../constants/format';
import { useStyles } from '../../hooks/use-styles';

const clamp = (n: number) => Math.min(120, Math.max(1, Math.round(n)));

export default function AppRule() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { pkg } = useLocalSearchParams<{ pkg: string }>();
  const app = SOCIAL_APPS.find((a) => a.package === pkg);

  const [status, setStatus] = useState<BlockerStatus | null>(null);
  const [limits, setLimits] = useState<AppLimits | null>(null);

  const refresh = useCallback(() => {
    setStatus(AppBlocker.getStatus());
    setLimits(AppBlocker.getAppLimits(pkg));
  }, [pkg]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refresh());
    const id = setInterval(refresh, 1000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [refresh]);

  // The last 14 days of time in this app (7 shown, 7 more for the week-on-week comparison), from the same usage data as the phone's Screen time.
  // Empty until usage access has been granted.
  const [daily, setDaily] = useState<DayTotal[] | null>(null);

  const refreshDaily = useCallback(() => setDaily(AppBlocker.getDailyScreenTime(pkg, 14)), [pkg]);

  useEffect(() => {
    refreshDaily();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refreshDaily());
    const id = setInterval(refreshDaily, 10_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [refreshDaily]);

  if (!app || !status || !limits) return null;

  const state = status.apps.find((a) => a.package === pkg);
  const today = daily && daily.length > 0 ? daily[daily.length - 1].ms : null;

  const toggle = (on: boolean) => {
    const targets = on ? [...status.targets, pkg] : status.targets.filter((p) => p !== pkg);
    AppBlocker.configure(status.enabled, targets);
    refresh();
  };

  const save = (allowed: number, block: number) => {
    AppBlocker.setAppLimits(pkg, allowed, block);
    refresh();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      <Stack.Screen options={{ title: app.name, headerTitle: app.name }} />

      <View style={[styles.card, styles.row]}>
        <AppIcon pkg={app.package} name={app.name} logo={app.logo} size={52} />
        <View style={styles.grow}>
          <Text style={styles.appName}>{app.name}</Text>
          <Text style={[styles.sub, state && isBlocked(state, status.now) && styles.blocked]}>
            {state ? describe(state, status.now) : 'Not limited'}
          </Text>
        </View>
        <Switch value={!!state} onValueChange={toggle} />
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Screen time</Text>
        {today !== null && daily ? (
          <>
            <View style={styles.row}>
              <Text style={styles.bigValue}>{fmtDuration(today)}</Text>
              <Text style={styles.sub}>today</Text>
            </View>
            <ScreenTimeChart data={daily.slice(-7)} />
            <WeekTrendSection data={daily} />
          </>
        ) : (
          <>
            <Text style={styles.sub}>
              Allow “Usage access” to see how long you spend in {app.name} each day, using the same data as
              your phone’s Screen time.
            </Text>
            <Pressable style={styles.button} onPress={AppBlocker.openUsageAccessSettings}>
              <Text style={styles.buttonText}>Allow usage access</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Rule</Text>
        <Stepper
          label="Scroll time (min)"
          value={limits.allowedMinutes}
          onChange={(v) => save(clamp(v), limits.blockMinutes)}
        />
        <Stepper
          label="Block time (min)"
          value={limits.blockMinutes}
          onChange={(v) => save(limits.allowedMinutes, clamp(v))}
        />
        <Text style={styles.sub}>
          After {Math.round(limits.allowedMinutes)} min of {app.name}, it closes and stays blocked for{' '}
          {Math.round(limits.blockMinutes)} min. You get a warning at 80% of your time.
        </Text>
      </View>

      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={() => {
          AppBlocker.resetApp(pkg);
          refresh();
        }}>
        <Text style={styles.buttonText}>Reset {app.name} timer</Text>
      </Pressable>
    </ScrollView>
  );
}
