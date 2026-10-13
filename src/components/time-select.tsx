import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { fmtClock } from '../constants/format';
import { useStyles } from '../hooks/use-styles';

// Every half hour, in minutes after midnight.
const TIMES = Array.from({ length: 48 }, (_, i) => i * 30);

/** A box showing a time; tapping it opens a list of half-hour times to pick from. */
export function TimeSelect({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={[styles.input, styles.grow]} onPress={() => setOpen(true)}>
        <Text style={styles.label}>{fmtClock(value)}</Text>
        <Text style={styles.sub}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.card, styles.sheet]}>
            <ScrollView>
              {TIMES.map((t) => {
                const on = t === value;
                return (
                  <Pressable
                    key={t}
                    style={[styles.sheetItem, on && styles.segmentActive]}
                    onPress={() => {
                      onChange(t);
                      setOpen(false);
                    }}>
                    <Text style={[styles.segmentText, on && styles.segmentTextActive]}>{fmtClock(t)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
