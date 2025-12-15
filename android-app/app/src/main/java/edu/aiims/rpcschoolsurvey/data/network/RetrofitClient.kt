package edu.aiims.rpcschoolsurvey.data.network

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import edu.aiims.rpcschoolsurvey.data.security.EncryptionManager
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private const val BASE_URL = "http://localhost:5173/api/" // Update to your backend URL

    val instance: Retrofit by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        // Authentication interceptor that adds device token to all requests
        val authInterceptor = Interceptor { chain ->
            val originalRequest = chain.request()

            // Get device token from EncryptionManager
            val deviceToken = try {
                EncryptionManager.getInstance().getDeviceToken()
            } catch (e: Exception) {
                null
            }

            // Add authentication header if token exists
            val requestBuilder = originalRequest.newBuilder()
            deviceToken?.let { token ->
                requestBuilder.addHeader("Authorization", "Bearer $token")
                // Note: Device ID should be added at request time from AuthRepository
                // since we don't have Context here
            }

            val request = requestBuilder.build()
            chain.proceed(request)
        }

        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()

        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun getRetrofit(): Retrofit = instance

    // Create a new client without authentication for login requests
    fun getPublicRetrofit(): Retrofit {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}