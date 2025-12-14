package edu.aiims.rpcschoolsurvey.data.repository

import edu.aiims.rpcschoolsurvey.data.network.ApiService
import edu.aiims.rpcschoolsurvey.data.security.EncryptionManager
import edu.aiims.rpcschoolsurvey.data.security.PinManager

class AuthRepository(
    private val apiService: ApiService,
    private val encryptionManager: EncryptionManager,
    private val pinManager: PinManager
) {
    suspend fun login(email: String, password: String): Result<String> {
        return try {
            // TODO: Implement actual login API call
            // For now, return success with dummy token
            val token = "dummy_token_${System.currentTimeMillis()}"
            encryptionManager.storeDeviceToken(token)
            Result.success(token)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            encryptionManager.clearDeviceToken()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun isLoggedIn(): Boolean {
        return encryptionManager.getDeviceToken() != null
    }

    suspend fun setPin(pin: String) {
        pinManager.setupPin(pin)
    }

    suspend fun verifyPin(pin: String): Boolean {
        return pinManager.verifyPin(pin).success
    }

    fun isPinSet(): Boolean {
        return pinManager.isPinSet()
    }

    suspend fun clearPin() {
        pinManager.clearPin()
    }
}