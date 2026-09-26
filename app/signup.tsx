import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

WebBrowser.maybeCompleteAuthSession();

const CREAM = "#FDF8F0";
const GOLD = "#D4A24E";
const GREEN = "#1B4332";
const MUTED = "rgba(253,248,240,0.55)";
const BORDER = "rgba(255,255,255,0.1)";
const INPUT_BG = "rgba(255,255,255,0.06)";

export default function SignupScreen() {
    const router = useRouter();
    const { signUp, signInWithGoogle } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width > 900;

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [nameFocused, setNameFocused] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);
    const [cpwFocused, setCpwFocused] = useState(false);

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        redirectUri: AuthSession.makeRedirectUri(),
        prompt: AuthSession.Prompt.SelectAccount,
    });

    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        if (response?.type === "success") {
            const { id_token } = response.params;
            if (id_token) {
                setLoading(true);
                signInWithGoogle(id_token)
                    .then(() => router.replace("/(tabs)/home"))
                    .catch((e: any) => {
                        setError(e?.message || "Google sign in failed.");
                        setLoading(false);
                    });
            }
        }
    }, [response]);

    const handleSignup = async () => {
        setError("");
        if (!fullName.trim() || !email.trim() || !password || !confirmPw) { setError("Please fill in all fields."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        if (password !== confirmPw) { setError("Passwords do not match."); return; }
        setLoading(true);
        try {
            await signUp(email.trim(), password, fullName.trim());
            router.replace("/onboarding");
        } catch (e: any) {
            const c = e?.code || "";
            if (c.includes("already-in-use")) setError("This email is already registered.");
            else if (c.includes("invalid-email")) setError("Please enter a valid email.");
            else if (c.includes("weak-password")) setError("Password is too weak.");
            else setError(e?.message || "Something went wrong.");
        } finally { setLoading(false); }
    };

    const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
    const pwStrengthColor = ["transparent", "#F87171", "#F59E0B", "#10B981"][pwStrength];
    const pwStrengthLabel = ["", "Weak", "Fair", "Strong"][pwStrength];

    // Form content as a variable (NOT a nested component) to prevent focus/keyboard issues
    const formContent = (
        <Animated.View style={[s.formWrap, { opacity: fade, transform: [{ translateY: slide }] }]}>
            <View style={s.formHeader}>
                {!isDesktop && (
                    <View style={s.mobileBrand}>
                        <Image source={require("../assets/images/logo.png")} style={s.mobileLogo} resizeMode="contain" />
                        <Text style={s.mobileBrandText}>AyurNutri</Text>
                    </View>
                )}
                <Text style={s.formTitle}>Create Account</Text>
                <Text style={s.formSub}>Start your personalized Ayurvedic wellness path</Text>
            </View>

            {error ? (
                <View style={s.errBox}>
                    <Ionicons name="alert-circle" size={16} color="#F87171" style={{ marginRight: 8 }} />
                    <Text style={s.errText}>{error}</Text>
                </View>
            ) : null}

            {/* Google Login */}
            <TouchableOpacity
                style={s.googleBtn}
                activeOpacity={0.85}
                onPress={() => promptAsync()}
                disabled={!request || loading}
            >
                <Image 
                    source={{ uri: "https://img.icons8.com/color/48/000000/google-logo.png" }} 
                    style={{ width: 22, height: 22, marginRight: 12 }} 
                    resizeMode="contain"
                />
                <Text style={s.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24, paddingHorizontal: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
                <Text style={{ marginHorizontal: 12, fontSize: 12, color: MUTED, fontWeight: "600", letterSpacing: 1 }}>OR</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
            </View>

            {/* Full Name */}
            <View style={s.fieldWrap}>
                <Text style={s.label}>FULL NAME</Text>
                <View style={[s.inputRow, nameFocused && s.inputFocused]}>
                    <Ionicons name="person-outline" size={18} color={nameFocused ? GOLD : "rgba(253,248,240,0.3)"} style={{ marginRight: 12 }} />
                    <TextInput
                        style={s.input}
                        placeholder="Your full name"
                        placeholderTextColor="rgba(253,248,240,0.25)"
                        value={fullName}
                        onChangeText={setFullName}
                        onFocus={() => setNameFocused(true)}
                        onBlur={() => setNameFocused(false)}
                    />
                </View>
            </View>

            {/* Email */}
            <View style={s.fieldWrap}>
                <Text style={s.label}>EMAIL ADDRESS</Text>
                <View style={[s.inputRow, emailFocused && s.inputFocused]}>
                    <Ionicons name="mail-outline" size={18} color={emailFocused ? GOLD : "rgba(253,248,240,0.3)"} style={{ marginRight: 12 }} />
                    <TextInput
                        style={s.input}
                        placeholder="you@example.com"
                        placeholderTextColor="rgba(253,248,240,0.25)"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                    />
                </View>
            </View>

            {/* Password */}
            <View style={s.fieldWrap}>
                <Text style={s.label}>PASSWORD</Text>
                <View style={[s.inputRow, pwFocused && s.inputFocused]}>
                    <Ionicons name="lock-closed-outline" size={18} color={pwFocused ? GOLD : "rgba(253,248,240,0.3)"} style={{ marginRight: 12 }} />
                    <TextInput
                        style={[s.input, { flex: 1 }]}
                        placeholder="Min. 6 characters"
                        placeholderTextColor="rgba(253,248,240,0.25)"
                        secureTextEntry={!showPw}
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setPwFocused(true)}
                        onBlur={() => setPwFocused(false)}
                    />
                    <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
                        <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color="rgba(253,248,240,0.4)" />
                    </TouchableOpacity>
                </View>
                {password.length > 0 && (
                    <View style={s.strengthRow}>
                        <View style={s.strengthBars}>
                            {[1, 2, 3].map((l) => (
                                <View key={l} style={[s.strengthBar, { backgroundColor: pwStrength >= l ? pwStrengthColor : "rgba(255,255,255,0.1)" }]} />
                            ))}
                        </View>
                        <Text style={[s.strengthLabel, { color: pwStrengthColor }]}>{pwStrengthLabel}</Text>
                    </View>
                )}
            </View>

            {/* Confirm Password */}
            <View style={s.fieldWrap}>
                <Text style={s.label}>CONFIRM PASSWORD</Text>
                <View style={[s.inputRow, cpwFocused && s.inputFocused, (confirmPw.length > 0 && confirmPw !== password) && { borderColor: "rgba(248,113,113,0.5)" }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={cpwFocused ? GOLD : "rgba(253,248,240,0.3)"} style={{ marginRight: 12 }} />
                    <TextInput
                        style={s.input}
                        placeholder="Re-enter password"
                        placeholderTextColor="rgba(253,248,240,0.25)"
                        secureTextEntry={!showPw}
                        value={confirmPw}
                        onChangeText={setConfirmPw}
                        onFocus={() => setCpwFocused(true)}
                        onBlur={() => setCpwFocused(false)}
                    />
                    {confirmPw.length > 0 && (
                        <Ionicons
                            name={confirmPw === password ? "checkmark-circle" : "close-circle"}
                            size={18}
                            color={confirmPw === password ? "#10B981" : "#F87171"}
                        />
                    )}
                </View>
            </View>

            <TouchableOpacity
                style={[s.primaryBtn, loading && { opacity: 0.6 }]}
                activeOpacity={0.85}
                onPress={handleSignup}
                disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color={GREEN} />
                    : <>
                        <Text style={s.primaryBtnText}>Create Account</Text>
                        <Ionicons name="arrow-forward" size={16} color={GREEN} style={{ marginLeft: 8 }} />
                    </>
                }
            </TouchableOpacity>


            <View style={s.switchRow}>
                <Text style={s.switchText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                    <Text style={s.switchLink}>Sign In</Text>
                </TouchableOpacity>
            </View>

            {!isDesktop && (
                <TouchableOpacity style={s.backWrap} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={14} color="rgba(253,248,240,0.3)" style={{ marginRight: 4 }} />
                    <Text style={s.backText}>Back to home</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );

    if (isDesktop) {
        return (
            <View style={s.root}>
                <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
                <View style={s.desktopLayout}>
                    <LinearGradient colors={["#0A1A10", "#143A24"]} style={s.leftPanel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <View style={[s.glow, { top: -100, left: -100, backgroundColor: GOLD }]} />
                        <View style={[s.glow, { bottom: 0, right: -80, backgroundColor: "#10B981", opacity: 0.1 }]} />

                        {/* Back button pinned at top */}
                        <TouchableOpacity
                            style={s.leftBackBtn}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={16} color="rgba(253,248,240,0.5)" style={{ marginRight: 8 }} />
                            <Text style={s.leftBackText}>Back to home</Text>
                        </TouchableOpacity>

                        {/* Brand + features centered */}
                        <View style={s.leftContent}>
                            <View style={s.brandRow}>
                                <Image source={require("../assets/images/logo.png")} style={s.panelLogo} resizeMode="contain" />
                                <Text style={s.panelBrandText}>AyurNutri</Text>
                            </View>
                            <Text style={s.panelHeadline}>{"Start Your\nWellness Journey\nToday."}</Text>
                            <Text style={s.panelSub}>Your free account unlocks personalized Ayurvedic diet plans, smart food scanning, and AI-powered insights.</Text>
                            <View style={s.featureList}>
                                {["Free forever — no credit card needed", "Dosha analysis in under 5 minutes", "Personalized Ayurvedic recipes"].map((f, i) => (
                                    <View key={i} style={s.featureItem}>
                                        <Ionicons name="checkmark-circle" size={18} color={GOLD} />
                                        <Text style={s.featureText}>{f}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </LinearGradient>
                    <View style={s.rightPanel}>
                        <LinearGradient colors={["#050E07", "#0A1A10"]} style={StyleSheet.absoluteFillObject} />
                        <ScrollView contentContainerStyle={s.rightScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {formContent}
                        </ScrollView>
                    </View>
                </View>
            </View>
        );
    }

    // Mobile layout — on web the browser handles keyboard insets natively
    const mobileInner = (
        <ScrollView
            contentContainerStyle={s.mobileScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {formContent}
        </ScrollView>
    );

    return (
        <View style={s.root}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <LinearGradient colors={["#050E07", "#0A1A10"]} style={StyleSheet.absoluteFillObject} />
            <View style={[s.glow, { top: -120, left: "10%" as any, width: "70%" as any, backgroundColor: GOLD }]} />
            {Platform.OS !== "web" ? (
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    {mobileInner}
                </KeyboardAvoidingView>
            ) : (
                <View style={{ flex: 1 }}>{mobileInner}</View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#050E07", overflow: "hidden" },
    glow: { position: "absolute", width: 320, height: 320, borderRadius: 160, opacity: 0.1, filter: "blur(80px)" as any },

    desktopLayout: { flex: 1, flexDirection: "row" },
    leftPanel: { width: "45%", flexDirection: "column", paddingHorizontal: 64, paddingTop: 40, paddingBottom: 48, overflow: "hidden" },
    leftContent: { zIndex: 1, flex: 1, justifyContent: "center" },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 52 },
    panelLogo: { width: 40, height: 40, borderRadius: 10 },
    panelBrandText: { fontSize: 22, fontWeight: "900", color: CREAM, letterSpacing: 0.3 },
    panelHeadline: { fontSize: 44, fontWeight: "900", color: CREAM, lineHeight: 54, letterSpacing: -1.5, marginBottom: 18 },
    panelSub: { fontSize: 16, color: MUTED, lineHeight: 27, marginBottom: 44 },
    featureList: { gap: 16 },
    featureItem: { flexDirection: "row", alignItems: "center", gap: 14 },
    featureText: { color: "rgba(253,248,240,0.7)", fontSize: 15, fontWeight: "500", lineHeight: 22 },
    rightPanel: { flex: 1, overflow: "hidden" },
    rightScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 48, paddingHorizontal: 20 },

    mobileScroll: { flexGrow: 1, paddingHorizontal: 26, paddingTop: Math.max(80, SAFE_TOP_PADDING + 40), paddingBottom: 200, backgroundColor: "#050E07", alignItems: "center" },

    formWrap: { width: "100%", maxWidth: 420 },
    formHeader: { marginBottom: 36, alignItems: "center" },
    mobileBrand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 36, justifyContent: "center" },
    mobileLogo: { width: 38, height: 38, borderRadius: 10 },
    mobileBrandText: { fontSize: 20, fontWeight: "900", color: CREAM, letterSpacing: 0.2 },
    formTitle: { fontSize: 32, fontWeight: "900", color: CREAM, letterSpacing: -0.8, marginBottom: 10, textAlign: "center" },
    formSub: { fontSize: 15, color: MUTED, textAlign: "center", lineHeight: 22 },

    errBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(248,113,113,0.08)", borderWidth: 1, borderColor: "rgba(248,113,113,0.2)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20, gap: 8 },
    errText: { color: "#F87171", fontSize: 13, fontWeight: "500", flex: 1 },

    fieldWrap: { marginBottom: 18 },
    label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.8, color: "rgba(253,248,240,0.35)", marginBottom: 8, textTransform: "uppercase" },
    inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 16, height: 56 },
    inputFocused: { borderColor: `${GOLD}70`, backgroundColor: `${GOLD}06` },
    input: { flex: 1, fontSize: 15, color: CREAM },

    googleBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: "#111827", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", height: 56, borderRadius: 16, marginBottom: 28 },
    googleBtnText: { color: CREAM, fontSize: 15, fontWeight: "700" },

    strengthRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 },
    strengthBars: { flexDirection: "row", gap: 6, flex: 1 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 11, fontWeight: "700", width: 40, textAlign: "right", letterSpacing: 0.5 },

    primaryBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: GOLD, height: 56, borderRadius: 16, shadowColor: GOLD, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10, marginTop: 12, marginBottom: 28, gap: 8 },
    primaryBtnText: { color: GREEN, fontSize: 16, fontWeight: "900", letterSpacing: 0.3 },

    switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 24 },
    switchText: { fontSize: 14, color: MUTED },
    switchLink: { fontSize: 14, color: GOLD, fontWeight: "800" },

    backWrap: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
    backText: { fontSize: 13, color: "rgba(253,248,240,0.25)", fontWeight: "500" },

    leftBackBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, zIndex: 1 },
    leftBackText: { fontSize: 14, color: "rgba(253,248,240,0.4)", fontWeight: "600" },
});
