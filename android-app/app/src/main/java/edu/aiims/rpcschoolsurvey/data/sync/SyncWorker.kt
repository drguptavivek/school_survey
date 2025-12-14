package edu.aiims.rpcschoolsurvey.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import edu.aiims.rpcschoolsurvey.data.repository.SurveyRepository
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams), KoinComponent {

    private val surveyRepository: SurveyRepository by inject()

    override suspend fun doWork(): Result {
        return try {
            val pendingSurveys = surveyRepository.getAllSurveys()

            pendingSurveys.forEach { survey ->
                try {
                    surveyRepository.syncSurvey(survey.id)
                } catch (e: Exception) {
                    // Log error but continue with other surveys
                }
            }

            Result.success()
        } catch (e: Exception) {
            Result.failure()
        }
    }
}