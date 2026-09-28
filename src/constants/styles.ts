import { StyleSheet } from 'react-native';

import type { Palette } from './theme';

export const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: c.background },
    container: { padding: 16, gap: 14 },
    card: {
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    heading: { fontSize: 20, fontWeight: '700', color: c.text },
    sub: { fontSize: 14, color: c.subtext },
    blocked: { color: c.danger, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    grow: { flex: 1 },
    label: { fontSize: 16, color: c.text },
    appName: { fontSize: 17, fontWeight: '600', color: c.text },
    chevron: { fontSize: 26, color: c.subtext },
    badge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: c.onAccent, fontSize: 18, fontWeight: '700' },
    bigValue: { fontSize: 32, fontWeight: '700', color: c.text },
    value: { fontSize: 18, width: 44, textAlign: 'center', color: c.text },
    stepper: { flexDirection: 'row', alignItems: 'center' },
    step: {
      backgroundColor: c.accent,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    button: { backgroundColor: c.accent, padding: 14, borderRadius: 10, alignItems: 'center' },
    secondary: { backgroundColor: c.subtext },
    buttonText: { color: c.onAccent, fontSize: 16, fontWeight: '600' },
    warn: { backgroundColor: c.warnBg, padding: 14, borderRadius: 10, gap: 10 },
    warnText: { color: c.warnText, fontSize: 15 },
    segments: {
      flexDirection: 'row',
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: 'hidden',
    },
    segment: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    segmentActive: { backgroundColor: c.accent },
    segmentText: { fontSize: 15, color: c.text },
    segmentTextActive: { color: c.onAccent, fontWeight: '600' },
  });

export type Styles = ReturnType<typeof makeStyles>;
