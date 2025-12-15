package edu.aiims.rpcschoolsurvey.data.database

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

// Local database interface that persists data to SharedPreferences
interface SurveyDatabase {
    fun surveyDao(): SurveyDao
    fun schoolDao(): SchoolDao
    fun syncStatusDao(): SyncStatusDao

    companion object {
        fun getDatabase(context: Context): SurveyDatabase {
            return LocalSurveyDatabase(context)
        }
    }
}

// Local implementation using SharedPreferences
class LocalSurveyDatabase(
    private val context: Context
) : SurveyDatabase {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences("survey_database", Context.MODE_PRIVATE)
    private val gson = Gson()

    override fun surveyDao(): SurveyDao = LocalSurveyDao(sharedPreferences, gson)
    override fun schoolDao(): SchoolDao = LocalSchoolDao(sharedPreferences, gson)
    override fun syncStatusDao(): SyncStatusDao = LocalSyncStatusDao(sharedPreferences, gson)
}

class Converters {
    // Add type converters if needed
    // For example, for Date objects, Enum types, etc.
}