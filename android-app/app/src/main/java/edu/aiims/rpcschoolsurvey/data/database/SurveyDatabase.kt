package edu.aiims.rpcschoolsurvey.data.database

import android.content.Context

// Simple database interface without Room for now
interface SurveyDatabase {
    fun surveyDao(): SurveyDao
    fun schoolDao(): SchoolDao
    fun syncStatusDao(): SyncStatusDao

    companion object {
        fun getDatabase(context: Context): SurveyDatabase {
            return SimpleSurveyDatabase(context)
        }
    }
}

// Simple implementation without Room
class SimpleSurveyDatabase(
    private val context: Context
) : SurveyDatabase {

    override fun surveyDao(): SurveyDao = SimpleSurveyDao(context)
    override fun schoolDao(): SchoolDao = SimpleSchoolDao(context)
    override fun syncStatusDao(): SyncStatusDao = SimpleSyncStatusDao(context)
}

class Converters {
    // Add type converters if needed
    // For example, for Date objects, Enum types, etc.
}