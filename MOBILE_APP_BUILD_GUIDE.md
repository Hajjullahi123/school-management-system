# 📱 Mobile App Build & Publishing Guide

This guide explains how to build and package the **EduTechAI School Manager** as a native mobile app for Android and iOS using the Capacitor integration I've implemented.

---

## 1. 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your development machine:

### For Android:
*   **Android Studio**: [Download here](https://developer.android.com/studio)
*   **Java SDK (JDK 17+)**: Required for Gradle builds.
*   **Android SDK & Emulator**: Installed via Android Studio SDK Manager.

### For iOS (Mac Required):
*   **Xcode**: Installed via the Mac App Store.
*   **CocoaPods**: Install via terminal: `sudo gem install cocoapods`

---

## 2. 🚀 The Build Workflow

The mobile app is a "shell" that runs your high-performance web app. Every time you change your code, follow these steps:

### Step 1: Build the Web Project
This generates the optimized `dist` folder that the mobile app uses.
```bash
cd client
npm run build
```

### Step 2: Sync with Mobile Platforms
This copies your `dist` folder into the native Android and iOS projects.
```bash
npx cap sync
```

*Note: You can also run the combined command I added to your `package.json`:*
```bash
npm run mobile:build
```

---

## 3. 🤖 Running on Android

1.  **Open Android Studio**:
    ```bash
    npx cap open android
    ```
2.  **Wait for Gradle Sync**: Android Studio will automatically download dependencies. Wait for the green checkmark.
3.  **Run on Device/Emulator**:
    *   Connect your Android phone via USB (with Developer Options & USB Debugging enabled).
    *   Select your device in the top toolbar.
    *   Click the **Play (Run)** icon.

---

## 4. 🍎 Running on iOS (Mac Only)

1.  **Add the iOS Platform** (if not already added):
    ```bash
    npx cap add ios
    ```
2.  **Open Xcode**:
    ```bash
    npx cap open ios
    ```
3.  **Configure Signing**:
    *   In Xcode, select the project in the left sidebar.
    *   Go to **Signing & Capabilities**.
    *   Select your Developer Team.
4.  **Run**: Click the **Play** button in Xcode.

---

## 5. 🎨 Customizing App Identity

To change the app name, icon, or splash screen:

*   **App Name/ID**: Edit `client/capacitor.config.json`.
*   **App Icons**: Replace the icons in `client/android/app/src/main/res/mipmap-...`.
    *   *Tip: Use the [Capacitor Assets Tool](https://github.com/ionic-team/capacitor-assets) to generate all sizes automatically from a single 1024x1024 image.*
*   **Launch Animation**: The app uses your web splash screen by default, but you can add native splash screens in Android Studio.

---

## 6. 🌐 Connecting to the Server

In a mobile app, "localhost" refers to the phone itself, not your server.
1.  Open `client/src/api.js` (or your base URL config).
2.  Ensure `API_BASE_URL` points to your **Live Production URL** (e.g., `https://your-api.onrender.com`).
3.  If testing locally, use your computer's **Internal IP Address** (e.g., `http://192.168.1.5:5000`).

---

## 7. 📦 Publishing to Play Store

1.  In Android Studio, go to **Build > Generate Signed Bundle / APK**.
2.  Follow the wizard to create a Keystore file.
3.  This generates an `.aab` file in `android/app/release`.
4.  Upload this `.aab` file to the [Google Play Console](https://play.google.com/console).

---

**Happy App Building! 🚀**
