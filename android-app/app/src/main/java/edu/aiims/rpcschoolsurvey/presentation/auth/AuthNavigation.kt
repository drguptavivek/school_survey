package edu.aiims.rpcschoolsurvey.presentation.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import edu.aiims.rpcschoolsurvey.data.security.PinManager
import edu.aiims.rpcschoolsurvey.data.repository.AuthRepository
import edu.aiims.rpcschoolsurvey.data.network.BaseUrlManager
import edu.aiims.rpcschoolsurvey.data.network.ApiService
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import androidx.compose.runtime.LaunchedEffect
import edu.aiims.rpcschoolsurvey.data.security.InactivityTracker
import edu.aiims.rpcschoolsurvey.data.config.AppDefaults

private const val PIN_MASK_CHAR = '●'

@Composable
fun AuthNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val encryptionManager = EncryptionManager.getInstance()
    val pinManager = remember { PinManager(context) }
    val lifecycleOwner = context as LifecycleOwner
    val hasToken = encryptionManager.getDeviceToken() != null
    val startDestination = when {
        hasToken && pinManager.isPinSet() && InactivityTracker.isTimedOut() -> "pinUnlock"
        hasToken && pinManager.isPinSet() -> "dashboard"
        hasToken -> "pinSetup"
        else -> "login"
    }

    // Inactivity watcher: on resume, enforce PIN if timed out
    DisposableEffect(lifecycleOwner, hasToken) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                val tokenExists = encryptionManager.getDeviceToken() != null
                val pinSet = pinManager.isPinSet()
                if (tokenExists && pinSet) {
                    if (InactivityTracker.isTimedOut()) {
                        navController.navigate("pinUnlock") {
                            popUpTo(0) { inclusive = true }
                        }
                    } else {
                        InactivityTracker.markActive()
                    }
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("dashboard") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onRequirePinSetup = {
                    navController.navigate("pinSetup") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onNavigateToSettings = {
                    navController.navigate("settings")
                }
            )
        }
        composable("pinSetup") {
            PinSetupScreen(
                onPinSet = {
                    InactivityTracker.markActive()
                    navController.navigate("dashboard") {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onLogout = {
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        composable("pinUnlock") {
            PinUnlockScreen(
                onUnlocked = {
                    InactivityTracker.markActive()
                    navController.navigate("dashboard") {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onLogout = {
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        composable("dashboard") {
            DashboardScreen(
                onNavigateToSettings = {
                    navController.navigate("settings")
                },
                onNavigateToLogin = {
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        composable("settings") {
            SettingsScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onLogout = {
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onRequirePinSetup: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val context = LocalContext.current
    val baseUrl = remember { BaseUrlManager.getBaseUrl() }
    val pinManager = remember { PinManager(context) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var loginTrigger by remember { mutableStateOf(0) }

    // Create AuthRepository instance
    val authRepository = remember {
        AuthRepository(
            context = context,
            apiService = ApiService.createPublic(baseUrl),
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

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(
            onClick = onNavigateToSettings,
            modifier = Modifier.align(Alignment.End)
        ) {
            Icon(
                imageVector = Icons.Default.Settings,
                contentDescription = "Settings",
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text("Settings")
        }
    }

    // Handle login coroutine
    if (loginTrigger > 0) {
        LaunchedEffect(loginTrigger) {
            try {
                val result = authRepository.login(email, password)
                if (result.isSuccess) {
                    if (pinManager.isPinSet()) {
                        InactivityTracker.markActive()
                        onLoginSuccess()
                    } else {
                        onRequirePinSetup()
                    }
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
fun DashboardScreen(
    onNavigateToSettings: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    val encryptionManager = EncryptionManager.getInstance()
    val isLoggedIn = remember { mutableStateOf(encryptionManager.getDeviceToken() != null) }
    LaunchedEffect(isLoggedIn.value) {
        if (isLoggedIn.value) {
            InactivityTracker.markActive()
        }
    }

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

        if (!isLoggedIn.value) {
            Text(
                text = "You are logged out. Please login to continue.",
                style = MaterialTheme.typography.bodyLarge
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(onClick = onNavigateToLogin) {
                Text("Login")
            }
        } else {
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
}

@Composable
fun PinSetupScreen(
    onPinSet: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val pinManager = remember { PinManager(context) }
    val encryptionManager = EncryptionManager.getInstance()
    val scope = rememberCoroutineScope()
    var pin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Set Your ${AppDefaults.PIN_LENGTH}-digit PIN",
            style = MaterialTheme.typography.headlineSmall
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = pin,
            onValueChange = { if (it.length <= AppDefaults.PIN_LENGTH && it.all { c -> c.isDigit() }) pin = it },
            label = { Text("PIN") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            visualTransformation = PasswordVisualTransformation(PIN_MASK_CHAR)
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = confirmPin,
            onValueChange = { if (it.length <= AppDefaults.PIN_LENGTH && it.all { c -> c.isDigit() }) confirmPin = it },
            label = { Text("Confirm PIN") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            visualTransformation = PasswordVisualTransformation(PIN_MASK_CHAR)
        )

        errorMessage?.let {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = {
                errorMessage = null
                when {
                    pin.length != AppDefaults.PIN_LENGTH -> errorMessage = "PIN must be ${AppDefaults.PIN_LENGTH} digits"
                    confirmPin != pin -> errorMessage = "PINs do not match"
                    else -> {
                        isSaving = true
                        scope.launch {
                            val result = pinManager.setupPin(pin)
                            isSaving = false
                            if (result.success) {
                                InactivityTracker.markActive()
                                onPinSet()
                            } else {
                                errorMessage = result.message ?: "Failed to set PIN"
                            }
                        }
                    }
                }
            },
            enabled = !isSaving,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isSaving) {
                CircularProgressIndicator(modifier = Modifier.size(18.dp))
            } else {
                Text("Save PIN")
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        TextButton(onClick = {
            encryptionManager.clearDeviceToken()
            scope.launch {
                pinManager.clearPin()
            }
            InactivityTracker.clear()
            onLogout()
        }) {
            Text("Logout instead")
        }
    }
}

@Composable
fun PinUnlockScreen(
    onUnlocked: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val pinManager = remember { PinManager(context) }
    val encryptionManager = EncryptionManager.getInstance()
    val scope = rememberCoroutineScope()
    val userProfile = remember { EncryptionManager.getInstance().getUserProfile(edu.aiims.rpcschoolsurvey.data.network.dto.UserData::class.java) }
    var pin by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isVerifying by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Enter PIN to Unlock",
            style = MaterialTheme.typography.headlineSmall
        )

        userProfile?.let { user ->
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = user.email,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            user.partnerName?.let { partner ->
                Text(
                    text = partner,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = pin,
            onValueChange = { if (it.length <= AppDefaults.PIN_LENGTH && it.all { c -> c.isDigit() }) pin = it },
            label = { Text("PIN") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            visualTransformation = PasswordVisualTransformation(PIN_MASK_CHAR)
        )

        errorMessage?.let {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = {
                errorMessage = null
                if (pin.length != AppDefaults.PIN_LENGTH) {
                    errorMessage = "PIN must be ${AppDefaults.PIN_LENGTH} digits"
                    return@Button
                }
                isVerifying = true
                scope.launch {
                    val result = pinManager.verifyPin(pin)
                    isVerifying = false
                    if (result.success) {
                        InactivityTracker.markActive()
                        onUnlocked()
                    } else {
                        errorMessage = result.message ?: "Incorrect PIN"
                    }
                }
            },
            enabled = !isVerifying,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isVerifying) {
                CircularProgressIndicator(modifier = Modifier.size(18.dp))
            } else {
                Text("Unlock")
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        TextButton(onClick = {
            encryptionManager.clearDeviceToken()
            scope.launch { pinManager.clearPin() }
            InactivityTracker.clear()
            onLogout()
        }) {
            Text("Logout")
        }
    }
}

@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val encryptionManager = EncryptionManager.getInstance()
    val scope = rememberCoroutineScope()
    var baseUrl by remember { mutableStateOf(BaseUrlManager.getBaseUrl()) }
    val pinManager = remember { PinManager(context) }

    // For now, let's use a simple instance without Koin injection
    // We'll fix the dependency injection later
    val authRepository = remember(baseUrl) {
        AuthRepository(
            context = context,
            apiService = ApiService.create(baseUrl),
            encryptionManager = encryptionManager,
            pinManager = edu.aiims.rpcschoolsurvey.data.security.PinManager(context)
        )
    }

    // Get device ID
    val deviceId = remember {
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "Unknown"
    }

    // Get device token from encryption manager
    var deviceToken by remember {
        mutableStateOf(encryptionManager.getDeviceToken() ?: "Not Set")
    }

    // Check authentication status
    var isLoggedIn by remember {
        mutableStateOf(authRepository.isLoggedIn())
    }
    var isPinSet by remember { mutableStateOf(pinManager.isPinSet()) }
    var userProfile by remember { mutableStateOf(authRepository.getUserProfile()) }
    var logoutError by remember { mutableStateOf<String?>(null) }
    var isLoggingOut by remember { mutableStateOf(false) }
    var oldPin by remember { mutableStateOf("") }
    var newPin by remember { mutableStateOf("") }
    var confirmNewPin by remember { mutableStateOf("") }
    var changePinMessage by remember { mutableStateOf<String?>(null) }
    var changePinError by remember { mutableStateOf<String?>(null) }
    var isChangingPin by remember { mutableStateOf(false) }
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) InactivityTracker.markActive()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
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

        if (isLoggedIn) {
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

                    userProfile?.let { user ->
                        Spacer(modifier = Modifier.height(12.dp))
                        InfoItem(label = "User Name", value = user.name ?: "N/A")
                        InfoItem(label = "Email", value = user.email)
                        InfoItem(label = "Role", value = user.role)
                        InfoItem(label = "Partner Name", value = user.partnerName ?: "N/A")
                        InfoItem(label = "Partner ID", value = user.partnerId ?: "N/A")
                    }

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
                    Button(
                        onClick = {
                            scope.launch {
                                isLoggingOut = true
                                logoutError = null
                                val result = authRepository.logout()
                                if (result.isSuccess) {
                                    deviceToken = "Not Set"
                                    isLoggedIn = false
                                    isPinSet = pinManager.isPinSet()
                                    userProfile = null
                                    InactivityTracker.clear()
                                    onLogout()
                                } else {
                                    logoutError = result.exceptionOrNull()?.message ?: "Logout failed"
                                }
                                isLoggingOut = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isLoggingOut,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error,
                            contentColor = MaterialTheme.colorScheme.onError
                        )
                    ) {
                        if (isLoggingOut) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp))
                        } else {
                            Text("Logout")
                        }
                    }
                }
            }

            logoutError?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Change PIN Card (only if a PIN exists)
            if (isPinSet) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Change PIN",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = oldPin,
                            onValueChange = { if (it.length <= AppDefaults.PIN_LENGTH && it.all { c -> c.isDigit() }) oldPin = it },
                            label = { Text("Current PIN") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                            visualTransformation = PasswordVisualTransformation(PIN_MASK_CHAR)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = newPin,
                            onValueChange = { if (it.length <= AppDefaults.PIN_LENGTH && it.all { c -> c.isDigit() }) newPin = it },
                            label = { Text("New PIN (${AppDefaults.PIN_LENGTH} digits)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                            visualTransformation = PasswordVisualTransformation(PIN_MASK_CHAR)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = confirmNewPin,
                            onValueChange = { if (it.length <= AppDefaults.PIN_LENGTH && it.all { c -> c.isDigit() }) confirmNewPin = it },
                            label = { Text("Confirm New PIN") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                            visualTransformation = PasswordVisualTransformation(PIN_MASK_CHAR)
                        )

                        changePinError?.let {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = it,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        changePinMessage?.let {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = it,
                                color = MaterialTheme.colorScheme.primary,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = {
                                changePinError = null
                                changePinMessage = null
                                when {
                                    oldPin.length != AppDefaults.PIN_LENGTH -> changePinError = "Current PIN must be ${AppDefaults.PIN_LENGTH} digits"
                                    newPin.length != AppDefaults.PIN_LENGTH -> changePinError = "New PIN must be ${AppDefaults.PIN_LENGTH} digits"
                                    newPin != confirmNewPin -> changePinError = "New PINs do not match"
                                    else -> {
                                        isChangingPin = true
                                        scope.launch {
                                            val result = pinManager.changePin(oldPin, newPin)
                                            isChangingPin = false
                                            if (result.success) {
                                                changePinMessage = "PIN changed successfully"
                                                isPinSet = true
                                                oldPin = ""
                                                newPin = ""
                                                confirmNewPin = ""
                                            } else {
                                                changePinError = result.message ?: "Failed to change PIN"
                                            }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !isChangingPin
                        ) {
                            if (isChangingPin) {
                                CircularProgressIndicator(modifier = Modifier.size(18.dp))
                            } else {
                                Text("Update PIN")
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }

        
        }

        // API Configuration Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            var baseUrlInput by remember { mutableStateOf(baseUrl) }
            var saveMessage by remember { mutableStateOf<String?>(null) }
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "API Configuration",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = baseUrlInput,
                    onValueChange = { baseUrlInput = it },
                    label = { Text("API Base URL") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = {
                        BaseUrlManager.setBaseUrl(baseUrlInput)
                        baseUrl = BaseUrlManager.getBaseUrl()
                        baseUrlInput = baseUrl
                        saveMessage = "API base URL saved"
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Save Base URL")
                }

                saveMessage?.let {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                InfoItem(
                    label = "Network Status",
                    value = "Connected (via ADB reverse proxy)"
                )
            }
        }


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
