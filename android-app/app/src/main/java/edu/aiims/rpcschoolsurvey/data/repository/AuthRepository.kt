package edu.aiims.rpcschoolsurvey.data.repository

import android.content.Context
import edu.aiims.rpcschoolsurvey.data.network.ApiService
import edu.aiims.rpcschoolsurvey.data.network.dto.LoginRequest
import edu.aiims.rpcschoolsurvey.data.security.EncryptionManager
import edu.aiims.rpcschoolsurvey.data.security.PinManager
import android.provider.Settings
import edu.aiims.rpcschoolsurvey.data.network.dto.LogoutRequest

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

            val request = LoginRequest(
                email = email,
                password = password,
                deviceId = deviceId,
                deviceInfo = deviceInfo
            )

            val response = apiService.login(request)

            if (response.isSuccessful) {
                val responseData = response.body()

                // Store the issued device token
                val deviceToken = responseData?.deviceToken.orEmpty()
                if (deviceToken.isNotEmpty()) {
                    encryptionManager.storeDeviceToken(deviceToken)
                }

                Result.success(
                    mapOf(
                        "deviceToken" to deviceToken,
                        "user" to (responseData?.user ?: emptyMap<String, Any>()),
                        "expiresAt" to (responseData?.expiresAt ?: ""),
                        "requiresPinSetup" to (responseData?.requiresPinSetup ?: false),
                        "message" to (responseData?.message ?: "")
                    )
                )
            } else {
                Result.failure(Exception("Login failed: ${response.code()} - ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            // Call logout API to revoke current device token
            val token = encryptionManager.getDeviceToken()
            if (token != null) {
                try {
                    val response = apiService.logout(
                        LogoutRequest(deviceId = deviceId)
                    )
                    if (!response.isSuccessful || response.body()?.success != true) {
                        throw Exception(response.body()?.error ?: "Logout failed")
                    }
                } catch (e: Exception) {
                    // Still clear locally, but surface the error
                    encryptionManager.clearDeviceToken()
                    pinManager.clearPin()
                    return Result.failure(e)
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
