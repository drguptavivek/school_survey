package com.schoo.survey.data.security

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.concurrent.Executor
import javax.inject.Inject
import javax.inject.Singleton

// Extension to create DataStore
val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "pin_preferences")

@Singleton
class PinManager @Inject constructor(
    private val context: Context
) {
    companion object {
        private const val MIN_PIN_LENGTH = 4
        private const val MAX_PIN_LENGTH = 6
        private const val MAX_ATTEMPTS = 5
        private const val LOCKOUT_DURATION_MS = 30_000L // 30 seconds

        private val PIN_SET_KEY = booleanPreferencesKey("pin_set")
        private val BIOMETRIC_ENABLED_KEY = booleanPreferencesKey("biometric_enabled")
        private val FAILED_ATTEMPTS_KEY = stringPreferencesKey("failed_attempts")
        private val LOCKOUT_UNTIL_KEY = stringPreferencesKey("lockout_until")
    }

    private val encryptionManager = EncryptionManager.getInstance()

    // PIN Setup
    suspend fun setupPin(pin: String): PinSetupResult {
        return try {
            when {
                pin.length < MIN_PIN_LENGTH -> PinSetupResult.failure("PIN must be at least $MIN_PIN_LENGTH digits")
                pin.length > MAX_PIN_LENGTH -> PinSetupResult.failure("PIN must be at most $MAX_PIN_LENGTH digits")
                !pin.all { it.isDigit() } -> PinSetupResult.failure("PIN must contain only digits")
                else -> {
                    encryptionManager.storePinHash(pin)
                    context.dataStore.edit { preferences ->
                        preferences[PIN_SET_KEY] = true
                        preferences[FAILED_ATTEMPTS_KEY] = "0"
                    }
                    PinSetupResult.success()
                }
            }
        } catch (e: Exception) {
            PinSetupResult.failure(e.message ?: "Unknown error")
        }
    }

    // PIN Verification
    suspend fun verifyPin(enteredPin: String): PinVerificationResult {
        // Check if PIN is set
        if (!isPinSet()) {
            return PinVerificationResult.failure("PIN not set")
        }

        // Check lockout status
        if (isLockedOut()) {
            return PinVerificationResult.failure("Too many failed attempts. Please try again later.")
        }

        return try {
            if (encryptionManager.verifyPin(enteredPin)) {
                // Reset failed attempts on successful verification
                resetFailedAttempts()
                PinVerificationResult.success()
            } else {
                // Increment failed attempts
                val attemptResult = incrementFailedAttempts()
                PinVerificationResult.failure(
                    "Incorrect PIN. Attempts remaining: ${MAX_ATTEMPTS - attemptResult}",
                    attemptsRemaining = MAX_ATTEMPTS - attemptResult,
                    isLockedOut = attemptResult >= MAX_ATTEMPTS
                )
            }
        } catch (e: Exception) {
            PinVerificationResult.failure(e.message ?: "Verification failed")
        }
    }

    // Change PIN
    suspend fun changePin(oldPin: String, newPin: String): PinChangeResult {
        val oldPinResult = verifyPin(oldPin)
        if (!oldPinResult.success) {
            return PinChangeResult.failure("Current PIN is incorrect")
        }

        val newPinResult = setupPin(newPin)
        return if (newPinResult.success) {
            PinChangeResult.success()
        } else {
            PinChangeResult.failure(newPinResult.message ?: "Failed to set new PIN")
        }
    }

    // PIN Status
    fun isPinSet(): Boolean {
        return encryptionManager.isPinSet()
    }

    suspend fun isLockedOut(): Boolean {
        val lockoutUntil = getLockoutUntil()
        return lockoutUntil > System.currentTimeMillis()
    }

    private suspend fun getLockoutUntil(): Long {
        return context.dataStore.data.map { preferences ->
            preferences[LOCKOUT_UNTIL_KEY]?.toLongOrNull() ?: 0L
        }.value
    }

    private suspend fun incrementFailedAttempts(): Int {
        var attempts = 0
        context.dataStore.edit { preferences ->
            val current = preferences[FAILED_ATTEMPTS_KEY]?.toIntOrNull() ?: 0
            attempts = current + 1
            preferences[FAILED_ATTEMPTS_KEY] = attempts.toString()

            // Set lockout if max attempts reached
            if (attempts >= MAX_ATTEMPTS) {
                preferences[LOCKOUT_UNTIL_KEY] = (System.currentTimeMillis() + LOCKOUT_DURATION_MS).toString()
            }
        }
        return attempts
    }

    private suspend fun resetFailedAttempts() {
        context.dataStore.edit { preferences ->
            preferences[FAILED_ATTEMPTS_KEY] = "0"
            preferences[LOCKOUT_UNTIL_KEY] = "0"
        }
    }

    suspend fun clearPin() {
        encryptionManager.clearPin()
        context.dataStore.edit { preferences ->
            preferences[PIN_SET_KEY] = false
            preferences[BIOMETRIC_ENABLED_KEY] = false
            preferences[FAILED_ATTEMPTS_KEY] = "0"
            preferences[LOCKOUT_UNTIL_KEY] = "0"
        }
    }

    // Biometric Authentication
    fun isBiometricAvailable(): BiometricAvailability {
        val biometricManager = BiometricManager.from(context)
        return when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)) {
            BiometricManager.BIOMETRIC_SUCCESS -> BiometricAvailability.AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> BiometricAvailability.NOT_AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> BiometricAvailability.UNAVAILABLE
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricAvailability.NOT_ENROLLED
            BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> BiometricAvailability.UPDATE_REQUIRED
            BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> BiometricAvailability.UNSUPPORTED
            BiometricManager.BIOMETRIC_STATUS_UNKNOWN -> BiometricAvailability.UNKNOWN
            else -> BiometricAvailability.UNKNOWN
        }
    }

    suspend fun enableBiometric(): Boolean {
        if (isPinSet() && isBiometricAvailable() == BiometricAvailability.AVAILABLE) {
            context.dataStore.edit { preferences ->
                preferences[BIOMETRIC_ENABLED_KEY] = true
            }
            return true
        }
        return false
    }

    suspend fun disableBiometric() {
        context.dataStore.edit { preferences ->
            preferences[BIOMETRIC_ENABLED_KEY] = false
        }
    }

    fun isBiometricEnabled(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[BIOMETRIC_ENABLED_KEY] ?: false
        }
    }

    fun createBiometricPrompt(
        executor: Executor,
        callback: BiometricPrompt.AuthenticationCallback
    ): BiometricPrompt {
        return BiometricPrompt(context, executor, callback)
    }

    fun createBiometricPromptInfo(
        title: String = "Authenticate",
        subtitle: String = "Use your biometric to authenticate",
        negativeButtonText: String = "Use PIN"
    ): BiometricPrompt.PromptInfo {
        return BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText(negativeButtonText)
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .build()
    }

    // Result classes
    data class PinSetupResult(
        val success: Boolean,
        val message: String? = null
    ) {
        companion object {
            fun success(): PinSetupResult = PinSetupResult(success = true)
            fun failure(message: String): PinSetupResult = PinSetupResult(success = false, message = message)
        }
    }

    data class PinVerificationResult(
        val success: Boolean,
        val message: String? = null,
        val attemptsRemaining: Int = 0,
        val isLockedOut: Boolean = false
    ) {
        companion object {
            fun success(): PinVerificationResult = PinVerificationResult(success = true)
            fun failure(message: String, attemptsRemaining: Int = 0, isLockedOut: Boolean = false): PinVerificationResult =
                PinVerificationResult(success = false, message = message, attemptsRemaining = attemptsRemaining, isLockedOut = isLockedOut)
        }
    }

    data class PinChangeResult(
        val success: Boolean,
        val message: String? = null
    ) {
        companion object {
            fun success(): PinChangeResult = PinChangeResult(success = true)
            fun failure(message: String): PinChangeResult = PinChangeResult(success = false, message = message)
        }
    }

    enum class BiometricAvailability {
        AVAILABLE,
        NOT_AVAILABLE,
        UNAVAILABLE,
        NOT_ENROLLED,
        UPDATE_REQUIRED,
        UNSUPPORTED,
        UNKNOWN
    }
}