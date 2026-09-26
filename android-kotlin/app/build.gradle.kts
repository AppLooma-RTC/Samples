plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.applooma.samples"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.applooma.samples"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        // Your App ID (console → your app) and the token server from ../token-server.
        //   ./gradlew installDebug -PappId=... -PtokenUrl=http://10.0.2.2:3001/token
        buildConfigField("String", "APP_ID", "\"${project.findProperty("appId") ?: "YOUR_APP_ID"}\"")
        buildConfigField("String", "TOKEN_URL", "\"${project.findProperty("tokenUrl") ?: "http://10.0.2.2:3001/token"}\"")
    }
    buildTypes { release { isMinifyEnabled = false } }
    buildFeatures { buildConfig = true; compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

dependencies {
    // The UIKit brings the SDK with it.
    implementation("com.applooma:uikit-android:0.2.3")
    implementation(platform("androidx.compose:compose-bom:2024.09.03"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
}
