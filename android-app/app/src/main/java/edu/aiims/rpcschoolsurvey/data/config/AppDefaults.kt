package edu.aiims.rpcschoolsurvey.data.config

object AppDefaults {
    // Emulator -> host machine
    const val DEFAULT_BASE_URL = "http://10.0.2.2:5173/api/"

    // Inactivity timeout before requiring PIN unlock (ms)
    const val INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000L // 15 minutes

    // PIN length enforced in UI
    const val PIN_LENGTH = 4
}
