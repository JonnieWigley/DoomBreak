package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.graphics.Color
import android.util.Log
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.inputmethod.InputMethodManager
import android.widget.TextView

class BlockerAccessibilityService : AccessibilityService() {
  private lateinit var state: BlockerState
  private val handler = Handler(Looper.getMainLooper())
  private var countingPkg: String? = null
  private var lastTickAt = 0L
  private var banner: TextView? = null
  private val hideBanner = Runnable { removeBanner() }

  /** Runs every second: works out which app is in front, then counts or blocks. Events only trigger it early. */
  private val poll = object : Runnable {
    override fun run() {
      handler.removeCallbacks(this)
      check()
      handler.postDelayed(this, 1000)
    }
  }

  private fun check() {
    val now = System.currentTimeMillis()
    val targets = state.targets

    // A finished block starts a fresh allowance.
    for (pkg in targets) {
      val until = state.blockedUntil(pkg)
      if (until != 0L && now >= until) state.resetApp(pkg)
    }

    val pm = getSystemService(POWER_SERVICE) as PowerManager
    val front = rootInActiveWindow?.packageName?.toString()
    Log.d(TAG, "check front=$front counting=$countingPkg")

    if (!pm.isInteractive) {
      stopCounting()
      return
    }
    // Unknown, keyboard and system windows don't change which app is in front.
    val unchanged = front == null || isNeutral(front)
    val app = if (unchanged) countingPkg else front?.takeIf { it in targets }
    if (app == null || app !in targets) {
      stopCounting()
      return
    }
    if (!state.enabled) return

    val blockedUntil = state.blockedUntil(app)
    if (now < blockedUntil) {
      stopCounting()
      if (!unchanged) {
        showBanner("${label(app)} is blocked for ${formatLeft((blockedUntil - now + 999) / 1000)} more.")
        goHome()
      }
      return
    }

    val elapsed = SystemClock.elapsedRealtime()
    if (countingPkg != app) {
      countingPkg = app
      lastTickAt = elapsed
      return
    }
    val used = state.usedMs(app) + (elapsed - lastTickAt)
    state.setUsedMs(app, used)
    lastTickAt = elapsed

    val allowed = state.allowedFor(app)
    if (used >= allowed) {
      enforce(app)
    } else if (!state.warned(app) && used >= allowed * 0.8) {
      state.setWarned(app, true)
      val left = Math.ceil((allowed - used) / 1000.0).toLong()
      showBanner("Almost at your viewing limit — about ${formatLeft(left)} left. ${label(app)} will close when time is up.")
    }
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    state = BlockerState(this)
    instance = this
    handler.post(poll)
  }

  override fun onDestroy() {
    if (instance === this) instance = null
    handler.removeCallbacksAndMessages(null)
    removeBanner()
    super.onDestroy()
  }

  override fun onInterrupt() {}

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    handler.post(poll) // react immediately instead of waiting up to a second
  }

  private fun stopCounting() {
    countingPkg = null
  }

  private fun enforce(app: String) {
    stopCounting()
    state.setUsedMs(app, state.allowedFor(app))
    state.setBlockedUntil(app, System.currentTimeMillis() + state.blockFor(app))
    removeBanner()
    goHome()
    // Second nudge in case the app's transition swallowed the first.
    handler.postDelayed({ goHome() }, 600)
    showBanner("Time's up — ${label(app)} is blocked for ${formatLeft(state.blockFor(app) / 1000)}.")
  }

  private fun label(pkg: String): String = try {
    packageManager.getApplicationInfo(pkg, 0).loadLabel(packageManager).toString()
  } catch (_: Exception) {
    "This app"
  }

  private fun goHome() {
    performGlobalAction(GLOBAL_ACTION_HOME)
  }

  private fun isNeutral(pkg: String): Boolean {
    if (pkg == "com.android.systemui") return true
    val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
    return imm.enabledInputMethodList.any { it.packageName == pkg }
  }

  private fun formatLeft(seconds: Long): String {
    val m = seconds / 60
    val s = seconds % 60
    return if (m > 0) "${m}m ${s}s" else "${s}s"
  }

  private fun showBanner(text: String) {
    try {
      removeBanner()
      val wm = getSystemService(WINDOW_SERVICE) as WindowManager
      val tv = TextView(this).apply {
        this.text = text
        setTextColor(Color.WHITE)
        setBackgroundColor(0xF0B00020.toInt())
        textSize = 16f
        gravity = Gravity.CENTER
        setPadding(48, 96, 48, 48)
      }
      val lp = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
          WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT
      ).apply { gravity = Gravity.TOP }
      wm.addView(tv, lp)
      banner = tv
      handler.postDelayed(hideBanner, 8000)
    } catch (_: Exception) {
    }
  }

  private fun removeBanner() {
    handler.removeCallbacks(hideBanner)
    banner?.let {
      try {
        (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(it)
      } catch (_: Exception) {
      }
    }
    banner = null
  }

  companion object {
    const val TAG = "DoomBlocker"
    @Volatile var instance: BlockerAccessibilityService? = null
  }
}
