import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Appearance, AppState, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBlocker, type BlockerStatus, type ThemeMode } from '../../modules/app-blocker';
import { AppIcon } from '../components/app-icon';
import { SOCIAL_APPS } from '../constants/apps';
import { describe, isBlocked } from '../constants/format';
import { useStyles } from '../hooks/use-styles';

export default function Home() {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<BlockerStatus | null>(null);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => AppBlocker.getThemeMode());

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

  const toggleApp = (pkg: string, on: boolean) => {
    const targets = on ? [...status.targets, pkg] : status.targets.filter((p) => p !== pkg);
    AppBlocker.configure(status.enabled, targets);
    refresh();
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

      <View style={[styles.card, styles.row]}>
        <View style={styles.grow}>
          <Text style={styles.appName}>Blocking enabled</Text>
          <Text style={styles.sub}>Turn off to pause every limit.</Text>
        </View>
        <Switch value={status.enabled} onValueChange={setEnabled} />
      </View>

      <Text style={styles.heading}>Apps</Text>
      {SOCIAL_APPS.map((app) => {
        const state = status.apps.find((a) => a.package === app.package);
        return (
          <Pressable
            key={app.package}
            style={[styles.card, styles.row]}
            onPress={() => router.push({ pathname: '/app/[pkg]', params: { pkg: app.package } })}>
            <AppIcon pkg={app.package} name={app.name} logo={app.logo} />
            <View style={styles.grow}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={[styles.sub, state && isBlocked(state, status.now) && styles.blocked]}>
                {state ? describe(state, status.now) : 'Not limited'}
              </Text>
            </View>
            <Switch value={!!state} onValueChange={(v) => toggleApp(app.package, v)} />
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}

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
