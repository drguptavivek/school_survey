package com.schoo.survey.data.network.dto

import kotlinx.serialization.Serializable
import java.util.*

// Base API response wrapper
@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null,
    val message: String? = null
)

// Authentication Models
@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
    val deviceId: String,
    val deviceInfo: String
)

@Serializable
data class LoginResponse(
    val success: Boolean,
    val user: UserDto,
    val deviceToken: String,
    val expiresAt: String,
    val requiresPinSetup: Boolean,
    val message: String
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val role: String,
    val partnerId: String? = null,
    val name: String
)

@Serializable
data class VerifyTokenResponse(
    val valid: Boolean,
    val user: UserDto? = null,
    val error: String? = null,
    val requiresReauth: Boolean = false
)

@Serializable
data class RefreshTokenRequest(
    val refreshToken: String,
    val deviceId: String
)

@Serializable
data class RefreshTokenResponse(
    val success: Boolean,
    val deviceToken: String,
    val expiresAt: String
)

// Survey Models
@Serializable
data class SurveySubmissionDto(
    val localId: String,
    val surveyUniqueId: String,
    val surveyDate: String,
    val districtId: String,
    val areaType: String,
    val schoolId: String,
    val schoolType: String,
    val class: Int,
    val section: String,
    val rollNo: String,
    val studentName: String,
    val sex: String,
    val age: Int,
    val consent: String,
    val usesDistanceGlasses: Boolean,
    val unaidedVaRightEye: String? = null,
    val unaidedVaLeftEye: String? = null,
    val presentingVaRightEye: String,
    val presentingVaLeftEye: String,
    val referredForRefraction: Boolean,
    val sphericalPowerRight: Double? = null,
    val sphericalPowerLeft: Double? = null,
    val cylindricalPowerRight: Double? = null,
    val cylindricalPowerLeft: Double? = null,
    val axisRight: Int? = null,
    val axisLeft: Int? = null,
    val bcvaRightEye: String? = null,
    val bcvaLeftEye: String? = null,
    val causeRightEye: String? = null,
    val causeRightEyeOther: String? = null,
    val causeLeftEye: String? = null,
    val causeLeftEyeOther: String? = null,
    val barrier1: String? = null,
    val barrier2: String? = null,
    val timeSinceLastCheckup: String? = null,
    val placeOfLastRefraction: String? = null,
    val costOfGlasses: String? = null,
    val usesSpectacleRegularly: Boolean? = null,
    val spectacleAlignmentCentering: Boolean? = null,
    val spectacleScratches: String? = null,
    val spectacleFrameIntegrity: String? = null,
    val spectaclesPrescribed: Boolean,
    val referredToOphthalmologist: Boolean,
    val submittedAt: String = Date().toInstant().toString()
)

@Serializable
data class SurveySubmissionResponse(
    val success: Boolean,
    val surveyId: String,
    val timestamp: String,
    val ack: String,
    val error: String? = null,
    val existingId: String? = null
)

@Serializable
data class UniqueIdValidationRequest(
    val surveyUniqueId: String
)

@Serializable
data class UniqueIdValidationResponse(
    val isValid: Boolean,
    val exists: Boolean,
    val message: String? = null
)

// Sync Models
@Serializable
data class BulkSyncRequest(
    val forms: List<EncryptedSurveyDto>,
    val encryptionKey: String
)

@Serializable
data class EncryptedSurveyDto(
    val localId: String,
    val encryptedData: String,
    val checksum: String
)

@Serializable
data class BulkSyncResponse(
    val success: Boolean,
    val processed: Int,
    val results: List<SyncResultDto>
)

@Serializable
data class SyncResultDto(
    val localId: String,
    val success: Boolean,
    val surveyId: String? = null,
    val timestamp: String? = null,
    val ack: String? = null,
    val error: String? = null,
    val existingId: String? = null
)

@Serializable
data class SyncStatusRequest(
    val surveyIds: List<String>
)

@Serializable
data class SyncStatusResponse(
    val success: Boolean,
    val statuses: Map<String, SyncStatusDto>
)

@Serializable
data class SyncStatusDto(
    val status: String, // "synced", "pending", "failed", "duplicate"
    val serverId: String? = null,
    val timestamp: String? = null,
    val error: String? = null
)

// School Models
@Serializable
data class SchoolDto(
    val id: String,
    val name: String,
    val code: String,
    val districtId: String,
    val districtName: String,
    val address: String? = null,
    val schoolType: String,
    val areaType: String,
    val isActive: Boolean
)

// Device Token Models
@Serializable
data class DeviceTokenDto(
    val id: String,
    val deviceId: String,
    val deviceInfo: String,
    val createdAt: String,
    val lastUsed: String,
    val expiresAt: String,
    val isRevoked: Boolean,
    val ipAddress: String? = null
)

@Serializable
data class RevokeTokenResponse(
    val success: Boolean,
    val message: String
)