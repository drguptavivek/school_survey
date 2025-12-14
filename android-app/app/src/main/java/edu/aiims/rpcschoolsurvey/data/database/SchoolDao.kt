package edu.aiims.rpcschoolsurvey.data.database

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

interface SchoolDao {
    suspend fun insertSchool(school: SchoolEntity): Long
    suspend fun getSchoolById(id: String): SchoolEntity?
    fun getAllSchools(): Flow<List<SchoolEntity>>
    suspend fun getUnsyncedSchools(): List<SchoolEntity>
    suspend fun markAsSynced(id: String)
    suspend fun deleteSchool(id: String)
}

// Simple implementation without Room
class SimpleSchoolDao(
    private val context: Context
) : SchoolDao {

    private val schools = mutableListOf<SchoolEntity>()
    private val schoolsFlow = MutableStateFlow<List<SchoolEntity>>(emptyList())

    override suspend fun insertSchool(school: SchoolEntity): Long {
        schools.add(school)
        schoolsFlow.value = schools.toList()
        return school.id.hashCode().toLong()
    }

    override suspend fun getSchoolById(id: String): SchoolEntity? {
        return schools.find { it.id == id }
    }

    override fun getAllSchools(): Flow<List<SchoolEntity>> {
        return schoolsFlow
    }

    override suspend fun getUnsyncedSchools(): List<SchoolEntity> {
        return schools.filter { !it.isSynced }
    }

    override suspend fun markAsSynced(id: String) {
        val index = schools.indexOfFirst { it.id == id }
        if (index != -1) {
            schools[index] = schools[index].copy(isSynced = true)
            schoolsFlow.value = schools.toList()
        }
    }

    override suspend fun deleteSchool(id: String) {
        schools.removeAll { it.id == id }
        schoolsFlow.value = schools.toList()
    }
}

// Entity class
data class SchoolEntity(
    val id: String,
    val name: String,
    val code: String,
    val address: String,
    val city: String,
    val district: String,
    val state: String,
    val pincode: String,
    val phone: String,
    val email: String,
    val principalName: String,
    val studentStrength: Int,
    val isSynced: Boolean = false
)