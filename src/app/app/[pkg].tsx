import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBlocker, type AppLimits, type BlockerStatus } from '../../../modules/app-blocker';
import { AppIcon } from '../../components/app-icon';
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

  // Today's total time in this app, from the same usage data as the phone's Screen time. -1 = no access yet.
  const [screenTime, setScreenTime] = useState<number | null>(null);

  const refreshScreenTime = useCallback(() => setScreenTime(AppBlocker.getScreenTimeToday(pkg)), [pkg]);

  useEffect(() => {
    refreshScreenTime();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refreshScreenTime());
    const id = setInterval(refreshScreenTime, 10_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [refreshScreenTime]);

  if (!app || !status || !limits) return null;

  const state = status.apps.find((a) => a.package === pkg);

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
        <Text style={styles.heading}>Screen time today</Text>
        {screenTime !== null && screenTime >= 0 ? (
          <Text style={styles.bigValue}>{fmtDuration(screenTime)}</Text>
        ) : (
          <>
            <Text style={styles.sub}>
              Allow “Usage access” to show how long you’ve spent in {app.name} today, using the same data as
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
