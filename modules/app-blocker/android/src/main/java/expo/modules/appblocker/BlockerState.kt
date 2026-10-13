package expo.modules.appblocker

import android.content.Context
import java.util.Calendar

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

  /** Extra time on chosen days: every app's scroll time is multiplied on those days. Off until switched on. */
  var bonusEnabled: Boolean
    get() = prefs.getBoolean("bonusEnabled", false)
    set(v) = prefs.edit().putBoolean("bonusEnabled", v).apply()

  /** Days that get the extra time, 0 = Sunday … 6 = Saturday. */
  var bonusDays: Set<Int>
    get() = prefs.getStringSet("bonusDays", null)?.mapNotNull { it.toIntOrNull() }?.toSet() ?: DEFAULT_BONUS_DAYS
    set(v) = prefs.edit().putStringSet("bonusDays", v.map { it.toString() }.toSet()).apply()

  var bonusMultiplier: Float
    get() = prefs.getFloat("bonusMultiplier", DEFAULT_BONUS_MULTIPLIER)
    set(v) = prefs.edit().putFloat("bonusMultiplier", v).apply()

  /** True if [now] falls on a day that gets extra time. */
  fun isBonusDay(now: Long = System.currentTimeMillis()): Boolean {
    if (!bonusEnabled) return false
    val day = Calendar.getInstance().apply { timeInMillis = now }.get(Calendar.DAY_OF_WEEK) - 1
    return day in bonusDays
  }

  /** The scroll time that applies right now: the app's own limit, multiplied on extra-time days. */
  fun effectiveAllowedFor(pkg: String, now: Long = System.currentTimeMillis()): Long {
    val base = allowedFor(pkg)
    return if (isBonusDay(now)) (base * bonusMultiplier).toLong() else base
  }

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

  /** Screen time per app per calendar day (key = local midnight in ms), kept so history outlives Android's own. */
  fun dayTotal(pkg: String, dayStart: Long): Long = prefs.getLong("day:$pkg:$dayStart", 0L)
  fun setDayTotal(pkg: String, dayStart: Long, v: Long) = prefs.edit().putLong("day:$pkg:$dayStart", v).apply()

  /**
   * Local midnight of the earliest day whose screen time we can trust: Android keeps about a week of usage events,
   * so anything older than the first time we asked is unknown, not zero. 0 = not set yet.
   */
  var trackingSince: Long
    get() = prefs.getLong("trackingSince", 0L)
    set(v) = prefs.edit().putLong("trackingSince", v).apply()

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
    val DEFAULT_BONUS_DAYS = setOf(0, 6) // Sunday and Saturday
    const val DEFAULT_BONUS_MULTIPLIER = 2f
  }
}
