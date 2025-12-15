package edu.aiims.rpcschoolsurvey.data.security

import android.content.Context
import edu.aiims.rpcschoolsurvey.data.config.AppDefaults

/**
 * Tracks last user activity for PIN re-auth enforcement.
 */
object InactivityTracker {
    private const val PREFS_NAME = "rpc_inactivity_prefs"
    private const val KEY_LAST_ACTIVE = "last_active"

    private lateinit var appContext: Context

    fun init(context: Context) {
        appContext = context.applicationContext
    }

    fun markActive(timestamp: Long = System.currentTimeMillis()) {
        prefs().edit().putLong(KEY_LAST_ACTIVE, timestamp).apply()
    }

    fun clear() {
        prefs().edit().remove(KEY_LAST_ACTIVE).apply()
    }

    fun isTimedOut(now: Long = System.currentTimeMillis()): Boolean {
        val last = prefs().getLong(KEY_LAST_ACTIVE, 0L)
        if (last == 0L) return true
        return now - last >= AppDefaults.INACTIVITY_TIMEOUT_MS
    }

    private fun prefs() =
        appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
