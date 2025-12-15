package edu.aiims.rpcschoolsurvey.data.database

import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
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

// Local implementation using SharedPreferences
class LocalSurveyDao(
    private val sharedPreferences: SharedPreferences,
    private val gson: Gson
) : SurveyDao {

    companion object {
        private const val SURVEYS_KEY = "surveys"
    }

    private val surveysFlow = MutableStateFlow<List<SurveyEntity>>(emptyList())

    init {
        // Load existing surveys from SharedPreferences
        loadSurveys()
    }

    private fun loadSurveys() {
        val surveysJson = sharedPreferences.getString(SURVEYS_KEY, null)
        val surveys = if (surveysJson != null) {
            try {
                val type = object : TypeToken<List<SurveyEntity>>() {}.type
                gson.fromJson<List<SurveyEntity>>(surveysJson, type) ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }
        } else {
            emptyList()
        }
        surveysFlow.value = surveys
    }

    private fun saveSurveys(surveys: List<SurveyEntity>) {
        val surveysJson = gson.toJson(surveys)
        sharedPreferences.edit()
            .putString(SURVEYS_KEY, surveysJson)
            .apply()
        surveysFlow.value = surveys
    }

    override suspend fun insertSurvey(survey: SurveyEntity): Long {
        val currentSurveys = surveysFlow.value.toMutableList()
        currentSurveys.add(survey)
        saveSurveys(currentSurveys)
        return survey.id.hashCode().toLong()
    }

    override suspend fun getSurveyById(id: String): SurveyEntity? {
        return surveysFlow.value.find { it.id == id }
    }

    override suspend fun getPendingSurveys(): List<SurveyEntity> {
        return surveysFlow.value.filter { it.syncStatus == "PENDING" }
    }

    override suspend fun updateSyncStatus(id: String, status: String) {
        val currentSurveys = surveysFlow.value.toMutableList()
        val index = currentSurveys.indexOfFirst { it.id == id }
        if (index != -1) {
            currentSurveys[index] = currentSurveys[index].copy(
                syncStatus = status,
                updatedAt = System.currentTimeMillis()
            )
            saveSurveys(currentSurveys)
        }
    }

    override fun getAllSurveys(): Flow<List<SurveyEntity>> {
        return surveysFlow
    }

    override suspend fun deleteSurvey(id: String) {
        val currentSurveys = surveysFlow.value.toMutableList()
        currentSurveys.removeAll { it.id == id }
        saveSurveys(currentSurveys)
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