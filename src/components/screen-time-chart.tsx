import { useMemo } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import type { DayTotal } from '../../modules/app-blocker';
import { fmtDuration } from '../constants/format';
import { dark, light } from '../constants/theme';
import { weekTrend } from '../constants/trend';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BAR_AREA = 110;

/** 0 -> "0", 25 min -> "25m", 90 min -> "1.5h". Short enough to sit above a narrow bar. */
function fmtShort(ms: number) {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return ms > 0 ? '<1m' : '0';
  if (mins < 60) return `${mins}m`;
  return `${(mins / 60).toFixed(1).replace(/\.0$/, '')}h`;
}

/** Daily screen time as a bar chart, oldest day on the left and today on the right. */
export function ScreenTimeChart({ data }: { data: DayTotal[] }) {
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? dark : light;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        summary: { flexDirection: 'row', justifyContent: 'space-between' },
        summaryText: { fontSize: 14, color: c.subtext },
        summaryStrong: { color: c.text, fontWeight: '600' },
        chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 6 },
        col: { flex: 1, alignItems: 'center' },
        value: { fontSize: 11, color: c.subtext, marginBottom: 4 },
        valueToday: { color: c.text, fontWeight: '600' },
        bar: { width: '70%', borderRadius: 6, backgroundColor: c.accent },
        day: { fontSize: 12, color: c.subtext, marginTop: 6 },
        dayToday: { color: c.text, fontWeight: '600' },
      }),
    [c],
  );

  const max = Math.max(...data.map((d) => d.ms), 30 * 60_000); // at least a 30 min scale so tiny days stay small
  const total = data.reduce((sum, d) => sum + d.ms, 0);
  const average = data.length ? total / data.length : 0;

  return (
    <View>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Total <Text style={styles.summaryStrong}>{fmtDuration(total)}</Text>
        </Text>
        <Text style={styles.summaryText}>
          Average <Text style={styles.summaryStrong}>{fmtDuration(average)}</Text> a day
        </Text>
      </View>
      <View style={styles.chart}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const height = d.ms > 0 ? Math.max(4, Math.round((d.ms / max) * BAR_AREA)) : 3;
          return (
            <View key={d.dayStart} style={styles.col}>
              <Text style={[styles.value, isToday && styles.valueToday]}>{fmtShort(d.ms)}</Text>
              <View style={[styles.bar, { height, opacity: isToday ? 1 : d.ms > 0 ? 0.4 : 0.15 }]} />
              <Text style={[styles.day, isToday && styles.dayToday]}>{DAYS[new Date(d.dayStart).getDay()]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Whether screen time went up or down this week compared with the week before. */
export function WeekTrendSection({ data }: { data: DayTotal[] }) {
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? dark : light;
  const t = weekTrend(data);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        box: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 12, gap: 2 },
        row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        arrow: { fontSize: 20, fontWeight: '700' },
        headline: { fontSize: 15, fontWeight: '600', color: c.text, flex: 1 },
        detail: { fontSize: 13, color: c.subtext },
      }),
    [c],
  );

  if (t.kind === 'no-history') {
    return (
      <View style={styles.box}>
        <Text style={styles.headline}>Weekly trend</Text>
        <Text style={styles.detail}>
          Shows once there are two full weeks of history to compare. It fills in as you use the app.
        </Text>
      </View>
    );
  }
  if (t.kind === 'same') {
    return (
      <View style={styles.box}>
        <Text style={styles.headline}>About the same as last week</Text>
        <Text style={styles.detail}>
          {fmtDuration(t.thisWeek)} this week, {fmtDuration(t.lastWeek)} last week
        </Text>
      </View>
    );
  }
  const down = t.kind === 'down';
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Text style={[styles.arrow, { color: down ? c.good : c.danger }]}>{down ? '↓' : '↑'}</Text>
        <Text style={styles.headline}>
          {down ? 'Down' : 'Up'} {t.percent}% from last week
        </Text>
      </View>
      <Text style={styles.detail}>
        {fmtDuration(t.diff)} {down ? 'less' : 'more'} · {fmtDuration(t.thisWeek)} this week vs{' '}
        {fmtDuration(t.lastWeek)} last week
      </Text>
    </View>
  );
}
