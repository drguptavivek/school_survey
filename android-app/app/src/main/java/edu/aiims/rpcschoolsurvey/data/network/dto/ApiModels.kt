package edu.aiims.rpcschoolsurvey.data.network.dto

// Simple API response wrapper
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val error: String? = null
)

// Authentication models
data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val refreshToken: String,
    val user: UserData
)

data class UserData(
    val id: String,
    val email: String,
    val role: String,
    val partnerId: String? = null
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