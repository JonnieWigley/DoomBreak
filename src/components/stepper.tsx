import { Pressable, Text, View } from 'react-native';

import { useStyles } from '../hooks/use-styles';

export function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, styles.grow]}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.step} onPress={() => onChange(value - 1)}>
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{Math.round(value)}</Text>
        <Pressable style={styles.step} onPress={() => onChange(value + 1)}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
