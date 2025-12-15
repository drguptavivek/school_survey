package edu.aiims.rpcschoolsurvey.data.network

import android.util.Log
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import edu.aiims.rpcschoolsurvey.data.security.EncryptionManager
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private var currentBaseUrl: String = BaseUrlManager.getBaseUrl()
    private var retrofit: Retrofit? = null
    private var publicRetrofit: Retrofit? = null

    private fun buildClient(authenticated: Boolean): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(logging)

        if (authenticated) {
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
                }

                val request = requestBuilder.build()
                chain.proceed(request)
            }

            builder.addInterceptor(authInterceptor)
        }

        return builder.build()
    }

    private fun buildRetrofit(baseUrl: String, authenticated: Boolean): Retrofit {
        val client = buildClient(authenticated)
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun updateBaseUrl(newBaseUrl: String) {
        val normalized = if (newBaseUrl.endsWith("/")) newBaseUrl else "$newBaseUrl/"
        if (normalized != currentBaseUrl) {
            currentBaseUrl = normalized
            retrofit = null
            publicRetrofit = null
            Log.d("RetrofitClient", "Base URL updated to $currentBaseUrl")
        }
    }

    fun getRetrofit(baseUrlOverride: String? = null): Retrofit {
        val target = baseUrlOverride?.let { if (it.endsWith("/")) it else "$it/" } ?: currentBaseUrl
        if (retrofit == null || target != currentBaseUrl) {
            currentBaseUrl = target
            retrofit = buildRetrofit(currentBaseUrl, authenticated = true)
        }
        return retrofit!!
    }

    // Create a new client without authentication for login requests
    fun getPublicRetrofit(baseUrlOverride: String? = null): Retrofit {
        val target = baseUrlOverride?.let { if (it.endsWith("/")) it else "$it/" } ?: currentBaseUrl
        if (publicRetrofit == null || target != currentBaseUrl) {
            currentBaseUrl = target
            publicRetrofit = buildRetrofit(currentBaseUrl, authenticated = false)
        }
        return publicRetrofit!!
    }
}
