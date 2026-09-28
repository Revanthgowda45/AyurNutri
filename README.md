# 🌿 AyurNutri: Hybrid AI Ayurvedic Wellness Platform

[![Expo](https://img.shields.io/badge/Expo-1C2024?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com/)

**AyurNutri** is an advanced, academic-grade Hybrid AI application designed to guide users on a personalized Ayurvedic wellness journey. 

Unlike standard wrappers around Generative AI, AyurNutri implements a robust **Hybrid AI Architecture** featuring custom Machine Learning models, mathematical constraint satisfaction algorithms, and Retrieval-Augmented Generation (RAG). This ensures deterministic accuracy and eliminates the risk of medical hallucinations, establishing a clear computer science contribution.

---

## ✨ Core Innovations & Architecture

AyurNutri is divided into three primary algorithmic pipelines:

### 1. Machine Learning Dosha Classifier
Instead of relying on LLMs to guess a user's Dosha (Vata, Pitta, Kapha), the backend utilizes a trained Machine Learning classification model (e.g., Random Forest/SVM). This provides a deterministic probability array based on physiological and psychological traits.

### 2. Constraint Optimization Engine (Meal Generation)
This is the central algorithmic innovation of the platform. It replaces LLM "guessing" with strict mathematical optimization:
* **Ayurvedic Constraint:** Strictly filters out foods that aggravate the user's predicted Dosha based on Rasa (taste) and Virya (potency).
* **Nutritional Constraint:** Solves a combinatorial optimization problem to select a mix of approved foods that perfectly hit modern macronutrient targets (Calories, Protein, etc.).

### 3. Retrieval-Augmented Generation (RAG) Chatbot
A conversational interface powered by a Vector Database containing embeddings of verified Ayurvedic texts (e.g., Charaka Samhita). The LLM is strictly bounded to answer questions using *only* retrieved context, guaranteeing safe and verified advice.

---

## 🛠 Tech Stack

### Frontend (Mobile App)
* **Framework:** React Native & Expo (SDK 57)
* **Routing:** Expo Router
* **Styling:** NativeWind (Tailwind CSS), React Native Reanimated
* **Auth:** Firebase Auth & Expo Auth Session (Google OAuth)

### Backend (Under Construction)
* **Framework:** Python / FastAPI
* **AI/ML:** scikit-learn, Vector DB (ChromaDB/Pinecone), Gemini API
* **Databases:** User DB, Nutritional DB, Vector DB

---

## 🎨 Branding & Logo Configuration

The AyurNutri logo (`logo.png`) has been professionally integrated into the app across multiple platforms natively using Expo's configuration system.

Here is how the branding is configured in `app.json`:
* **App Icon:** Set via `"icon": "./assets/images/logo.png"`. This automatically generates all required icon sizes for Android (Google Play) and iOS (App Store).
* **Splash Screen:** Implemented using the `expo-splash-screen` plugin. The logo is displayed at 180px width, centered on a dark theme background (`#050E07`) to match the app's aesthetic.
* **Web Favicon:** Set via `"favicon": "./assets/images/logo.png"` for web deployments.
* **In-App Branding:** The logo is dynamically required in UI components (like `login.tsx` and `signup.tsx`) using `<Image source={require("../assets/images/logo.png")} />`.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) & Git
* Expo CLI (`npm install -g eas-cli`)
* Android Studio (for local testing) or the Expo Go app.

### Installation

1. **Clone & Install**
   ```bash
   git clone https://github.com/Revanthgowda45/AyurNutri.git
   cd AyurNutri
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory for Firebase & Google Auth:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
   ```

3. **Run the App**
   ```bash
   npx expo start
   ```

### Building the APK
To generate a production-ready Android binary using Expo Application Services (EAS):
```bash
eas build --profile preview --platform android
```
*(Append `--local` to build on your own machine instead of the cloud).*

---
*Designed for academic rigor and modern wellness.*
