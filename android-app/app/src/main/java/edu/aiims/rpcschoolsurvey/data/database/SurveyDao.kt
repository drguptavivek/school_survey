package edu.aiims.rpcschoolsurvey.data.database

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf

interface SurveyDao {
    suspend fun insertSurvey(survey: SurveyEntity): Long
    suspend fun getSurveyById(id: String): SurveyEntity?
    suspend fun getPendingSurveys(): List<SurveyEntity>
    suspend fun updateSyncStatus(id: String, status: String)
    fun getAllSurveys(): Flow<List<SurveyEntity>>
    suspend fun deleteSurvey(id: String)
}

// Simple implementation without Room
class SimpleSurveyDao(
    private val context: Context
) : SurveyDao {

    private val surveys = mutableListOf<SurveyEntity>()
    private val surveysFlow = MutableStateFlow<List<SurveyEntity>>(emptyList())

    override suspend fun insertSurvey(survey: SurveyEntity): Long {
        surveys.add(survey)
        surveysFlow.value = surveys.toList()
        return survey.id.hashCode().toLong()
    }

    override suspend fun getSurveyById(id: String): SurveyEntity? {
        return surveys.find { it.id == id }
    }

    override suspend fun getPendingSurveys(): List<SurveyEntity> {
        return surveys.filter { it.syncStatus == "PENDING" }
    }

    override suspend fun updateSyncStatus(id: String, status: String) {
        val index = surveys.indexOfFirst { it.id == id }
        if (index != -1) {
            surveys[index] = surveys[index].copy(syncStatus = status, updatedAt = System.currentTimeMillis())
            surveysFlow.value = surveys.toList()
        }
    }

    override fun getAllSurveys(): Flow<List<SurveyEntity>> {
        return surveysFlow
    }

    override suspend fun deleteSurvey(id: String) {
        surveys.removeAll { it.id == id }
        surveysFlow.value = surveys.toList()
    }
}

// Entity class
data class SurveyEntity(
    val id: String,
    val schoolId: String,
    val data: String, // JSON string of survey data
    val syncStatus: String = "PENDING",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)