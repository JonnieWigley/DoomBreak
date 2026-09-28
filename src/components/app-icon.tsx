import { Image, type ImageSourcePropType, Text, View } from 'react-native';

import { AppBlocker } from '../../modules/app-blocker';
import { useStyles } from '../hooks/use-styles';

const cache = new Map<string, string | null>();

/** The app's own launcher icon from the phone; else its bundled logo; else a letter badge. */
export function AppIcon({
  pkg,
  name,
  logo,
  size = 44,
}: {
  pkg: string;
  name: string;
  logo?: ImageSourcePropType;
  size?: number;
}) {
  const styles = useStyles();
  if (!cache.has(pkg)) cache.set(pkg, AppBlocker.getAppIcon(pkg));
  const icon = cache.get(pkg);

  if (icon) {
    return (
      <Image
        source={{ uri: `data:image/png;base64,${icon}` }}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
      />
    );
  }
  if (logo) {
    return <Image source={logo} style={{ width: size, height: size, borderRadius: size * 0.22 }} />;
  }
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.badgeText}>{name[0]}</Text>
    </View>
  );
}
