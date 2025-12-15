package edu.aiims.rpcschoolsurvey.data.repository

import android.content.Context
import edu.aiims.rpcschoolsurvey.data.network.ApiService
import edu.aiims.rpcschoolsurvey.data.security.EncryptionManager
import edu.aiims.rpcschoolsurvey.data.security.PinManager
import android.provider.Settings

class AuthRepository(
    private val context: Context,
    private val apiService: ApiService,
    private val encryptionManager: EncryptionManager,
    private val pinManager: PinManager
) {

    // Get device ID
    private val deviceId: String = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ANDROID_ID
    ) ?: "unknown_device"

    
    suspend fun login(email: String, password: String): Result<Map<String, Any>> {
        return try {
            val deviceInfo = "${getDeviceName()} (App v${getAppVersion()})"

            val request = mapOf(
                "email" to email,
                "password" to password,
                "deviceId" to deviceId,
                "deviceInfo" to deviceInfo
            )

            val response = ApiService.createPublic().login(request)

            if (response.isSuccessful) {
                val responseData = response.body() ?: emptyMap<String, Any>()

                // Extract and store the device token
                val deviceToken = responseData["deviceToken"] as? String ?: ""

                if (deviceToken.isNotEmpty()) {
                    encryptionManager.storeDeviceToken(deviceToken)
                }

                Result.success(responseData)
            } else {
                Result.failure(Exception("Login failed: ${response.code()} - ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            // Call logout API if available
            val token = encryptionManager.getDeviceToken()
            if (token != null) {
                try {
                    // You can add a logout endpoint to your API
                    // For now, just clear local token
                } catch (e: Exception) {
                    // Continue with cleanup even if API call fails
                }
            }

            // Clear local token and PIN
            encryptionManager.clearDeviceToken()
            pinManager.clearPin()

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

    fun getDeviceToken(): String? {
        return encryptionManager.getDeviceToken()
    }

    fun getDeviceId(): String = deviceId

    private fun getDeviceName(): String {
        return "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}".trim()
    }

    private fun getAppVersion(): String {
        return try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            packageInfo.versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }
}