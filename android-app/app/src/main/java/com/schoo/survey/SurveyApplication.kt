package com.schoo.survey

import android.app.Application
import androidx.work.Configuration
import androidx.work.WorkManager
import com.schoo.survey.data.database.SurveyDatabase
import com.schoo.survey.data.network.ApiService
import com.schoo.survey.data.repository.SurveyRepository
import com.schoo.survey.data.repository.AuthRepository
import com.schoo.survey.data.security.EncryptionManager
import com.schoo.survey.data.security.PinManager
import com.schoo.survey.data.sync.SyncManager
import org.koin.android.ext.android.get
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import org.koin.dsl.module

class SurveyApplication : Application(), Configuration.Provider {

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

        // Initialize WorkManager
        WorkManager.initialize(this, workManagerConfiguration)
    }

    override fun getWorkManagerConfiguration(): Configuration {
        return Configuration.Builder()
            .setMinimumLoggingLevel(if (BuildConfig.DEBUG) android.util.Log.DEBUG else android.util.Log.ERROR)
            .build()
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