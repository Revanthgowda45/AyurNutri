import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
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
    View,
} from "react-native";

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { resetPassword } = useAuth();
    const { colors } = useTheme();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(30)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true }),
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

    return (
        <View style={[s.screen, { backgroundColor: colors.headerBg }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <View style={[s.headerBg, { backgroundColor: colors.headerBg }]} />
            <View style={[s.bodyBg, { backgroundColor: colors.background }]} />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={s.header}>
                        <Image source={require("../assets/images/logo.png")} style={s.logo} resizeMode="contain" />
                        <Text style={[s.brand, { color: colors.cream }]}>AyurNutri</Text>
                        <Text style={[s.tagline, { color: colors.textOnHeaderSub }]}>Reset Password</Text>
                    </View>

                    <Animated.View style={[s.card, { backgroundColor: colors.card, shadowColor: colors.shadow, opacity: fade, transform: [{ translateY: slide }] }]}>
                        <Text style={[s.cardTitle, { color: colors.text }]}>Forgot Password?</Text>
                        <Text style={[s.cardSub, { color: colors.textMuted }]}>Enter your email to receive a password reset link.</Text>

                        {error ? (
                            <View style={[s.errBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
                                <Text style={[s.errText, { color: colors.errorText }]}>{error}</Text>
                            </View>
                        ) : null}

                        {success ? (
                            <View style={[s.successBox, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
                                <Text style={[s.successText, { color: colors.successText }]}>Reset link sent! Please check your email inbox to reset your password and then sign in.</Text>
                            </View>
                        ) : null}

                        <Text style={[s.label, { color: colors.text }]}>EMAIL ADDRESS</Text>
                        <View style={[s.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                            <Text style={s.inputIcon}>✉️</Text>
                            <TextInput style={[s.input, { color: colors.inputText }]} placeholder="you@example.com" placeholderTextColor={colors.inputPlaceholder} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                        </View>

                        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primaryBtn, shadowColor: colors.primaryBtn }, loading && s.disabled]} activeOpacity={0.8} onPress={handleReset} disabled={loading}>
                            {loading ? <ActivityIndicator color={colors.gold} /> : (
                                <Text style={[s.primaryBtnText, { color: colors.primaryBtnText }]}>Send Reset Link</Text>
                            )}
                        </TouchableOpacity>

                        <View style={s.divider}>
                            <View style={[s.dividerLine, { backgroundColor: colors.divider }]} />
                            <Text style={[s.dividerText, { color: colors.dividerText }]}>OR</Text>
                            <View style={[s.dividerLine, { backgroundColor: colors.divider }]} />
                        </View>

                        <TouchableOpacity onPress={() => router.push("/login")} style={s.switchWrap}>
                            <Text style={[s.switchText, { color: colors.textMuted }]}>
                                Remember your password?{" "}
                                <Text style={[s.switchLink, { color: colors.green }]}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1 },
    headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: "48%" },
    bodyBg: { position: "absolute", bottom: 0, left: 0, right: 0, height: "58%", borderTopLeftRadius: 40, borderTopRightRadius: 40 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 80 },
    header: { alignItems: "center", marginBottom: 28 },
    logoRing: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 14 },
    logo: { width: 60, height: 60 },
    brand: { fontSize: 28, fontWeight: "900", letterSpacing: 3 },
    tagline: { fontSize: 12, marginTop: 4, letterSpacing: 2, textTransform: "uppercase" },
    card: { borderRadius: 24, paddingHorizontal: 28, paddingVertical: 32, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 8 },
    cardTitle: { fontSize: 24, fontWeight: "800", textAlign: "center" },
    cardSub: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 24, lineHeight: 20 },
    errBox: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
    errText: { fontSize: 13, textAlign: "center", fontWeight: "500" },
    successBox: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
    successText: { fontSize: 13, textAlign: "center", fontWeight: "500", lineHeight: 20 },
    label: { fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
    inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 16, height: 56, marginBottom: 24, borderWidth: 1 },
    inputIcon: { fontSize: 16, marginRight: 12, opacity: 0.45 },
    input: { flex: 1, fontSize: 15 },
    primaryBtn: { borderRadius: 16, height: 58, justifyContent: "center", alignItems: "center", marginTop: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
    primaryBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: 1.5 },
    disabled: { opacity: 0.55 },
    divider: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { fontSize: 11, fontWeight: "700", letterSpacing: 2, marginHorizontal: 16 },
    switchWrap: { marginTop: 4 },
    switchText: { textAlign: "center", fontSize: 13 },
    switchLink: { fontWeight: "700" },
});
