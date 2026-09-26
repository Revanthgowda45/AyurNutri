import { GoogleAuthProvider, auth } from "@/configs/firebaseConfig";
import {
    User,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithCredential,
    signInWithEmailAndPassword,
    updateProfile,
} from "firebase/auth";
import React, {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { Platform } from "react-native";

/* ───────── Types ───────── */
interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (
        email: string,
        password: string,
        displayName: string
    ) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: (idToken: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ───────── Provider ───────── */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Sign up with email + password, then set display name
    const signUp = async (
        email: string,
        password: string,
        displayName: string
    ) => {
        const credential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        await updateProfile(credential.user, { displayName });
        setUser({ ...credential.user, displayName } as User);
    };

    // Sign in with email + password
    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    // Sign in with Google ID token
    const signInWithGoogle = async (idToken: string) => {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
    };

    // Reset Password
    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    // Sign out
    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);

        // Completely clear session data on web
        if (Platform.OS === "web") {
            try {
                // Clear all cookies
                document.cookie.split(";").forEach((c) => {
                    document.cookie = c
                        .replace(/^ +/, "")
                        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                // Clear local storage and session storage
                window.localStorage.clear();
                window.sessionStorage.clear();
            } catch (e) {
                console.warn("Could not clear web storage:", e);
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword }}
        >
            {children}
        </AuthContext.Provider>
    );
}

/* ───────── Hook ───────── */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
