package expo.modules.appblocker

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.util.Calendar

class AppBlockerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  private fun isServiceEnabled(): Boolean {
    val enabled = Settings.Secure.getString(
      context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    val name = "${context.packageName}/${BlockerAccessibilityService::class.java.name}"
    return enabled.split(':').any { it.equals(name, ignoreCase = true) }
  }

  private fun hasUsageAccess(): Boolean {
    val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = ops.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName
    )
    return mode == AppOpsManager.MODE_ALLOWED
  }

  /** Sums the time the app had a resumed activity since local midnight, from Android's usage events. */
  private fun screenTimeToday(pkg: String): Long {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val now = System.currentTimeMillis()
    val midnight = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.timeInMillis
    val events = usm.queryEvents(midnight, now)
    val e = UsageEvents.Event()
    var total = 0L
    var resumedAt = 0L
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      when (e.eventType) {
        // 1 = activity resumed, 2 = paused, 23 = stopped, 16 = screen off
        1 -> if (e.packageName == pkg && resumedAt == 0L) resumedAt = e.timeStamp
        2, 23 -> if (e.packageName == pkg && resumedAt != 0L) {
          total += e.timeStamp - resumedAt
          resumedAt = 0L
        }
        16 -> if (resumedAt != 0L) {
          total += e.timeStamp - resumedAt
          resumedAt = 0L
        }
      }
    }
    if (resumedAt != 0L) total += now - resumedAt
    return total
  }

  /** The app's own launcher icon as a base64 PNG, or null if it isn't installed. */
  private fun iconOf(pkg: String, size: Int = 128): String? = try {
    val drawable = context.packageManager.getApplicationIcon(pkg)
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    drawable.setBounds(0, 0, size, size)
    drawable.draw(Canvas(bitmap))
    val out = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  } catch (_: Exception) {
    null
  }

  override fun definition() = ModuleDefinition {
    Name("AppBlocker")

    Function("isServiceEnabled") { isServiceEnabled() }

    Function("openAccessibilitySettings") {
      context.startActivity(
        Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    Function("configure") { enabled: Boolean, targets: List<String> ->
      val s = BlockerState(context)
      s.enabled = enabled
      s.targets = targets.toSet()
    }

    Function("setAppLimits") { pkg: String, allowedMinutes: Double, blockMinutes: Double ->
      BlockerState(context).setLimits(pkg, (allowedMinutes * 60_000).toLong(), (blockMinutes * 60_000).toLong())
    }

    Function("getAppLimits") { pkg: String ->
      val s = BlockerState(context)
      mapOf("allowedMinutes" to s.allowedFor(pkg) / 60_000.0, "blockMinutes" to s.blockFor(pkg) / 60_000.0)
    }

    Function("getAppIcon") { pkg: String -> iconOf(pkg) }

    Function("hasUsageAccess") { hasUsageAccess() }

    Function("openUsageAccessSettings") {
      context.startActivity(
        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    /** Foreground time today in ms, or -1 if usage access hasn't been granted. */
    Function("getScreenTimeToday") { pkg: String -> if (hasUsageAccess()) screenTimeToday(pkg) else -1L }

    Function("resetApp") { pkg: String -> BlockerState(context).resetApp(pkg) }

    Function("getThemeMode") { BlockerState(context).themeMode }

    Function("setThemeMode") { mode: String -> BlockerState(context).themeMode = mode }

    Function("getStatus") {
      val s = BlockerState(context)
      mapOf(
        "serviceEnabled" to isServiceEnabled(),
        "enabled" to s.enabled,
        "targets" to s.targets.toList(),
        "apps" to s.targets.map {
          mapOf(
            "package" to it,
            "usedMs" to s.usedMs(it),
            "blockedUntil" to s.blockedUntil(it),
            "allowedMinutes" to s.allowedFor(it) / 60_000.0,
            "blockMinutes" to s.blockFor(it) / 60_000.0
          )
        },
        "now" to System.currentTimeMillis()
      )
    }

    Function("resetSession") {
      val s = BlockerState(context)
      s.targets.forEach { s.resetApp(it) }
    }
  }
}
