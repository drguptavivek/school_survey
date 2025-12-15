package edu.aiims.rpcschoolsurvey.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Header

interface ApiService {

    @POST("/api/auth/login")
    suspend fun login(
        @Body request: Map<String, Any>
    ): Response<Map<String, Any>>

    
    @GET("/auth/verify")
    suspend fun verifyToken(): Response<Map<String, Any>>

    @POST("/auth/refresh")
    suspend fun refreshToken(@Body request: Map<String, String>): Response<Map<String, Any>>

    @POST("/survey/submit")
    suspend fun submitSurvey(@Body surveyData: Map<String, Any>): Response<Map<String, Any>>

    @GET("/survey/status/{id}")
    suspend fun getSurveyStatus(@Path("id") surveyId: String): Response<Map<String, Any>>

    @GET("/schools")
    suspend fun getSchools(): Response<List<Map<String, Any>>>

    @GET("/device/tokens")
    suspend fun getDeviceTokens(): Response<List<Map<String, Any>>>

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