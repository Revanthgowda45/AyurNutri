import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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

export default function LoginScreen() {
    const router = useRouter();
    const { signIn } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width > 900;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [emailFocused, setEmailFocused] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);

    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleLogin = async () => {
        setError("");
        if (!email.trim() || !password) { setError("Please fill in all fields."); return; }
        setLoading(true);
        try {
            await signIn(email.trim(), password);
            router.replace("/(tabs)/home");
        } catch (e: any) {
            const c = e?.code || "";
            if (c.includes("not-found") || c.includes("wrong-password") || c.includes("invalid-credential"))
                setError("Invalid email or password.");
            else if (c.includes("invalid-email")) setError("Please enter a valid email.");
            else setError(e?.message || "Something went wrong.");
        } finally { setLoading(false); }
    };

    // The form content (NOT a nested component to avoid focus loss on re-render)
    const formContent = (
        <Animated.View style={[s.formWrap, { opacity: fade, transform: [{ translateY: slide }] }]}>
            <View style={s.formHeader}>
                {!isDesktop && (
                    <View style={s.mobileBrand}>
                        <Image source={require("../assets/images/logo.png")} style={s.mobileLogo} resizeMode="contain" />
                        <Text style={s.mobileBrandText}>AyurNutri</Text>
                    </View>
                )}
                <Text style={s.formTitle}>Welcome Back</Text>
                <Text style={s.formSub}>Sign in to continue your wellness journey</Text>
            </View>

            {error ? (
                <View style={s.errBox}>
                    <Ionicons name="alert-circle" size={16} color="#F87171" style={{ marginRight: 8 }} />
                    <Text style={s.errText}>{error}</Text>
                </View>
            ) : null}

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
                        placeholder="••••••••"
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
            </View>

            <TouchableOpacity onPress={() => router.push("/forgot-password")} style={s.forgotWrap}>
                <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[s.primaryBtn, loading && { opacity: 0.6 }]}
                activeOpacity={0.85}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color={GREEN} />
                    : <>
                        <Text style={s.primaryBtnText}>Sign In</Text>
                        <Ionicons name="arrow-forward" size={16} color={GREEN} style={{ marginLeft: 8 }} />
                    </>
                }
            </TouchableOpacity>

            <View style={s.switchRow}>
                <Text style={s.switchText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/signup")}>
                    <Text style={s.switchLink}>Create one</Text>
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
                    {/* Left branding panel */}
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
                            <Text style={s.panelHeadline}>{"Ancient Wisdom,\nModern AI."}</Text>
                            <Text style={s.panelSub}>Your personal Ayurvedic dietitian, powered by a private on-device Neural Engine.</Text>
                            <View style={s.featureList}>
                                {["Hyper-personalized Dosha diet plans", "Private — AI runs fully on-device", "Smart food scanner with Dosha scoring"].map((f, i) => (
                                    <View key={i} style={s.featureItem}>
                                        <Ionicons name="checkmark-circle" size={18} color={GOLD} />
                                        <Text style={s.featureText}>{f}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Right form panel */}
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

    // Mobile layout — on web the browser handles keyboard insets natively so skip KeyboardAvoidingView
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
    root: { flex: 1, backgroundColor: "#050E07" },
    glow: { position: "absolute", width: 300, height: 300, borderRadius: 150, opacity: 0.12, filter: "blur(80px)" as any },

    /* Desktop */
    desktopLayout: { flex: 1, flexDirection: "row" },
    leftPanel: { width: "42%", flexDirection: "column", paddingHorizontal: 60, paddingTop: 40, paddingBottom: 48, overflow: "hidden" },
    leftContent: { zIndex: 1, flex: 1, justifyContent: "center" },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 48 },
    panelLogo: { width: 44, height: 44 },
    panelBrandText: { fontSize: 24, fontWeight: "900", color: CREAM, letterSpacing: 0.5 },
    panelHeadline: { fontSize: 42, fontWeight: "900", color: CREAM, lineHeight: 52, letterSpacing: -1, marginBottom: 20 },
    panelSub: { fontSize: 16, color: MUTED, lineHeight: 26, marginBottom: 40 },
    featureList: { gap: 14 },
    featureItem: { flexDirection: "row", alignItems: "center", gap: 12 },
    featureText: { color: "rgba(253,248,240,0.75)", fontSize: 15, fontWeight: "500" },
    rightPanel: { flex: 1, overflow: "hidden" },
    rightScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60, paddingHorizontal: 20 },

    /* Mobile */
    mobileScroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 200 },

    /* Form */
    formWrap: { width: "100%", maxWidth: 420 },
    formHeader: { marginBottom: 36 },
    mobileBrand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32, justifyContent: "center" },
    mobileLogo: { width: 40, height: 40 },
    mobileBrandText: { fontSize: 22, fontWeight: "900", color: CREAM },
    formTitle: { fontSize: 30, fontWeight: "900", color: CREAM, letterSpacing: -0.5, marginBottom: 8 },
    formSub: { fontSize: 15, color: MUTED },

    errBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(248,113,113,0.1)", borderWidth: 1, borderColor: "rgba(248,113,113,0.25)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
    errText: { color: "#F87171", fontSize: 13, fontWeight: "500", flex: 1 },

    fieldWrap: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: "rgba(253,248,240,0.4)", marginBottom: 8 },
    inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 54 },
    inputFocused: { borderColor: "rgba(212,162,78,0.6)", backgroundColor: "rgba(212,162,78,0.05)" },
    input: { flex: 1, fontSize: 15, color: CREAM },

    forgotWrap: { alignItems: "flex-end", marginBottom: 28, marginTop: -8 },
    forgotText: { fontSize: 13, color: GOLD, fontWeight: "600" },

    primaryBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: GOLD, height: 54, borderRadius: 14, shadowColor: GOLD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8, marginBottom: 24 },
    primaryBtnText: { color: GREEN, fontSize: 16, fontWeight: "800" },

    switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 24 },
    switchText: { fontSize: 14, color: MUTED },
    switchLink: { fontSize: 14, color: GOLD, fontWeight: "700" },

    backWrap: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
    backText: { fontSize: 13, color: "rgba(253,248,240,0.3)" },

    leftBackBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, zIndex: 1 },
    leftBackText: { fontSize: 14, color: "rgba(253,248,240,0.5)", fontWeight: "600" },
});
