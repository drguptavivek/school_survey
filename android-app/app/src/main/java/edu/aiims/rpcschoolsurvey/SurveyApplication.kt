package edu.aiims.rpcschoolsurvey

import android.app.Application
import androidx.work.Configuration
import androidx.work.WorkManager
import edu.aiims.rpcschoolsurvey.data.database.SurveyDatabase
import edu.aiims.rpcschoolsurvey.data.network.ApiService
import edu.aiims.rpcschoolsurvey.data.repository.SurveyRepository
import edu.aiims.rpcschoolsurvey.data.repository.AuthRepository
import edu.aiims.rpcschoolsurvey.data.security.EncryptionManager
import edu.aiims.rpcschoolsurvey.data.security.PinManager
import edu.aiims.rpcschoolsurvey.data.sync.SyncManager
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import org.koin.dsl.module

class SurveyApplication : Application() {

    // Database instance
    val database by lazy { SurveyDatabase.getDatabase(this) }

    override fun onCreate() {
        super.onCreate()

        // Initialize Koin DI
        startKoin {
            androidContext(this@SurveyApplication)
            modules(appModule)
        }

        // Initialize encryption manager
        EncryptionManager.initialize(this)
    }

    // Dependency Injection module
    private val appModule = module {
        // Database
        single { get<SurveyApplication>().database }
        single { get<SurveyDatabase>().surveyDao() }
        single { get<SurveyDatabase>().schoolDao() }
        single { get<SurveyDatabase>().syncStatusDao() }

        // Network
        single { ApiService.create() }

        // Security
        single { EncryptionManager }
        single { PinManager(get()) }

        // Repositories
        single { AuthRepository(get(), get(), get()) }
        single { SurveyRepository(get(), get(), get(), get()) }

        // Sync Manager
        single { SyncManager(get(), get(), get()) }
    }
}