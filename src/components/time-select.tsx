import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, Text } from 'react-native';

import { fmtClock } from '../constants/format';
import { useStyles } from '../hooks/use-styles';

/** A box showing a time; tapping it opens Android's clock dial to pick a new one. Cancel leaves it unchanged. */
export function TimeSelect({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const styles = useStyles();
  const open = () => {
    const date = new Date();
    date.setHours(Math.floor(value / 60), value % 60, 0, 0);
    DateTimePickerAndroid.open({
      value: date,
      mode: 'time',
      display: 'clock',
      is24Hour: false,
      onValueChange: (_event, picked) => onChange(picked.getHours() * 60 + picked.getMinutes()),
    });
  };
  return (
    <Pressable style={[styles.input, styles.grow]} onPress={open}>
      <Text style={styles.label}>{fmtClock(value)}</Text>
      <Text style={styles.sub}>▾</Text>
    </Pressable>
  );
}
