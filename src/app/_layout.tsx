import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Appearance, useColorScheme } from 'react-native';

import { AppBlocker } from '../../modules/app-blocker';
import { dark, light } from '../constants/theme';

// Apply the saved theme before the first render. 'system' hands control back to the OS.
const saved = AppBlocker.getThemeMode();
Appearance.setColorScheme(saved === 'system' ? 'unspecified' : saved);

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? dark : light;
  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{ ...base, colors: { ...base.colors, background: c.background, card: c.card, text: c.text, border: c.border } }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerTitle: 'DoomBreak' }} />
    </ThemeProvider>
  );
}
