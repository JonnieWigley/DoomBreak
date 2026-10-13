import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBlocker, type BlockerStatus } from '../../modules/app-blocker';
import { AppIcon } from '../components/app-icon';
import { SOCIAL_APPS } from '../constants/apps';
import { describe, isBlocked } from '../constants/format';
import { useStyles } from '../hooks/use-styles';

export default function Apps() {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<BlockerStatus>(() => AppBlocker.getStatus());

  const refresh = useCallback(() => setStatus(AppBlocker.getStatus()), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refresh());
    const id = setInterval(refresh, 1000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [refresh]);

  const toggleApp = (pkg: string, on: boolean) => {
    const targets = on ? [...status.targets, pkg] : status.targets.filter((p) => p !== pkg);
    AppBlocker.configure(status.enabled, targets);
    refresh();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      <Stack.Screen options={{ title: 'Apps', headerTitle: 'Apps' }} />
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
              <Text style={[styles.sub, state && isBlocked(state, status.now, status.focusUntil) && styles.blocked]}>
                {state ? describe(state, status.now, status.focusUntil) : 'Not limited'}
              </Text>
            </View>
            <Switch value={!!state} onValueChange={(v) => toggleApp(app.package, v)} />
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
