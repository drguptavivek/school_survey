package com.schoo.survey.data.network

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.schoo.survey.BuildConfig
import com.schoo.survey.data.network.dto.*
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface ApiService {

    // Authentication endpoints
    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): ApiResponse<LoginResponse>

    @POST("auth/verify")
    suspend fun verifyToken(
        @Header("Authorization") token: String
    ): ApiResponse<VerifyTokenResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequest
    ): ApiResponse<RefreshTokenResponse>

    // Survey endpoints
    @POST("surveys/submit")
    suspend fun submitSurvey(
        @Header("Authorization") token: String,
        @Body survey: SurveySubmissionDto
    ): ApiResponse<SurveySubmissionResponse>

    @POST("surveys/sync-status")
    suspend fun checkSyncStatus(
        @Header("Authorization") token: String,
        @Body request: SyncStatusRequest
    ): ApiResponse<SyncStatusResponse>

    @POST("surveys/unique-id")
    suspend fun validateUniqueId(
        @Header("Authorization") token: String,
        @Body request: UniqueIdValidationRequest
    ): ApiResponse<UniqueIdValidationResponse>

    // Bulk sync endpoints
    @POST("sync/upload")
    suspend fun uploadBulkSurveys(
        @Header("Authorization") token: String,
        @Body request: BulkSyncRequest
    ): ApiResponse<BulkSyncResponse>

    @GET("sync/status")
    suspend fun getSyncStatus(
        @Header("Authorization") token: String
    ): ApiResponse<SyncStatusResponse>

    // School endpoints
    @GET("schools/by-partner")
    suspend fun getSchoolsByPartner(
        @Header("Authorization") token: String,
        @Query("partnerId") partnerId: String? = null
    ): ApiResponse<List<SchoolDto>>

    // Device token management
    @GET("device-tokens")
    suspend fun getDeviceTokens(
        @Header("Authorization") token: String
    ): ApiResponse<List<DeviceTokenDto>>

    @POST("device-tokens/{tokenId}/revoke")
    suspend fun revokeDeviceToken(
        @Header("Authorization") token: String,
        @Path("tokenId") tokenId: String
    ): ApiResponse<RevokeTokenResponse>

    companion object {
        private const val CONNECT_TIMEOUT = 30L
        private const val READ_TIMEOUT = 60L
        private const val WRITE_TIMEOUT = 60L

        fun create(): ApiService {
            val json = Json {
                ignoreUnknownKeys = true
                coerceInputValues = true
                encodeDefaults = true
            }

            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) {
                    HttpLoggingInterceptor.Level.BODY
                } else {
                    HttpLoggingInterceptor.Level.NONE
                }
            }

            val okHttpClient = OkHttpClient.Builder()
                .connectTimeout(CONNECT_TIMEOUT, TimeUnit.SECONDS)
                .readTimeout(READ_TIMEOUT, TimeUnit.SECONDS)
                .writeTimeout(WRITE_TIMEOUT, TimeUnit.SECONDS)
                .addInterceptor(loggingInterceptor)
                .addInterceptor { chain ->
                    val request = chain.request().newBuilder()
                        .addHeader("Content-Type", "application/json")
                        .addHeader("Accept", "application/json")
                        .build()
                    chain.proceed(request)
                }
                .build()

            return Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(okHttpClient)
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()
                .create(ApiService::class.java)
        }
    }
}