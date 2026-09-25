import { useAuth } from "@/context/AuthContext";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/services/firestoreService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const PRESET_GOALS = [
    { id: "weight", icon: "⚖️", title: "Weight Management" },
    { id: "energy", icon: "⚡", title: "Boost Energy Levels" },
    { id: "dosha", icon: "🧘", title: "Balance Doshas" },
    { id: "sleep", icon: "😴", title: "Improve Sleep Quality" },
    { id: "immunity", icon: "🛡️", title: "Strengthen Immunity" },
    { id: "digestion", icon: "🥑", title: "Better Digestion (Agni)" },
];

export default function HealthGoalsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const uid = user?.uid || "";

    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!uid) return;
        const unsub = firestore.subscribeToGoals(uid, (d) => {
            if (d?.selectedGoals) { setSelectedGoals(d.selectedGoals); }
            else { setSelectedGoals([]); }
        });
        return () => unsub();
    }, [uid]);

    const toggleGoal = (id: string) => {
        if (selectedGoals.includes(id)) {
            setSelectedGoals(selectedGoals.filter((g) => g !== id));
        } else {
            if (selectedGoals.length < 3) { setSelectedGoals([...selectedGoals, id]); }
        }
    };

    const handleSave = async () => {
        if (!uid) return;
        setLoading(true);
        try {
            await firestore.saveGoals(uid, selectedGoals);
            setSuccess(true);
            setTimeout(() => router.back(), 1500);
        } catch (e) { console.error("Failed to save goals:", e); }
        finally { setLoading(false); }
    };

    return (
        <View style={[s.screen, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            <View style={[s.header, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.card, shadowColor: colors.shadow, borderWidth: isDark ? 1 : 0, borderColor: colors.cardBorder }]}>
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: colors.text }]}>Health Goals</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
                <Text style={[s.subtitle, { color: colors.textSecondary }]}>
                    Select up to 3 primary health goals. AyurNutri will tailor your diet plans to help you achieve them.
                </Text>

                {success && (
                    <View style={[s.successBox, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
                        <Text style={[s.successText, { color: colors.successText }]}>Goals saved successfully!</Text>
                    </View>
                )}

                <View style={s.grid}>
                    {PRESET_GOALS.map((g) => {
                        const isSelected = selectedGoals.includes(g.id);
                        return (
                            <TouchableOpacity
                                key={g.id}
                                style={[s.goalCard, { backgroundColor: colors.card, shadowColor: colors.shadow }, isSelected && { borderColor: colors.goalSelectedBorder, backgroundColor: colors.goalSelectedBg }]}
                                activeOpacity={0.7}
                                onPress={() => toggleGoal(g.id)}
                            >
                                <View style={[s.iconBox, { backgroundColor: colors.iconBoxBg }, isSelected && { backgroundColor: colors.card }]}>
                                    <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                                </View>
                                <Text style={[s.goalTitle, { color: colors.textSecondary }, isSelected && { color: colors.text }]}>
                                    {g.title}
                                </Text>
                                {isSelected && (
                                    <View style={[s.checkBadge, { backgroundColor: colors.green }]}>
                                        <Text style={{ color: colors.textOnHeader, fontSize: 12, fontWeight: "900" }}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={[s.primaryBtn, { backgroundColor: colors.primaryBtn, shadowColor: colors.primaryBtn }, (loading || selectedGoals.length === 0) && s.disabled]}
                    activeOpacity={0.8}
                    onPress={handleSave}
                    disabled={loading || selectedGoals.length === 0}
                >
                    {loading ? <ActivityIndicator color={colors.gold} /> : <Text style={[s.primaryBtnText, { color: colors.primaryBtnText }]}>Save Goals</Text>}
                </TouchableOpacity>

                <Text style={[s.counter, { color: colors.textMuted }]}>{selectedGoals.length} / 3 Selected</Text>
            </ScrollView>
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
    subtitle: { fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 24, paddingHorizontal: 10 },
    successBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20 },
    successText: { fontSize: 13, textAlign: "center", fontWeight: "600" },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginBottom: 32 },
    goalCard: { width: "48%", borderRadius: 20, padding: 20, alignItems: "center", borderWidth: 2, borderColor: "transparent", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    iconBox: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    goalTitle: { fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },
    checkBadge: { position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    primaryBtn: { borderRadius: 16, height: 56, justifyContent: "center", alignItems: "center", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    primaryBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: 1 },
    disabled: { opacity: 0.5 },
    counter: { textAlign: "center", marginTop: 16, fontSize: 13, fontWeight: "700" },
});
