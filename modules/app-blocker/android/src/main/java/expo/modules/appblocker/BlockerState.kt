package expo.modules.appblocker

import android.content.Context

/** Settings + per-app session state, persisted so it survives process death. */
class BlockerState(context: Context) {
  private val prefs = context.getSharedPreferences("app_blocker", Context.MODE_PRIVATE)

  /** Packages being limited. */
  var targets: Set<String>
    get() = prefs.getStringSet("targets", setOf("com.zhiliaoapp.musically"))!!.toSet()
    set(v) = prefs.edit().putStringSet("targets", v).apply()

  /** Each app has its own limits; the defaults apply until it is given some. */
  fun allowedFor(pkg: String): Long = prefs.getLong("allowed:$pkg", DEFAULT_ALLOWED_MS)
  fun blockFor(pkg: String): Long = prefs.getLong("block:$pkg", DEFAULT_BLOCK_MS)
  fun setLimits(pkg: String, allowed: Long, block: Long) =
    prefs.edit().putLong("allowed:$pkg", allowed).putLong("block:$pkg", block).apply()

  /** "system", "light" or "dark". */
  var themeMode: String
    get() = prefs.getString("themeMode", "system")!!
    set(v) = prefs.edit().putString("themeMode", v).apply()

  var enabled: Boolean
    get() = prefs.getBoolean("enabled", true)
    set(v) = prefs.edit().putBoolean("enabled", v).apply()

  /** Foreground time already used in the current allowance. */
  fun usedMs(pkg: String): Long = prefs.getLong("used:$pkg", 0L)
  fun setUsedMs(pkg: String, v: Long) = prefs.edit().putLong("used:$pkg", v).apply()

  fun blockedUntil(pkg: String): Long = prefs.getLong("blockedUntil:$pkg", 0L)
  fun setBlockedUntil(pkg: String, v: Long) = prefs.edit().putLong("blockedUntil:$pkg", v).apply()

  /** True once the 80% warning has been shown for the current allowance. */
  fun warned(pkg: String): Boolean = prefs.getBoolean("warned:$pkg", false)
  fun setWarned(pkg: String, v: Boolean) = prefs.edit().putBoolean("warned:$pkg", v).apply()

  fun resetApp(pkg: String) {
    prefs.edit()
      .putLong("used:$pkg", 0L)
      .putLong("blockedUntil:$pkg", 0L)
      .putBoolean("warned:$pkg", false)
      .apply()
  }

  companion object {
    const val DEFAULT_ALLOWED_MS = 10 * 60_000L
    const val DEFAULT_BLOCK_MS = 15 * 60_000L
  }
}
