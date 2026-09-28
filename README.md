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

Android doesn't let one app force-close another, so DoomBreak uses an **Accessibility Service**. Once a second it
checks which app is in front. It counts your time in the apps you chose and sends you home when the limit is hit.

## Permissions and privacy

| Permission | Why |
|---|---|
| Accessibility service | To see which app is in front, and to send you home. |
| Usage access (optional) | To show today's screen time per app. Read-only. |

- The only thing read from the screen is the **package name of the app in front**. No screen text, keystrokes,
  messages or screenshots are read.
- Settings and timers are stored on the phone only.
- The app has **no internet permission** and contains no network code.

## Build and install

Requirements: Node 20.19.4+, JDK 17+, Android SDK, an Android phone with USB debugging.

```bash
npm install
npx expo prebuild --platform android
ANDROID_HOME=~/Library/Android/sdk npx expo run:android --variant release
```

Then on the phone:

1. Settings → Accessibility → **DoomBreak** → turn on.
2. Optional, for screen time: Settings → Special app access → Usage access → **DoomBreak** → allow.

If Android greys out the accessibility toggle for a sideloaded app, open the app's info page, tap the ⋮ menu and
choose **Allow restricted settings**.

## Limitations

- **Android only.** iOS doesn't allow this kind of monitoring.
- Meant for sideloading. Google Play restricts apps that use accessibility services this way.
- Apps are matched by package name ([`src/constants/apps.ts`](src/constants/apps.ts)). Regional variants
  (for example TikTok in some Asian countries) use different package names and won't be limited until added.
- The service checks once a second. The limited app may flash on screen briefly before you're sent home.
- Turning the accessibility service off in Android settings turns off all limits.

## Adding an app

Add it to `src/constants/apps.ts` and to the `<queries>` list in
`modules/app-blocker/android/src/main/AndroidManifest.xml`.

## Trademarks

TikTok, Instagram, Facebook, X, Snapchat, Reddit, Threads, Pinterest and LinkedIn are trademarks of their
respective owners. Their logos in `assets/logos/` are used only to identify those apps in the list, and this
project isn't affiliated with or endorsed by any of them. If you fork this publicly, check each company's brand
guidelines and replace the logos if needed.

## License

MIT, see [LICENSE](LICENSE).
