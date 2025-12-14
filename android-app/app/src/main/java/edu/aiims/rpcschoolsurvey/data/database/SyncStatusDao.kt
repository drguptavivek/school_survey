package edu.aiims.rpcschoolsurvey.data.database

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

interface SyncStatusDao {
    suspend fun insertSyncStatus(syncStatus: SyncStatusEntity): Long
    suspend fun getSyncStatus(entityType: String, entityId: String): SyncStatusEntity?
    suspend fun updateSyncStatus(syncStatus: SyncStatusEntity)
    fun getFailedSyncs(): Flow<List<SyncStatusEntity>>
    fun getPendingSyncs(): Flow<List<SyncStatusEntity>>
    suspend fun deleteSyncStatus(entityType: String, entityId: String)
}

// Simple implementation without Room
class SimpleSyncStatusDao(
    private val context: Context
) : SyncStatusDao {

    private val syncStatuses = mutableListOf<SyncStatusEntity>()
    private val failedSyncsFlow = MutableStateFlow<List<SyncStatusEntity>>(emptyList())
    private val pendingSyncsFlow = MutableStateFlow<List<SyncStatusEntity>>(emptyList())

    override suspend fun insertSyncStatus(syncStatus: SyncStatusEntity): Long {
        syncStatuses.add(syncStatus)
        updateFlows()
        return syncStatus.id
    }

    override suspend fun getSyncStatus(entityType: String, entityId: String): SyncStatusEntity? {
        return syncStatuses.find { it.entityType == entityType && it.entityId == entityId }
    }

    override suspend fun updateSyncStatus(syncStatus: SyncStatusEntity) {
        val index = syncStatuses.indexOfFirst { it.id == syncStatus.id }
        if (index != -1) {
            syncStatuses[index] = syncStatus
            updateFlows()
        }
    }

    override fun getFailedSyncs(): Flow<List<SyncStatusEntity>> {
        return failedSyncsFlow
    }

    override fun getPendingSyncs(): Flow<List<SyncStatusEntity>> {
        return pendingSyncsFlow
    }

    override suspend fun deleteSyncStatus(entityType: String, entityId: String) {
        syncStatuses.removeAll { it.entityType == entityType && it.entityId == entityId }
        updateFlows()
    }

    private fun updateFlows() {
        failedSyncsFlow.value = syncStatuses.filter { it.status == "FAILED" }.sortedByDescending { it.lastAttempt }
        pendingSyncsFlow.value = syncStatuses.filter { it.status == "PENDING" }.sortedBy { it.createdAt }
    }
}

// Entity class
data class SyncStatusEntity(
    val id: Long = 0,
    val entityType: String, // "SURVEY" or "SCHOOL"
    val entityId: String,
    val status: String, // "PENDING", "SUCCESS", "FAILED"
    val lastAttempt: Long = System.currentTimeMillis(),
    val errorMessage: String? = null,
    val retryCount: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)