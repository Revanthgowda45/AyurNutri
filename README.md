# 🌿 AyurNutri

AyurNutri is a comprehensive, AI-powered React Native application designed to merge the ancient wisdom of Ayurveda with modern nutritional science. The app helps users discover their unique Dosha (body type) in minutes and provides personalized diet plans, smart food scanning, and AI-powered wellness insights.

## ✨ Features

- **Google Authentication:** Seamless and secure login using Firebase Auth and Google Identity Services.
- **Dosha Analysis:** Discover your Ayurvedic body type in under 5 minutes.
- **Personalized Diet Plans:** Receive customized, healthy recipes tailored to your specific Dosha and nutritional goals.
- **Smart Food Scanning:** Utilize your device's camera to scan food and receive instant Ayurvedic insights.
- **Beautiful UI:** A modern, cross-platform interface built with `expo-router`, featuring smooth animations, haptics, and custom styling.

## 🛠️ Tech Stack

- **Framework:** [Expo](https://expo.dev/) (React Native) SDK 57
- **Routing:** Expo Router (File-based routing)
- **Backend & Auth:** Firebase (Authentication, Storage, Firestore)
- **UI Components:** React Native Reanimated, Expo Linear Gradient, Expo Vector Icons
- **Language:** TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS recommended)
- `npm` or `yarn`
- Expo CLI
- EAS CLI (for building the app)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Revanthgowda45/AyurNutri.git
   cd AyurNutri
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root of the project with your Firebase and Google Client ID credentials:
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

4. **Start the development server:**
   ```bash
   npx expo start
   ```

## 📱 Building the App

This project uses Expo Application Services (EAS) for compiling standalone builds.

To build an Android APK locally (requires Android Studio & JDK):
```bash
eas build --profile preview --platform android --local
```

To build on Expo's cloud servers:
```bash
eas build --profile preview --platform android
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Revanthgowda45/AyurNutri/issues) if you want to contribute.

## 📜 License

This project is licensed under the MIT License.
