import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { makeStyles } from '../constants/styles';
import { dark, light } from '../constants/theme';

export function useStyles() {
  const isDark = useColorScheme() === 'dark';
  return useMemo(() => makeStyles(isDark ? dark : light), [isDark]);
}
