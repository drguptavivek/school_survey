package edu.aiims.rpcschoolsurvey.presentation.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import android.provider.Settings
import edu.aiims.rpcschoolsurvey.data.security.EncryptionManager
import edu.aiims.rpcschoolsurvey.data.repository.AuthRepository
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import androidx.compose.runtime.LaunchedEffect

@Composable
fun AuthNavigation() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("dashboard") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }
        composable("dashboard") {
            DashboardScreen(
                onNavigateToSettings = {
                    navController.navigate("settings")
                }
            )
        }
        composable("settings") {
            SettingsScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    val context = LocalContext.current
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var loginTrigger by remember { mutableStateOf(0) }

    // Create AuthRepository instance
    val authRepository = remember {
        AuthRepository(
            context = context,
            apiService = edu.aiims.rpcschoolsurvey.data.network.ApiService.createPublic(),
            encryptionManager = edu.aiims.rpcschoolsurvey.data.security.EncryptionManager.getInstance(),
            pinManager = edu.aiims.rpcschoolsurvey.data.security.PinManager(context)
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "RPC School Survey",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                if (email.isBlank() || password.isBlank()) {
                    errorMessage = "Please enter email and password"
                    return@Button
                }

                isLoading = true
                errorMessage = null

                // Trigger login coroutine
                loginTrigger++
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading && email.isNotBlank() && password.isNotBlank()
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp))
            } else {
                Text("Login")
            }
        }

        // Error message display
        errorMessage?.let { error ->
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = error,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Test Users:\n• admin@example.com / password123\n• manager@example.com / password123\n• team@example.com / password123",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    // Handle login coroutine
    if (loginTrigger > 0) {
        LaunchedEffect(loginTrigger) {
            try {
                val result = authRepository.login(email, password)
                if (result.isSuccess) {
                    onLoginSuccess()
                } else {
                    errorMessage = result.exceptionOrNull()?.message ?: "Login failed"
                }
            } catch (e: Exception) {
                errorMessage = e.message ?: "Login failed"
            } finally {
                isLoading = false
            }
        }
    }
}

@Composable
fun DashboardScreen(onNavigateToSettings: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Welcome to RPC School Survey!",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Dashboard - Ready for development",
            style = MaterialTheme.typography.bodyLarge
        )

        Spacer(modifier = Modifier.height(32.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Button(
                onClick = { /* TODO: Navigate to survey form */ }
            ) {
                Text("Start Survey")
            }

            OutlinedButton(
                onClick = onNavigateToSettings
            ) {
                Text("Settings")
            }
        }
    }
}

@Composable
fun SettingsScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val encryptionManager = EncryptionManager.getInstance()

    // For now, let's use a simple instance without Koin injection
    // We'll fix the dependency injection later
    val authRepository = remember {
        AuthRepository(
            context = context,
            apiService = edu.aiims.rpcschoolsurvey.data.network.ApiService.create(),
            encryptionManager = encryptionManager,
            pinManager = edu.aiims.rpcschoolsurvey.data.security.PinManager(context)
        )
    }

    // Get device ID
    val deviceId = remember {
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "Unknown"
    }

    // Get device token from encryption manager
    val deviceToken = remember {
        encryptionManager.getDeviceToken() ?: "Not Set"
    }

    // Check authentication status
    val isLoggedIn = remember {
        authRepository.isLoggedIn()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Top bar with back button
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onNavigateBack) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "Back"
                )
            }
            Text(
                text = "Settings",
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Device Information Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Device Information",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Device ID
                InfoItem(
                    label = "Device ID",
                    value = deviceId,
                    monospace = true
                )

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                // Device Token
                InfoItem(
                    label = "Device Token",
                    value = deviceToken,
                    monospace = true
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Authentication Status Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Authentication Status",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Login Status
                InfoItem(
                    label = "Login Status",
                    value = if (isLoggedIn) "Logged In" else "Not Logged In"
                )

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                // Token Validity
                InfoItem(
                    label = "Token Status",
                    value = if (deviceToken != "Not Set") "Active" else "No Token"
                )

                if (deviceToken != "Not Set") {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    InfoItem(
                        label = "Token Length",
                        value = "${deviceToken.length} characters"
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Logout Button
                if (isLoggedIn) {
                    Button(
                        onClick = {
                            // Clear device token and navigate back to login
                            encryptionManager.clearDeviceToken()
                            // Note: In a real app, you'd navigate to login screen here
                            onNavigateBack()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error,
                            contentColor = MaterialTheme.colorScheme.onError
                        )
                    ) {
                        Text("Logout")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // API Configuration Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "API Configuration",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                InfoItem(
                    label = "Base URL",
                    value = "http://localhost:5173/api"
                )

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                InfoItem(
                    label = "Network Status",
                    value = "Connected (via ADB reverse proxy)"
                )
            }
        }
    }
}

@Composable
private fun InfoItem(
    label: String,
    value: String,
    monospace: Boolean = false
) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontFamily = if (monospace) FontFamily.Monospace else FontFamily.Default
            ),
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}