plugins {
    id("com.android.application")
}

android {
    namespace = "com.pixelforge.studio"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.pixelforge.studio"
        minSdk = 28
        targetSdk = 37
        versionCode = 10
        versionName = "0.9.1-recovery"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
