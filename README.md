<p align="center">
  <img src="./assets/images/logo.png" width="120" alt="AyurNutri Logo" />
</p>

# 🌿 AyurNutri

[![Expo](https://img.shields.io/badge/Expo-1C2024?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)

**AyurNutri** is a modern React Native cross-platform application designed to guide users on a personalized Ayurvedic wellness journey. It offers personalized Ayurvedic diet plans, AI-powered food scanning, and dosha analysis.

## ✨ Features

- **Personalized Ayurvedic Profiles:** Quick dosha analysis (Vata, Pitta, Kapha).
- **Smart Scanning:** Scan food and get nutritional insights tailored to your body type.
- **Tailored Diet Plans:** Discover personalized Ayurvedic recipes and wellness paths.
- **Secure Authentication:** Seamless Email/Password and Google OAuth login via Firebase.
- **Modern UI/UX:** Built with Reanimated, Linear Gradients, and Expo Router for a smooth, native-feeling experience across Android and iOS.

## 🛠 Tech Stack

- **Framework:** React Native / Expo (SDK 57)
- **Routing:** Expo Router
- **Styling:** NativeWind (Tailwind CSS)
- **Backend/Database:** Firebase
- **Authentication:** Firebase Auth & Expo Auth Session (Google Sign-In)

## 🎨 Logo & Branding Setup

The AyurNutri logo (`logo.png`) has been professionally integrated into the app natively using Expo:

* **App Icon:** Set via `"icon": "./assets/images/logo.png"` in `app.json`. This generates all required icon sizes for Android and iOS.
* **Splash Screen:** Displayed centered on a dark theme background (`#050E07`) using the `expo-splash-screen` plugin.
* **In-App:** Dynamically loaded in UI components (like `login.tsx` and `signup.tsx`) using `<Image source={require("../assets/images/logo.png")} />`.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (LTS recommended)
- [Git](https://git-scm.com/)
- [Expo CLI](https://docs.expo.dev/workflow/expo-cli/) (`npm install -g eas-cli`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Revanthgowda45/AyurNutri.git
   cd AyurNutri
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your Firebase and Google Client IDs:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

## 📦 Building the App

This project uses EAS (Expo Application Services) for building standalone binaries.

**To build an Android APK for preview/testing:**
```bash
eas build --profile preview --platform android
```
*(To build locally on your own machine instead of the cloud, append `--local` to the command above).*
