const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs release builds with DoomBreak's own key instead of the Expo template's public debug key.
 * The key is never in the repo: Gradle reads it from these properties, set in ~/.gradle/gradle.properties
 * locally or as ORG_GRADLE_PROJECT_* environment variables in CI. Without them, release builds fall back
 * to the debug key (fine for testing, but such an APK won't install over a real release).
 */
const RELEASE_CONFIG = `
        release {
            if (project.hasProperty('DOOMBREAK_STORE_FILE')) {
                storeFile file(DOOMBREAK_STORE_FILE)
                storePassword DOOMBREAK_STORE_PASSWORD
                keyAlias DOOMBREAK_KEY_ALIAS
                keyPassword DOOMBREAK_KEY_PASSWORD
            }
        }`;

const RELEASE_SIGNING = `signingConfig project.hasProperty('DOOMBREAK_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes('DOOMBREAK_STORE_FILE')) return config;

    const withConfig = gradle.replace(/signingConfigs \{/, (m) => m + RELEASE_CONFIG);
    // The first `signingConfig signingConfigs.debug` after `release {` in buildTypes.
    const withSigning = withConfig.replace(
      /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1${RELEASE_SIGNING}`
    );
    if (withConfig === gradle || withSigning === withConfig) {
      throw new Error('with-release-signing: app/build.gradle layout changed; update the plugin');
    }
    config.modResults.contents = withSigning;
    return config;
  });
};
