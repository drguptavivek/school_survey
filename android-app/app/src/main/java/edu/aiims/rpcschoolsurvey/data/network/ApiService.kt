package edu.aiims.rpcschoolsurvey.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import edu.aiims.rpcschoolsurvey.data.network.dto.DeviceTokenDto
import edu.aiims.rpcschoolsurvey.data.network.dto.LoginRequest
import edu.aiims.rpcschoolsurvey.data.network.dto.LoginResponse
import edu.aiims.rpcschoolsurvey.data.network.dto.RefreshRequest
import edu.aiims.rpcschoolsurvey.data.network.dto.RefreshResponse
import edu.aiims.rpcschoolsurvey.data.network.dto.SchoolDto
import edu.aiims.rpcschoolsurvey.data.network.dto.SurveySubmissionDto
import edu.aiims.rpcschoolsurvey.data.network.dto.VerifyResponse

interface ApiService {

    @POST("/api/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    
    @GET("/auth/verify")
    suspend fun verifyToken(): Response<VerifyResponse>

    @POST("/auth/refresh")
    suspend fun refreshToken(@Body request: RefreshRequest): Response<RefreshResponse>

    @POST("/survey/submit")
    suspend fun submitSurvey(@Body surveyData: SurveySubmissionDto): Response<Map<String, Any>>

    @GET("/survey/status/{id}")
    suspend fun getSurveyStatus(@Path("id") surveyId: String): Response<Map<String, Any>>

    @GET("/schools")
    suspend fun getSchools(): Response<List<SchoolDto>>

    @GET("/device/tokens")
    suspend fun getDeviceTokens(): Response<List<DeviceTokenDto>>

    @POST("/device/tokens/{tokenId}/revoke")
    suspend fun revokeDeviceToken(
        @Path("tokenId") tokenId: String
    ): Response<Map<String, Any>>

    companion object {
        // Create authenticated API client with token interceptor
        fun create(): ApiService {
            return RetrofitClient.getRetrofit().create(ApiService::class.java)
        }

        // Create public API client for login/register device
        fun createPublic(): ApiService {
            return RetrofitClient.getPublicRetrofit().create(ApiService::class.java)
        }
    }
}
