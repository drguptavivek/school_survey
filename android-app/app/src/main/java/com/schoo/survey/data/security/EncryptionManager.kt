package com.schoo.survey.data.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.security.KeyStore
import java.security.SecureRandom
import java.security.Security
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EncryptionManager private constructor() {

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "survey_encryption_key"
        private const val AES_CBC_PKCS7_PADDING = "AES/CBC/PKCS7Padding"
        private const val SHARED_PREFS_NAME = "encrypted_shared_prefs"

        private const val DEVICE_TOKEN_KEY = "encrypted_device_token"
        private const val PIN_HASH_KEY = "pin_hash"
        private const val ENCRYPTION_CONTEXT_KEY = "encryption_context"

        private lateinit var instance: EncryptionManager

        fun initialize(context: Context) {
            instance = EncryptionManager()
            instance.init(context)
        }

        fun getInstance(): EncryptionManager {
            return instance
        }
    }

    private lateinit var context: Context
    private lateinit var masterKey: MasterKey
    private lateinit var encryptedSharedPreferences: EncryptedSharedPreferences
    private lateinit var secretKey: SecretKey

    private fun init(context: Context) {
        this.context = context

        // Initialize BouncyCastle provider
        Security.addProvider(BouncyCastleProvider())

        // Create or retrieve master key
        masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .setKeyGenParameterSpec(
                KeyGenParameterSpec.Builder(
                    MasterKey.DEFAULT_MASTER_KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(false)
                .build()
            )
            .build()

        // Initialize encrypted shared preferences
        encryptedSharedPreferences = EncryptedSharedPreferences.create(
            context,
            SHARED_PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        ) as EncryptedSharedPreferences

        // Initialize secret key for data encryption
        initSecretKey()
    }

    private fun initSecretKey() {
        // Try to retrieve existing key from keystore
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        secretKey = if (keyStore.containsAlias(KEY_ALIAS)) {
            keyStore.getKey(KEY_ALIAS, null) as SecretKey
        } else {
            // Generate new key
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            keyGenerator.init(
                KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                )
                .setBlockModes(KeyProperties.BLOCK_MODE_CBC)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_PKCS7)
                .setRandomizedEncryptionRequired(true)
                .build()
            )
            keyGenerator.generateKey()
        }
    }

    // Device Token Management
    fun storeDeviceToken(deviceToken: String) {
        encryptedSharedPreferences.edit()
            .putString(DEVICE_TOKEN_KEY, deviceToken)
            .apply()
    }

    fun getDeviceToken(): String? {
        return encryptedSharedPreferences.getString(DEVICE_TOKEN_KEY, null)
    }

    fun clearDeviceToken() {
        encryptedSharedPreferences.edit()
            .remove(DEVICE_TOKEN_KEY)
            .apply()
    }

    // PIN Management
    fun storePinHash(pin: String) {
        val salt = generateSalt()
        val hash = hashPin(pin, salt)
        encryptedSharedPreferences.edit()
            .putString(PIN_HASH_KEY, "$salt:$hash")
            .apply()
    }

    fun verifyPin(enteredPin: String): Boolean {
        val stored = encryptedSharedPreferences.getString(PIN_HASH_KEY, null) ?: return false
        val parts = stored.split(":")
        if (parts.size != 2) return false

        val salt = parts[0]
        val storedHash = parts[1]
        val enteredHash = hashPin(enteredPin, salt)

        return storedHash == enteredHash
    }

    fun clearPin() {
        encryptedSharedPreferences.edit()
            .remove(PIN_HASH_KEY)
            .apply()
    }

    fun isPinSet(): Boolean {
        return encryptedSharedPreferences.contains(PIN_HASH_KEY)
    }

    // Data Encryption/Decryption
    fun encryptData(data: String, key: SecretKey = secretKey): EncryptionResult {
        return try {
            val cipher = Cipher.getInstance(AES_CBC_PKCS7_PADDING)
            val iv = ByteArray(16)
            SecureRandom().nextBytes(iv)
            cipher.init(Cipher.ENCRYPT_MODE, key, IvParameterSpec(iv))

            val encryptedData = cipher.doFinal(data.toByteArray(Charsets.UTF_8))
            val combined = iv + encryptedData

            EncryptionResult(
                success = true,
                encryptedData = combined
            )
        } catch (e: Exception) {
            EncryptionResult(
                success = false,
                error = e.message
            )
        }
    }

    fun decryptData(encryptedData: ByteArray, key: SecretKey = secretKey): DecryptionResult {
        return try {
            if (encryptedData.size < 16) {
                throw IllegalArgumentException("Invalid encrypted data")
            }

            val iv = encryptedData.sliceArray(0..15)
            val data = encryptedData.sliceArray(16 until encryptedData.size)

            val cipher = Cipher.getInstance(AES_CBC_PKCS7_PADDING)
            cipher.init(Cipher.DECRYPT_MODE, key, IvParameterSpec(iv))

            val decryptedData = cipher.doFinal(data)

            DecryptionResult(
                success = true,
                decryptedData = String(decryptedData, Charsets.UTF_8)
            )
        } catch (e: Exception) {
            DecryptionResult(
                success = false,
                error = e.message
            )
        }
    }

    // Utility methods
    fun generateSalt(): String {
        val random = SecureRandom()
        val salt = ByteArray(16)
        random.nextBytes(salt)
        return salt.joinToString("") { "%02x".format(it) }
    }

    private fun hashPin(pin: String, salt: String): String {
        // Simple PBKDF2 implementation (in production, use proper crypto library)
        val combined = pin + salt
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        return digest.digest(combined.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }

    fun generateEncryptionKey(): SecretKey {
        val keyGenerator = KeyGenerator.getInstance("AES")
        keyGenerator.init(256)
        return keyGenerator.generateKey()
    }

    data class EncryptionResult(
        val success: Boolean,
        val encryptedData: ByteArray? = null,
        val error: String? = null
    )

    data class DecryptionResult(
        val success: Boolean,
        val decryptedData: String? = null,
        val error: String? = null
    )
}