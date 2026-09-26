import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

const CREAM = "#FDF8F0";
const GOLD = "#D4A24E";
const GREEN = "#1B4332";
const MUTED = "rgba(253,248,240,0.55)";
const BORDER = "rgba(255,255,255,0.1)";
const INPUT_BG = "rgba(255,255,255,0.06)";

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { resetPassword } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width > 900;

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);

    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleReset = async () => {
        setError("");
        setSuccess(false);
        if (!email.trim()) { setError("Please enter your registered email address."); return; }
        setLoading(true);
        try {
            await resetPassword(email.trim());
            setSuccess(true);
        } catch (e: any) {
            const c = e?.code || "";
            if (c.includes("user-not-found")) setError("No account found with this email.");
            else if (c.includes("invalid-email")) setError("Please enter a valid email address.");
            else setError(e?.message || "Failed to send reset email. Please try again.");
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
                <Text style={s.formTitle}>Reset Password</Text>
                <Text style={s.formSub}>Enter your email to receive a password reset link.</Text>
            </View>

            {error ? (
                <View style={s.errBox}>
                    <Ionicons name="alert-circle" size={16} color="#F87171" style={{ marginRight: 8 }} />
                    <Text style={s.errText}>{error}</Text>
                </View>
            ) : null}

            {success ? (
                <View style={s.successBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 8 }} />
                    <Text style={s.successText}>Reset link sent! Please check your email inbox to reset your password and then sign in.</Text>
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

            <TouchableOpacity
                style={[s.primaryBtn, loading && { opacity: 0.6 }]}
                activeOpacity={0.85}
                onPress={handleReset}
                disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color={GREEN} />
                    : <>
                        <Text style={s.primaryBtnText}>Send Reset Link</Text>
                        <Ionicons name="arrow-forward" size={16} color={GREEN} style={{ marginLeft: 8 }} />
                    </>
                }
            </TouchableOpacity>

            <View style={s.switchRow}>
                <Text style={s.switchText}>Remember your password? </Text>
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
                            <Text style={s.panelSub}>Your personal Ayurvedic wellness companion, powered by modern AI.</Text>
                            <View style={s.featureList}>
                                {["Hyper-personalized Dosha diet plans", "Connect with verified BAMS experts", "Smart food scanner for Dosha scoring"].map((f, i) => (
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
    root: { flex: 1, backgroundColor: "#050E07", overflow: "hidden" },
    glow: { position: "absolute", width: 320, height: 320, borderRadius: 160, opacity: 0.1, filter: "blur(80px)" as any },

    /* Desktop */
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
    rightScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60, paddingHorizontal: 20 },

    /* Mobile */
    mobileScroll: { flexGrow: 1, paddingHorizontal: 26, paddingTop: Math.max(80, SAFE_TOP_PADDING + 40), paddingBottom: 200, backgroundColor: "#050E07", alignItems: "center" },

    /* Form */
    formWrap: { width: "100%", maxWidth: 420 },
    formHeader: { marginBottom: 40, alignItems: "center" },
    mobileBrand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 36, justifyContent: "center" },
    mobileLogo: { width: 38, height: 38, borderRadius: 10 },
    mobileBrandText: { fontSize: 20, fontWeight: "900", color: CREAM, letterSpacing: 0.2 },
    formTitle: { fontSize: 32, fontWeight: "900", color: CREAM, letterSpacing: -0.8, marginBottom: 10, textAlign: "center" },
    formSub: { fontSize: 15, color: MUTED, textAlign: "center", lineHeight: 22 },

    errBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(248,113,113,0.08)", borderWidth: 1, borderColor: "rgba(248,113,113,0.2)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20, gap: 8 },
    errText: { color: "#F87171", fontSize: 13, fontWeight: "500", flex: 1 },

    successBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(16,185,129,0.08)", borderWidth: 1, borderColor: "rgba(16,185,129,0.2)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20, gap: 8 },
    successText: { color: "#10B981", fontSize: 13, fontWeight: "500", flex: 1 },

    fieldWrap: { marginBottom: 18 },
    label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.8, color: "rgba(253,248,240,0.35)", marginBottom: 8, textTransform: "uppercase" },
    inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 16, height: 56 },
    inputFocused: { borderColor: `${GOLD}70`, backgroundColor: `${GOLD}06` },
    input: { flex: 1, fontSize: 15, color: CREAM },

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
