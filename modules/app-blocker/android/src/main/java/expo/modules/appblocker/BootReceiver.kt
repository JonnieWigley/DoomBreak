package expo.modules.appblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restarts blocking after the phone reboots or DoomBreak is updated. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      BlockerService.sync(context)
    }
  }
}
