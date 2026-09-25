import { auth } from "@/configs/firebaseConfig";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { updateProfile } from "firebase/auth";
import React, { useState } from "react";
import {
    ActivityIndicator,
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

export default function EditProfileScreen() {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const [fullName, setFullName] = useState(user?.displayName || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        setError("");
        setSuccess(false);
        if (!fullName.trim()) { setError("Full Name cannot be empty."); return; }
        if (auth.currentUser) {
            setLoading(true);
            try {
                await updateProfile(auth.currentUser, { displayName: fullName.trim() });
                setSuccess(true);
                setTimeout(() => router.back(), 1500);
            } catch (e: any) {
                setError("Failed to update profile. Please try again.");
            } finally { setLoading(false); }
        }
    };

    return (
        <View style={[s.screen, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            <View style={[s.header, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.card, shadowColor: colors.shadow, borderWidth: isDark ? 1 : 0, borderColor: colors.cardBorder }]}>
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: colors.text }]}>Edit Profile</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
                    {error ? (
                        <View style={[s.errBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
                            <Text style={[s.errText, { color: colors.errorText }]}>{error}</Text>
                        </View>
                    ) : null}

                    {success ? (
                        <View style={[s.successBox, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
                            <Text style={[s.successText, { color: colors.successText }]}>Profile updated successfully!</Text>
                        </View>
                    ) : null}

                    <View style={[s.card, { backgroundColor: colors.card, shadowColor: colors.shadow, borderWidth: isDark ? 1 : 0, borderColor: colors.cardBorder }]}>
                        <Text style={[s.label, { color: colors.text }]}>FULL NAME</Text>
                        <View style={[s.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                            <Text style={s.inputIcon}>👤</Text>
                            <TextInput style={[s.input, { color: colors.inputText }]} placeholder="Your full name" placeholderTextColor={colors.inputPlaceholder} value={fullName} onChangeText={setFullName} />
                        </View>

                        <Text style={[s.label, { color: colors.text }]}>EMAIL ADDRESS</Text>
                        <View style={[s.inputRow, s.inputDisabled, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                            <Text style={s.inputIcon}>✉️</Text>
                            <TextInput style={[s.input, { color: colors.textMuted }]} value={user?.email || ""} editable={false} />
                        </View>
                        <Text style={[s.helperText, { color: colors.textMuted }]}>Email cannot be changed right now.</Text>
                    </View>

                    <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primaryBtn, shadowColor: colors.primaryBtn }, loading && s.disabled]} activeOpacity={0.8} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color={colors.gold} /> : <Text style={[s.primaryBtnText, { color: colors.primaryBtnText }]}>Save Changes</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: SAFE_TOP_PADDING, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
    backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    backIcon: { fontSize: 20, fontWeight: "600" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },
    errBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
    errText: { fontSize: 13, textAlign: "center", fontWeight: "600" },
    successBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
    successText: { fontSize: 13, textAlign: "center", fontWeight: "600" },
    card: { borderRadius: 20, padding: 24, marginBottom: 24, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    label: { fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
    inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 16, height: 54, marginBottom: 16, borderWidth: 1 },
    inputDisabled: {},
    inputIcon: { fontSize: 16, marginRight: 12, opacity: 0.45 },
    input: { flex: 1, fontSize: 15, fontWeight: "500" },
    helperText: { fontSize: 11, marginTop: -8, marginBottom: 16, marginLeft: 4 },
    primaryBtn: { borderRadius: 16, height: 56, justifyContent: "center", alignItems: "center", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    primaryBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: 1 },
    disabled: { opacity: 0.6 },
});
