import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
// @ts-ignore - TS may not resolve this React Native specific export depending on module resolution, but it works at runtime
import { getAuth, getReactNativePersistence, GoogleAuthProvider, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore, initializeFirestore } from "firebase/firestore";

// AyurNutri Firebase Configuration (reads from .env)
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

import { Platform } from "react-native";

// Initialize Firebase safely (avoiding hot reload duplicate initialization)
let app: any, auth: any;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    // Initialize Auth with AsyncStorage persistence initially (only on Native)
    if (Platform.OS === 'web') {
        auth = getAuth(app);
    } else {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage),
        });
    }
} else {
    app = getApp();
    // On hot reloads, simply retrieve the previously initialized auth instance
    auth = getAuth(app);
}

// Initialize Firestore — wrap in try/catch to safely handle Metro hot reloads
let db: Firestore;
try {
    db = initializeFirestore(app, {});
} catch (error) {
    // Fallback if already initialized during a hot reload
    db = getFirestore(app);
}

export { app, auth, db, GoogleAuthProvider };

