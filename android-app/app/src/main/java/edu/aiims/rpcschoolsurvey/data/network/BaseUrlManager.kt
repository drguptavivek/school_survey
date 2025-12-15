package edu.aiims.rpcschoolsurvey.data.network

import android.content.Context
import edu.aiims.rpcschoolsurvey.data.config.AppDefaults

/**
 * Stores and normalizes the API base URL so it can be edited in Settings.
 */
object BaseUrlManager {
    private const val PREFS_NAME = "rpc_school_survey_prefs"
    private const val KEY_API_BASE_URL = "api_base_url"

    private lateinit var appContext: Context

    fun init(context: Context) {
        appContext = context.applicationContext
    }

    fun getBaseUrl(): String {
        val stored = getPrefs().getString(KEY_API_BASE_URL, null)
        return normalize(stored ?: AppDefaults.DEFAULT_BASE_URL)
    }

    fun setBaseUrl(url: String) {
        val normalized = normalize(url)
        getPrefs().edit().putString(KEY_API_BASE_URL, normalized).apply()
        RetrofitClient.updateBaseUrl(normalized)
    }

    private fun getPrefs() =
        appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun normalize(url: String): String {
        if (url.isBlank()) return AppDefaults.DEFAULT_BASE_URL
        val trimmed = url.trim()
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }
}
