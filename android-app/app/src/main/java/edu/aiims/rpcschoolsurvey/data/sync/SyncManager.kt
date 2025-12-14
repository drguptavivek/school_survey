package edu.aiims.rpcschoolsurvey.data.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import edu.aiims.rpcschoolsurvey.data.repository.SurveyRepository
import edu.aiims.rpcschoolsurvey.data.repository.AuthRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class SyncManager(
    private val surveyRepository: SurveyRepository,
    private val authRepository: AuthRepository,
    private val context: Context
) {
    private val workManager = WorkManager.getInstance(context)
    private val scope = CoroutineScope(Dispatchers.IO)

    fun startPeriodicSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresCharging(false)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            15, // Repeat interval
            TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .build()

        workManager.enqueueUniquePeriodicWork(
            "survey_sync",
            ExistingPeriodicWorkPolicy.UPDATE,
            syncRequest
        )
    }

    fun syncNow() {
        scope.launch {
            try {
                syncPendingData()
            } catch (e: Exception) {
                // Handle sync error
            }
        }
    }

    private suspend fun syncPendingData() {
        if (!authRepository.isLoggedIn()) return

        try {
            val pendingSurveys = surveyRepository.getAllSurveys()
            pendingSurveys.forEach { survey ->
                try {
                    surveyRepository.syncSurvey(survey.id)
                } catch (e: Exception) {
                    // Log error and continue with next survey
                }
            }
        } catch (e: Exception) {
            // Handle error
        }
    }

    fun stopPeriodicSync() {
        workManager.cancelUniqueWork("survey_sync")
    }
}