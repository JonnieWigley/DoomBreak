import type { ImageSourcePropType } from 'react-native';

export type SocialApp = { package: string; name: string; logo?: ImageSourcePropType };

/**
 * Popular doomscroll apps. Package names must also be listed in the module's AndroidManifest <queries>.
 * `logo` is a bundled fallback, shown when the app isn't installed (installed apps show their own icon).
 */
export const SOCIAL_APPS: SocialApp[] = [
  { package: 'com.zhiliaoapp.musically', name: 'TikTok', logo: require('../../assets/logos/tiktok.png') },
  { package: 'com.instagram.android', name: 'Instagram', logo: require('../../assets/logos/instagram.png') },
  { package: 'com.facebook.katana', name: 'Facebook', logo: require('../../assets/logos/facebook.png') },
  { package: 'com.twitter.android', name: 'X (Twitter)', logo: require('../../assets/logos/x.png') },
  { package: 'com.snapchat.android', name: 'Snapchat' },
  { package: 'com.reddit.frontpage', name: 'Reddit', logo: require('../../assets/logos/reddit.png') },
  { package: 'com.instagram.barcelona', name: 'Threads', logo: require('../../assets/logos/threads.png') },
  { package: 'com.pinterest', name: 'Pinterest', logo: require('../../assets/logos/pinterest.png') },
  { package: 'com.linkedin.android', name: 'LinkedIn', logo: require('../../assets/logos/linkedin.png') },
];
