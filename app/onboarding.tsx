import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/services/firestoreService";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const GENDERS = [
    { id: "male", icon: "♂️", label: "Male", color: "#3B82F6" },
    { id: "female", icon: "♀️", label: "Female", color: "#EC4899" },
    { id: "other", icon: "⚧️", label: "Other", color: "#8B5CF6" },
];

const INDIAN_STATES = [
    "All India / General",
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman & Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli", "Daman & Diu", "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const GOALS = [
    { id: "lose", icon: "🔥", title: "Lose Weight", desc: "Trim down and feel lighter", color: "#EF4444" },
    { id: "gain", icon: "💪", title: "Gain Weight", desc: "Build mass healthily", color: "#3B82F6" },
    { id: "muscle", icon: "🏋️", title: "Build Muscle", desc: "Increase strength and definition", color: "#10B981" },
    { id: "balance", icon: "🧘", title: "Balance Doshas", desc: "Achieve Ayurvedic harmony", color: "#D4A24E" },
    { id: "energy", icon: "⚡", title: "Boost Energy", desc: "Feel vibrant all day long", color: "#F59E0B" },
];

const DIETS = [
    { id: "vegetarian", icon: "🥗", label: "Vegetarian", color: "#10B981" },
    { id: "vegan", icon: "🌱", label: "Vegan", color: "#84CC16" },
    { id: "non-veg", icon: "🍗", label: "Non-Veg", color: "#EF4444" },
    { id: "mixed", icon: "🍱", label: "Mixed / Both", color: "#F59E0B" },
];

export default function OnboardingScreen() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const { retake } = useLocalSearchParams();
    const uid = user?.uid || "";

    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");
    const [diet, setDiet] = useState("");
    const [region, setRegion] = useState("");
    const [goal, setGoal] = useState("");
    const [loading, setLoading] = useState(false);
    const [showStateModal, setShowStateModal] = useState(false);

    useEffect(() => {
        if (!uid) return;
        const unsub = firestore.subscribeToOnboarding(uid, (d) => {
            if (d) {
                setWeight(d.weight?.toString() || "");
                setHeight(d.height?.toString() || "");
                setAge(d.age?.toString() || "");
                setGender(d.gender || "");
                setDiet(d.diet || "");
                setRegion(d.region || "");
                setGoal(d.goal || "");
            }
        });
        return () => unsub();
    }, [uid]);

    const canContinue = weight && height && age && gender && diet && region && goal;

    const handleContinue = async () => {
        if (!canContinue || !uid) return;
        setLoading(true);
        try {
            await firestore.saveOnboarding(uid, {
                weight: parseFloat(weight),
                height: parseFloat(height),
                age: parseInt(age, 10),
                gender,
                diet,
                region,
                goal,
            });
            if (retake === "true") { router.back(); }
            else { router.replace("/(tabs)/home"); }
        } catch (e) {
            console.error("Failed to save onboarding:", e);
        } finally { setLoading(false); }
    };

    return (
        <View style={[s.screen, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.headerBg} />
            <View style={[s.header, { backgroundColor: colors.headerBg }]}>
                <Text style={[s.headerTag, { color: colors.gold }]}>YOUR PREFERENCES</Text>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
                    <Text style={s.mainEmoji}>🌿</Text>
                    <Text style={[s.title, { color: colors.text }]}>Tell Us About Yourself</Text>
                    <Text style={[s.subtitle, { color: colors.textSecondary }]}>This helps us create your personalized Ayurvedic meal plan.</Text>

                    <View style={s.inputRow}>
                        <View style={s.inputGroup}>
                            <Text style={[s.inputLabel, { color: colors.text }]}>WEIGHT (KG)</Text>
                            <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.inputBorder }]} placeholder="e.g., 70" placeholderTextColor={colors.inputPlaceholder} keyboardType="numeric" value={weight} onChangeText={setWeight} />
                        </View>
                        <View style={{ width: 14 }} />
                        <View style={s.inputGroup}>
                            <Text style={[s.inputLabel, { color: colors.text }]}>HEIGHT (CM)</Text>
                            <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.inputBorder }]} placeholder="e.g., 175" placeholderTextColor={colors.inputPlaceholder} keyboardType="numeric" value={height} onChangeText={setHeight} />
                        </View>
                    </View>

                    <View style={s.inputRow}>
                        <View style={s.inputGroup}>
                            <Text style={[s.inputLabel, { color: colors.text }]}>AGE</Text>
                            <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.inputBorder }]} placeholder="e.g., 28" placeholderTextColor={colors.inputPlaceholder} keyboardType="numeric" value={age} onChangeText={setAge} />
                        </View>
                        <View style={{ width: 14 }} />
                        <View style={s.inputGroup}>
                            <Text style={[s.inputLabel, { color: colors.text }]}>STATE (INDIA)</Text>
                            <TouchableOpacity
                                style={[s.input, { backgroundColor: colors.card, borderColor: colors.inputBorder, justifyContent: "center" }]}
                                onPress={() => setShowStateModal(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={[{ fontSize: 16, fontWeight: "600" }, region ? { color: colors.text } : { color: colors.inputPlaceholder }]}>
                                    {region || "Select State"}
                                </Text>
                            </TouchableOpacity>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8, paddingHorizontal: 4, lineHeight: 16, fontStyle: "italic" }}>
                                {!region 
                                    ? "Pick your state so we can include your local favorite flavors and dishes! 🍛"
                                    : region === "All India / General" 
                                        ? "Great! You'll get a vibrant variety of Ayurvedic recipes from all across India. ✨" 
                                        : `Perfect! We'll prepare your plan with authentic ${region} specialties. 🌿`}
                            </Text>
                        </View>
                    </View>

                    <Text style={[s.sectionLabel, { color: colors.text }]}>GENDER</Text>
                    <View style={s.genderRow}>
                        {GENDERS.map((g) => {
                            const isActive = gender === g.id;
                            return (
                                <TouchableOpacity key={g.id} style={[s.genderCard, { backgroundColor: colors.card, shadowColor: colors.shadow }, isActive && { borderColor: g.color, backgroundColor: `${g.color}10` }]} activeOpacity={0.7} onPress={() => setGender(g.id)}>
                                    <Text style={[s.genderIcon, { color: colors.textMuted }, isActive && { color: g.color }]}>{g.icon}</Text>
                                    <Text style={[s.genderLabel, { color: colors.textSecondary }, isActive && { color: g.color, fontWeight: "800" }]}>{g.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[s.sectionLabel, { color: colors.text }]}>DIETARY PREFERENCE</Text>
                    <View style={s.dietRow}>
                        {DIETS.map((d) => {
                            const isActive = diet === d.id;
                            return (
                                <TouchableOpacity key={d.id} style={[s.dietCard, { backgroundColor: colors.card, shadowColor: colors.shadow }, isActive && { borderColor: d.color, backgroundColor: `${d.color}10` }]} activeOpacity={0.7} onPress={() => setDiet(d.id)}>
                                    <Text style={[s.genderIcon, { color: colors.textMuted }, isActive && { color: d.color }]}>{d.icon}</Text>
                                    <Text style={[s.genderLabel, { color: colors.textSecondary }, isActive && { color: d.color, fontWeight: "800" }]}>{d.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[s.sectionLabel, { color: colors.text }]}>WHAT'S YOUR GOAL?</Text>
                    {GOALS.map((g) => {
                        const isActive = goal === g.id;
                        return (
                            <TouchableOpacity key={g.id} style={[s.goalCard, { backgroundColor: colors.card, shadowColor: colors.shadow }, isActive && { borderColor: g.color, backgroundColor: `${g.color}08` }]} activeOpacity={0.7} onPress={() => setGoal(g.id)}>
                                <View style={[s.goalIcon, { backgroundColor: `${g.color}15` }]}>
                                    <Text style={{ fontSize: 22 }}>{g.icon}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.goalTitle, { color: colors.text }, isActive && { color: g.color }]}>{g.title}</Text>
                                    <Text style={[s.goalDesc, { color: colors.textMuted }]}>{g.desc}</Text>
                                </View>
                                {isActive && (
                                    <View style={[s.checkDot, { backgroundColor: g.color }]}>
                                        <Text style={{ color: colors.textOnHeader, fontSize: 11, fontWeight: "900" }}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={[s.bottomBar, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={[s.ctaBtn, { backgroundColor: colors.primaryBtn, shadowColor: colors.primaryBtn }, !canContinue && s.ctaDisabled]} activeOpacity={0.8} onPress={handleContinue} disabled={!canContinue || loading}>
                    {loading ? <ActivityIndicator color={colors.primaryBtnText} /> : <Text style={[s.ctaBtnText, { color: colors.primaryBtnText }]}>Continue →</Text>}
                </TouchableOpacity>
            </View>

            {/* State Selection Modal */}
            <Modal visible={showStateModal} transparent animationType="slide" onRequestClose={() => setShowStateModal(false)}>
                <View style={[s.modalOverlay, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
                    <View style={[s.modalContent, { backgroundColor: colors.card }]}>
                        <View style={s.modalHeader}>
                            <View>
                                <Text style={[s.modalTitle, { color: colors.text }]}>Select Your State</Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                    Help us personalize your Ayurvedic recipes to your local culture! ✨
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowStateModal(false)} style={s.modalCloseBtn}>
                                <Text style={[s.modalCloseText, { color: colors.textMuted }]}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={INDIAN_STATES}
                            keyExtractor={(item) => item}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[s.stateItem, region === item && { backgroundColor: `${colors.primaryBtn}15` }]}
                                    onPress={() => {
                                        setRegion(item);
                                        setShowStateModal(false);
                                    }}
                                >
                                    <Text style={[s.stateItemText, { color: colors.text }, region === item && { color: colors.primaryBtn, fontWeight: "700" }]}>{item}</Text>
                                    {region === item && <Text style={{ color: colors.primaryBtn, fontWeight: "900" }}>✓</Text>}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1 },
    header: { paddingTop: SAFE_TOP_PADDING, paddingBottom: 18, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    headerTag: { fontSize: 12, fontWeight: "800", letterSpacing: 3 },
    body: { paddingHorizontal: 24, paddingTop: 28 },
    mainEmoji: { fontSize: 40, textAlign: "center", marginBottom: 10 },
    title: { fontSize: 24, fontWeight: "900", textAlign: "center", marginBottom: 8 },
    subtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 28, paddingHorizontal: 20 },
    inputRow: { flexDirection: "row", marginBottom: 24 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 2, marginBottom: 8, marginLeft: 4 },
    input: { borderRadius: 16, height: 52, paddingHorizontal: 18, fontSize: 16, fontWeight: "600", borderWidth: 1.5, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
    genderRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
    genderCard: { flex: 1, borderRadius: 18, paddingVertical: 18, alignItems: "center", borderWidth: 2, borderColor: "transparent", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    dietRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 28 },
    dietCard: { width: "48.5%", borderRadius: 18, paddingVertical: 18, alignItems: "center", borderWidth: 2, borderColor: "transparent", marginBottom: 10, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    genderIcon: { fontSize: 28, marginBottom: 6 },
    genderLabel: { fontSize: 13, fontWeight: "600", textAlign: "center", paddingHorizontal: 4 },
    goalCard: { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: "transparent", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    goalIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
    goalTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
    goalDesc: { fontSize: 12 },
    checkDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 30, paddingTop: 16 },
    ctaBtn: { borderRadius: 18, height: 56, justifyContent: "center", alignItems: "center", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
    ctaDisabled: { opacity: 0.4 },
    ctaBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: 1 },
    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "70%", padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
    modalTitle: { fontSize: 18, fontWeight: "800" },
    modalCloseBtn: { padding: 4 },
    modalCloseText: { fontSize: 20, fontWeight: "600" },
    stateItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
    stateItemText: { fontSize: 16, fontWeight: "500" },
});
