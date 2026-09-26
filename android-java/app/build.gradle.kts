plugins {
    id("com.android.application")
}

android {
    namespace = "com.applooma.samples.java"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.applooma.samples.java"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        // Your App ID (console → your app) and a token endpoint on YOUR server.
        //   ./gradlew installDebug -PappId=... -PtokenUrl=http://10.0.2.2:3001/token
        buildConfigField("String", "APP_ID", "\"${project.findProperty("appId") ?: "YOUR_APP_ID"}\"")
        buildConfigField("String", "TOKEN_URL", "\"${project.findProperty("tokenUrl") ?: "http://10.0.2.2:3001/token"}\"")
        // Optional shared key the sample token server may require (sent as x-sample-key).
        buildConfigField("String", "TOKEN_KEY", "\"${project.findProperty("tokenKey") ?: ""}\"")
    }
    buildTypes { release { isMinifyEnabled = false } }
    buildFeatures { buildConfig = true; viewBinding = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

dependencies {
    // The UIKit brings the SDK and the Compose screens with it; this app stays pure Java + XML.
    implementation("com.applooma:uikit-android:0.2.2")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
