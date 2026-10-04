package expo.modules.appblocker

import android.app.AppOpsManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.res.Configuration
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Runs while limits are on. Reads which app is in front from Android's usage events (Usage access) and draws its cards
 * over other apps ("Display over other apps"). Deliberately not an accessibility service: banking apps refuse to open
 * while a sideloaded app's accessibility service is switched on.
 */
class BlockerService : Service() {
  private lateinit var state: BlockerState
  private lateinit var usm: UsageStatsManager
  private val handler = Handler(Looper.getMainLooper())
  private var countingPkg: String? = null
  private var lastTickAt = 0L

  // The app in front, as of the newest usage event read so far.
  private var front: String? = null
  private var lastEventAt = 0L

  private enum class Kind { WARNING, BLOCKED }

  // The card currently on screen, if any.
  private var bannerRoot: View? = null
  private var bannerKind: Kind? = null
  private var bannerApp: String? = null
  private var bannerUntil = 0L
  private var subView: TextView? = null
  private var fillView: View? = null
  private var restView: View? = null
  private val hideBanner = Runnable { removeBanner() }

  /** Runs every second: works out which app is in front, then counts or blocks. */
  private val poll = object : Runnable {
    override fun run() {
      handler.removeCallbacks(this)
      if (!shouldRun(this@BlockerService)) {
        stopSelf()
        return
      }
      try {
        check()
      } catch (e: Exception) {
        Log.w(TAG, "check failed", e)
      }
      handler.postDelayed(this, 1000)
    }
  }

  /** Reads usage events since the last call; the latest "activity resumed" is the app in front. */
  private fun updateFront(now: Long) {
    // On the first read, look back far enough to find whatever is open right now.
    val from = if (lastEventAt == 0L) now - 60 * 60_000L else lastEventAt
    val events = usm.queryEvents(from, now)
    val e = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      if (e.eventType == UsageEvents.Event.ACTIVITY_RESUMED) front = e.packageName
      lastEventAt = maxOf(lastEventAt, e.timeStamp)
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

    // Keep the block card's countdown ticking.
    if (bannerKind == Kind.BLOCKED) {
      val left = bannerUntil - now
      if (left <= 0) removeBanner() else subView?.text = "Available again in ${clock((left + 999) / 1000)}"
    }

    updateFront(now)
    val pm = getSystemService(POWER_SERVICE) as PowerManager
    Log.d(TAG, "check front=$front counting=$countingPkg")

    if (!pm.isInteractive) {
      stopCounting()
      return
    }
    val app = front?.takeIf { it in targets }
    if (app == null) {
      stopCounting()
      return
    }

    val blockedUntil = state.blockedUntil(app)
    if (now < blockedUntil) {
      stopCounting()
      if (bannerKind != Kind.BLOCKED || bannerApp != app) showBlocked(app, blockedUntil)
      goHome()
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
    } else if (used >= allowed * 0.8) {
      // From 80% until time's up, a card stays on screen with a live countdown.
      val leftSec = Math.ceil((allowed - used) / 1000.0).toLong()
      val progress = (used.toFloat() / allowed).coerceIn(0f, 1f)
      if (bannerKind == Kind.WARNING && bannerApp == app) {
        updateWarning(app, leftSec, progress)
      } else {
        showWarning(app, leftSec, progress)
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    state = BlockerState(this)
    usm = getSystemService(USAGE_STATS_SERVICE) as UsageStatsManager
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startInForeground()
    instance = this
    handler.post(poll)
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    if (instance === this) instance = null
    handler.removeCallbacksAndMessages(null)
    removeBanner()
    super.onDestroy()
  }

  private fun startInForeground() {
    val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Blocking", NotificationManager.IMPORTANCE_MIN).apply {
          description = "Shown while DoomBreak is enforcing your limits."
          setShowBadge(false)
        }
      )
    }
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID)
    else @Suppress("DEPRECATION") Notification.Builder(this)
    val notification = builder
      .setSmallIcon(R.drawable.ic_hourglass)
      .setContentTitle("DoomBreak is on")
      .setContentText("Your app limits are being enforced.")
      .setContentIntent(open)
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun stopCounting() {
    countingPkg = null
    if (bannerKind == Kind.WARNING) removeBanner() // left the app, so the warning no longer applies
  }

  private fun enforce(app: String) {
    stopCounting()
    state.setUsedMs(app, state.allowedFor(app))
    val until = System.currentTimeMillis() + state.blockFor(app)
    state.setBlockedUntil(app, until)
    goHome()
    // Second nudge in case the app's transition swallowed the first.
    handler.postDelayed({ goHome() }, 600)
    showBlocked(app, until)
  }

  private fun label(pkg: String): String = try {
    packageManager.getApplicationInfo(pkg, 0).loadLabel(packageManager).toString()
  } catch (_: Exception) {
    "This app"
  }

  /** Brings up the home screen. Allowed from the background because the app can draw over other apps. */
  private fun goHome() {
    try {
      startActivity(
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    } catch (e: Exception) {
      Log.w(TAG, "couldn't go home", e)
    }
  }

  /** 125 -> "2:05", 3725 -> "1:02:05". */
  private fun clock(seconds: Long): String {
    val s = seconds.coerceAtLeast(0)
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "$h:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}"
    else "$m:${sec.toString().padStart(2, '0')}"
  }

  // --- Cards ---------------------------------------------------------------------------------

  private fun showWarning(app: String, leftSec: Long, progress: Float) {
    showCard(Kind.WARNING, app, "Almost at your limit", "${label(app)} closes in ${clock(leftSec)}", progress)
  }

  private fun updateWarning(app: String, leftSec: Long, progress: Float) {
    subView?.text = "${label(app)} closes in ${clock(leftSec)}"
    val fill = fillView
    val rest = restView
    if (fill != null && rest != null) {
      (fill.layoutParams as LinearLayout.LayoutParams).weight = progress * 1000f
      (rest.layoutParams as LinearLayout.LayoutParams).weight = (1f - progress) * 1000f
      fill.requestLayout()
    }
  }

  private fun showBlocked(app: String, until: Long) {
    val left = (until - System.currentTimeMillis() + 999) / 1000
    showCard(Kind.BLOCKED, app, "${label(app)} is on a break", "Available again in ${clock(left)}", null)
    bannerUntil = until
    handler.postDelayed(hideBanner, 6000) // over the home screen, so a few seconds is enough
  }

  private fun dp(v: Int): Int = (v * resources.displayMetrics.density + 0.5f).toInt()

  private fun isDark(): Boolean = when (state.themeMode) {
    "dark" -> true
    "light" -> false
    else -> (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
  }

  private fun rounded(color: Int, radiusDp: Int, strokeColor: Int? = null): GradientDrawable =
    GradientDrawable().apply {
      setColor(color)
      cornerRadius = dp(radiusDp).toFloat()
      if (strokeColor != null) setStroke(dp(1), strokeColor)
    }

  private fun showCard(kind: Kind, app: String, title: String, sub: String, progress: Float?) {
    try {
      removeBanner()
      val dark = isDark()
      val bg = if (dark) 0xFF26262C.toInt() else 0xFFFFFFFF.toInt()
      val border = if (dark) 0xFF3A3A42.toInt() else 0xFFD8D8DE.toInt()
      val titleColor = if (dark) 0xFFF2F2F5.toInt() else 0xFF111111.toInt()
      val subColor = if (dark) 0xFFA0A0AA.toInt() else 0xFF666666.toInt()
      val track = if (dark) 0xFF3A3A42.toInt() else 0xFFE4E4EA.toInt()
      val warnBg = if (dark) 0xFF3A2F0B.toInt() else 0xFFFFF3CD.toInt()
      val warnFg = if (dark) 0xFFFFDA6A.toInt() else 0xFFB26A00.toInt()

      val warning = kind == Kind.WARNING
      val iconBg = if (warning) warnBg else 0xFFDC143C.toInt()
      val iconFg = if (warning) warnFg else 0xFFFFFFFF.toInt()

      val icon = FrameLayout(this).apply {
        background = rounded(iconBg, 10)
        addView(
          ImageView(this@BlockerService).apply {
            setImageResource(if (warning) R.drawable.ic_hourglass else R.drawable.ic_lock)
            setColorFilter(iconFg)
          },
          FrameLayout.LayoutParams(dp(22), dp(22), Gravity.CENTER)
        )
      }

      val titleView = TextView(this).apply {
        text = title
        setTextColor(titleColor)
        textSize = 14f
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
      }
      val sv = TextView(this).apply {
        text = sub
        setTextColor(subColor)
        textSize = 13f
      }

      val column = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        addView(titleView)
        addView(sv)
      }

      if (progress != null) {
        val fill = View(this).apply { background = rounded(warnFg, 2) }
        val rest = View(this)
        val bar = LinearLayout(this).apply {
          orientation = LinearLayout.HORIZONTAL
          background = rounded(track, 2)
          addView(fill, LinearLayout.LayoutParams(0, dp(4), progress * 1000f))
          addView(rest, LinearLayout.LayoutParams(0, dp(4), (1f - progress) * 1000f))
        }
        column.addView(
          bar,
          LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(4)).apply { topMargin = dp(8) }
        )
        fillView = fill
        restView = rest
      }

      val card = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(dp(14), dp(12), dp(14), dp(12))
        background = rounded(bg, 16, border)
        elevation = dp(6).toFloat()
        addView(icon, LinearLayout.LayoutParams(dp(40), dp(40)).apply { marginEnd = dp(12) })
        addView(column, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
      }

      val statusBarId = resources.getIdentifier("status_bar_height", "dimen", "android")
      val statusBar = if (statusBarId > 0) resources.getDimensionPixelSize(statusBarId) else dp(24)
      val root = FrameLayout(this).apply {
        setPadding(dp(12), dp(10), dp(12), 0)
        addView(card, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT))
      }

      val lp = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
          WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT
      ).apply { gravity = Gravity.TOP }
      (getSystemService(WINDOW_SERVICE) as WindowManager).addView(root, lp)
      // Many phones already place the window below the status bar; others draw it from the very top.
      // Only add space when the card would end up under the status bar.
      root.post {
        val loc = IntArray(2)
        root.getLocationOnScreen(loc)
        if (loc[1] < statusBar) root.setPadding(dp(12), dp(10) + (statusBar - loc[1]), dp(12), 0)
      }

      bannerRoot = root
      bannerKind = kind
      bannerApp = app
      subView = sv
    } catch (e: Exception) {
      Log.w(TAG, "couldn't show card", e)
    }
  }

  private fun removeBanner() {
    handler.removeCallbacks(hideBanner)
    bannerRoot?.let {
      try {
        (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(it)
      } catch (_: Exception) {
      }
    }
    bannerRoot = null
    bannerKind = null
    bannerApp = null
    subView = null
    fillView = null
    restView = null
  }

  companion object {
    const val TAG = "DoomBlocker"
    private const val CHANNEL_ID = "blocking"
    private const val NOTIFICATION_ID = 1
    @Volatile var instance: BlockerService? = null

    fun hasUsageAccess(context: Context): Boolean {
      val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      @Suppress("DEPRECATION")
      val mode = ops.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName
      )
      return mode == AppOpsManager.MODE_ALLOWED
    }

    fun canDrawOverlays(context: Context): Boolean =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)

    /** Both permissions granted, so blocking can work. */
    fun hasPermissions(context: Context): Boolean = hasUsageAccess(context) && canDrawOverlays(context)

    fun shouldRun(context: Context): Boolean {
      val s = BlockerState(context)
      return s.enabled && s.targets.isNotEmpty() && hasPermissions(context)
    }

    /** Starts or stops the service to match the settings and permissions. */
    fun sync(context: Context) {
      val intent = Intent(context, BlockerService::class.java)
      if (!shouldRun(context)) {
        context.stopService(intent)
        return
      }
      if (instance != null) return
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
        else context.startService(intent)
      } catch (e: Exception) {
        // Android refuses to start it from the background in some states; the next sync (app opened, reboot) retries.
        Log.w(TAG, "couldn't start blocker", e)
      }
    }
  }
}
