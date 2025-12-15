package edu.aiims.rpcschoolsurvey.data.network.dto

import com.google.gson.annotations.SerializedName

// Authentication models
data class LoginRequest(
    val email: String,
    val password: String,
    val deviceId: String? = null,
    val deviceInfo: String? = null
)

data class LoginResponse(
    val success: Boolean,
    val user: UserData,
    @SerializedName(value = "deviceToken", alternate = ["device_token"])
    val deviceToken: String,
    val expiresAt: String,
    val requiresPinSetup: Boolean = false,
    val message: String? = null
)

data class UserData(
    @SerializedName(value = "id", alternate = ["userId", "user_id"])
    val id: String,
    val email: String,
    val role: String,
    val name: String? = null,
    @SerializedName(value = "partnerName", alternate = ["partner_name"])
    val partnerName: String? = null,
    @SerializedName(value = "partnerId", alternate = ["partner_id"])
    val partnerId: String? = null
)

data class RefreshRequest(
    val deviceId: String
)

data class RefreshResponse(
    val success: Boolean,
    @SerializedName(value = "deviceToken", alternate = ["device_token"])
    val deviceToken: String,
    val expiresAt: String
)

data class VerifyResponse(
    val valid: Boolean,
    val user: UserData?
)

data class LogoutRequest(
    val deviceId: String
)

data class LogoutResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)

// Survey models
data class SurveySubmissionDto(
    val id: String,
    val schoolId: String,
    val data: Map<String, Any>,
    val submittedAt: Long = System.currentTimeMillis()
)

data class SchoolDto(
    val id: String,
    val name: String,
    val code: String,
    val address: String,
    val city: String,
    val district: String,
    val state: String
)

// Sync models
data class SyncStatusRequest(
    val surveyIds: List<String>
)

data class SyncStatusResponse(
    val status: Map<String, String>
)

// Device token models
data class DeviceTokenDto(
    val id: String,
    val token: String,
    val deviceName: String,
    val createdAt: Long
)
