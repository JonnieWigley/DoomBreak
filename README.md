# DoomBreak

An Android app that stops you doomscrolling. Pick the social apps you want to limit, give each one a scroll
time and a block time, and DoomBreak does the rest:

1. You open a limited app (say TikTok) and the clock starts.
2. At 80% of your time you get a warning banner.
3. When time is up, the app is sent to the background and you're returned to the home screen.
4. For the block time, opening that app just bounces you straight back home.

Each app has its own timer, scroll time and block time. Today's screen time for each app is shown on its page.

Built with Expo (SDK 57) and a small local Kotlin module, [`modules/app-blocker`](modules/app-blocker).

## How it works

Android doesn't let one app force-close another. Instead, while limits are on, a small background service reads
Android's usage events once a second to see which app is in front. It counts your time in the apps you chose, and when
the limit is hit it opens the home screen and shows a card over it.

DoomBreak deliberately doesn't use an accessibility service. Banking and other security-sensitive apps often refuse to
open while a sideloaded app has one switched on, because that's how banking malware works.

## Permissions and privacy

| Permission | Why |
|---|---|
| Usage access | To see which app is in front, and to show each app's screen time. Read-only. |
| Display over other apps | To show the warning and "on a break" cards, and to send you home. |

- The only thing DoomBreak learns is **which app is in front**. Nothing on screen is read: no text, keystrokes,
  messages or screenshots.
- While limits are on, Android shows a "DoomBreak is on" notification for the background service.
- Settings and timers are stored on the phone only.
- The app has **no internet permission** and contains no network code.

## Install (no build needed)

1. Download `DoomBreak-*.apk` from the [Releases](../../releases) page, on your phone.
2. Open the file. Android will ask you to allow installs from your browser or files app. Allow it for this install.
   If Play Protect warns that the app is unrecognised, choose **Install anyway**.
3. Open DoomBreak and tap **Allow usage access**, then **Allow display over other apps**, switching on DoomBreak
   on each settings page.
4. If you used an older version, turn **DoomBreak** off under Settings → Accessibility (it's no longer needed).

**Upgrading from 0.1.0 or 0.2.0:** version 0.3.0 is signed with DoomBreak's own key instead of a shared test key, so
Android won't install it over the old one. Uninstall DoomBreak first, then install the new APK. Your limits and
screen-time history are reset.

Needs Android 7.0 or newer on a 64-bit (arm64) phone, which covers almost every phone made since 2017.

## Build it yourself

Requirements: Node 20.19.4+, JDK 17+, Android SDK, an Android phone with USB debugging.

```bash
npm install
npx expo prebuild --platform android
ANDROID_HOME=~/Library/Android/sdk npx expo run:android --variant release
```

Without DoomBreak's signing key, release builds are signed with the shared debug key. That's fine for testing, but
they won't install over an official release. The maintainer's machine sets `DOOMBREAK_STORE_FILE`,
`DOOMBREAK_STORE_PASSWORD`, `DOOMBREAK_KEY_ALIAS` and `DOOMBREAK_KEY_PASSWORD` in `~/.gradle/gradle.properties`
(see [`plugins/with-release-signing.js`](plugins/with-release-signing.js)).

Then on the phone:

1. Settings → Special app access → Usage access → **DoomBreak** → allow.
2. Settings → Special app access → Display over other apps → **DoomBreak** → allow.

If Android greys out either toggle for a sideloaded app, open the app's info page, tap the ⋮ menu and choose
**Allow restricted settings**.

## Limitations

- **Android only.** iOS doesn't allow this kind of monitoring.
- Meant for sideloading.
- Apps are matched by package name ([`src/constants/apps.ts`](src/constants/apps.ts)). Regional variants
  (for example TikTok in some Asian countries) use different package names and won't be limited until added.
- DoomBreak checks once a second. The limited app may flash on screen briefly before you're sent home.
- Revoking either permission turns off all limits. Some phones (often Xiaomi, Huawei, some Samsung) stop
  background services to save battery; if limits stop working, set DoomBreak's battery use to **Unrestricted**.

## Adding an app

Add it to `src/constants/apps.ts` and to the `<queries>` list in
`modules/app-blocker/android/src/main/AndroidManifest.xml`.

## Trademarks

TikTok, Instagram, YouTube, Facebook, X, Snapchat, Reddit, Discord, Threads, Pinterest and LinkedIn are trademarks of their
respective owners. Their logos in `assets/logos/` are used only to identify those apps in the list, and this
project isn't affiliated with or endorsed by any of them. If you fork this publicly, check each company's brand
guidelines and replace the logos if needed.

## License

MIT, see [LICENSE](LICENSE).
