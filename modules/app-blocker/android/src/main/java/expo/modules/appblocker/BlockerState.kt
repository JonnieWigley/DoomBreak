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

  /**
   * A schedule for chosen days, all day or between two times. In "extra" mode every limited app's scroll time is
   * multiplied (e.g. 2x at the weekend); in "focus" mode limited apps are blocked outright (e.g. during work hours).
   * Off until switched on.
   */
  var scheduleEnabled: Boolean
    get() = prefs.getBoolean("scheduleEnabled", false)
    set(v) = prefs.edit().putBoolean("scheduleEnabled", v).apply()

  /** Days the schedule applies, 0 = Sunday … 6 = Saturday. */
  var scheduleDays: Set<Int>
    get() = prefs.getStringSet("scheduleDays", null)?.mapNotNull { it.toIntOrNull() }?.toSet() ?: setOf(0, 6)
    set(v) = prefs.edit().putStringSet("scheduleDays", v.map { it.toString() }.toSet()).apply()

  /** "extra" or "focus". */
  var scheduleMode: String
    get() = prefs.getString("scheduleMode", "extra")!!
    set(v) = prefs.edit().putString("scheduleMode", v).apply()

  var scheduleMultiplier: Float
    get() = prefs.getFloat("scheduleMultiplier", 2f)
    set(v) = prefs.edit().putFloat("scheduleMultiplier", v).apply()

  var scheduleAllDay: Boolean
    get() = prefs.getBoolean("scheduleAllDay", true)
    set(v) = prefs.edit().putBoolean("scheduleAllDay", v).apply()

  /** Minutes after midnight. An end before the start runs past midnight; equal start and end means all day. */
  var scheduleStart: Int
    get() = prefs.getInt("scheduleStart", 9 * 60)
    set(v) = prefs.edit().putInt("scheduleStart", v).apply()

  var scheduleEnd: Int
    get() = prefs.getInt("scheduleEnd", 17 * 60)
    set(v) = prefs.edit().putInt("scheduleEnd", v).apply()

  /** When the schedule window covering [now] ends, or 0 if the schedule doesn't apply at [now]. */
  fun scheduleEndsAt(now: Long = System.currentTimeMillis()): Long {
    if (!scheduleEnabled) return 0L
    val cal = Calendar.getInstance().apply { timeInMillis = now }
    if (cal.get(Calendar.DAY_OF_WEEK) - 1 !in scheduleDays) return 0L
    val minute = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
    val start = scheduleStart
    val end = scheduleEnd
    val endMinute = when {
      scheduleAllDay || start == end -> 24 * 60
      start < end -> if (minute in start until end) end else return 0L
      minute >= start -> 24 * 60 + end // runs past midnight
      minute < end -> end
      else -> return 0L
    }
    cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
    cal.add(Calendar.MINUTE, endMinute)
    return cal.timeInMillis
  }

  /** When a "Focus now" session started from the app ends (ms); 0 when none is running. */
  var focusNowUntil: Long
    get() = prefs.getLong("focusNowUntil", 0L)
    set(v) = prefs.edit().putLong("focusNowUntil", v).apply()

  /** The running "Focus now" session's end, or 0; an ended session is cleared. */
  fun activeFocusNowUntil(now: Long = System.currentTimeMillis()): Long {
    val until = focusNowUntil
    if (until == 0L) return 0L
    if (until > now) return until
    focusNowUntil = 0L
    return 0L
  }

  /**
   * When focusing ends: the later of a "Focus now" session and the schedule's window in focus mode; 0 when not
   * focusing.
   */
  fun focusUntil(now: Long = System.currentTimeMillis()): Long =
    maxOf(activeFocusNowUntil(now), if (scheduleMode == "focus") scheduleEndsAt(now) else 0L)

  /** The scroll time multiplier in force at [now]: the schedule's during an extra-time window, otherwise 1. */
  fun multiplierFor(now: Long = System.currentTimeMillis()): Float =
    if (scheduleMode == "extra" && scheduleEndsAt(now) != 0L) scheduleMultiplier else 1f

  fun isScheduleActive(now: Long = System.currentTimeMillis()): Boolean = scheduleEndsAt(now) != 0L

  /** The scroll time that applies right now: the app's own limit, multiplied during an extra-time window. */
  fun effectiveAllowedFor(pkg: String, now: Long = System.currentTimeMillis()): Long =
    (allowedFor(pkg) * multiplierFor(now)).toLong()

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
  }
}
