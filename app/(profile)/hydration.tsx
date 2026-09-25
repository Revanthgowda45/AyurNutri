import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestoreDB from "@/services/firestoreService";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { getCurrentSeason } from "@/utils/weekUtils";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");
const GLASS_ML = 250; // 1 glass = 250ml

/* ───────── Dosha Water Recommendations ───────── */
type WaterRecipe = {
    id: string;
    emoji: string;
    name: string;
    description: string;
    benefit: string;
};

const DOSHA_WATER_INFO: Record<string, {
    recommended: string;
    temperature: string;
    avoid: string;
    color: string;
    recipes: WaterRecipe[];
}> = {
    Vata: {
        recommended: "Warm/hot water throughout the day",
        temperature: "Warm to Hot",
        avoid: "Cold or iced water — aggravates Vata",
        color: "#5B8FB9",
        recipes: [
            { id: "ginger_water", emoji: "🫚", name: "Ginger Water", description: "Boil fresh ginger slices in water for 5 mins", benefit: "Kindles Agni, calms digestion" },
            { id: "cumin_water", emoji: "🌿", name: "Cumin Water", description: "Soak 1 tsp cumin seeds overnight, strain & drink warm", benefit: "Reduces bloating, grounds Vata" },
            { id: "warm_turmeric", emoji: "💛", name: "Turmeric Milk", description: "Warm milk + turmeric + ghee before bed", benefit: "Deep sleep, joint health" },
        ],
    },
    Pitta: {
        recommended: "Room temperature or cool (never iced) water",
        temperature: "Room Temp to Cool",
        avoid: "Hot water & ice-cold water — both disturb Pitta",
        color: "#E07A5F",
        recipes: [
            { id: "mint_water", emoji: "🌱", name: "Mint Water", description: "Fresh mint leaves in room-temp water", benefit: "Cooling, reduces Pitta heat" },
            { id: "ccf_tea", emoji: "🍵", name: "CCF Tea", description: "Equal parts cumin, coriander & fennel — steep 5 mins", benefit: "Detox, cools internal fire" },
            { id: "rose_water", emoji: "🌹", name: "Rose Water", description: "Few drops of food-grade rose water in drinking water", benefit: "Cooling, calms emotions" },
        ],
    },
    Kapha: {
        recommended: "Warm/hot water with stimulating spices",
        temperature: "Warm to Hot",
        avoid: "Cold water — increases Kapha congestion",
        color: "#6A994E",
        recipes: [
            { id: "honey_lemon", emoji: "🍋", name: "Honey Lemon Water", description: "Warm water + raw honey + fresh lemon juice", benefit: "Stimulates metabolism, clears Kapha" },
            { id: "ginger_pepper", emoji: "🌶️", name: "Ginger-Pepper Tea", description: "Fresh ginger + black pepper + honey", benefit: "Burns Ama, boosts Agni" },
            { id: "ajwain_water", emoji: "🌰", name: "Ajwain Water", description: "Boil 1 tsp ajwain (carom seeds) in water", benefit: "Digestive, reduces bloating" },
        ],
    },
};

const AYURVEDIC_RULES = [
    { emoji: "⏰", rule: "Don't drink water 30 minutes before or after meals" },
    { emoji: "🍽️", rule: "Small sips during meals are okay — aids digestion" },
    { emoji: "🌅", rule: "Start your day with warm water on an empty stomach" },
    { emoji: "🚫", rule: "Never drink ice-cold water — it kills Agni (digestive fire)" },
    { emoji: "🧘", rule: "Sit down while drinking water — don't gulp standing" },
    { emoji: "🌙", rule: "Reduce water intake after 7 PM for better sleep" },
];

function calculateTarget(weight?: number, doshaType?: string): number {
    // Base: body weight (kg) / 10 = liters, convert to glasses (250ml each)
    const baseWeight = weight || 65;
    const baseLiters = baseWeight / 10; // ~6.5L is too much, use /30 for reasonable amount
    const baseGlasses = Math.round((baseWeight * 35) / GLASS_ML); // 35ml per kg

    // Dosha adjustments
    const dosha = doshaType?.split("-")[0] || "Vata";
    if (dosha === "Pitta") return Math.min(baseGlasses + 1, 12); // Pitta needs more cooling
    if (dosha === "Kapha") return Math.max(baseGlasses - 1, 6); // Kapha needs less
    return Math.min(baseGlasses, 10); // Vata moderate
}

/* ───────── Component ───────── */
export default function HydrationScreen() {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();
    const uid = user?.uid || "";

    const today = new Date().toISOString().split("T")[0];
    const season = getCurrentSeason();

    const [doshaType, setDoshaType] = useState<string | undefined>(undefined);
    const [weight, setWeight] = useState<number>(65);
    const [glasses, setGlasses] = useState(0);
    const [logs, setLogs] = useState<firestoreDB.HydrationLog[]>([]);
    const [target, setTarget] = useState(8);
    const [isScrolled, setIsScrolled] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

    const fillAnim = useRef(new Animated.Value(0)).current;
    const splashAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const progressPercent = Math.min(glasses / target, 1);
    const dosha = doshaType?.split("-")[0] || "Vata";
    const waterInfo = DOSHA_WATER_INFO[dosha] || DOSHA_WATER_INFO.Vata;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (!uid) return;

        const unsubDosha = firestoreDB.subscribeToDoshaResult(uid, (d) => {
            setDoshaType(d?.doshaType || undefined);
        });

        const unsubOnboarding = firestoreDB.subscribeToOnboarding(uid, (d) => {
            if (d?.weight) setWeight(d.weight);
        });

        const unsubHydration = firestoreDB.subscribeToHydration(uid, today, (data) => {
            if (data) {
                setGlasses(data.glasses);
                setLogs(data.logs || []);
                setTarget(data.target);
            }
        });

        return () => {
            unsubDosha();
            unsubOnboarding();
            unsubHydration();
        };
    }, [uid, today]);

    // Update target when dosha/weight changes
    useEffect(() => {
        const newTarget = calculateTarget(weight, doshaType);
        setTarget(newTarget);
    }, [weight, doshaType]);

    // Animate water fill
    useEffect(() => {
        Animated.spring(fillAnim, {
            toValue: progressPercent,
            friction: 8,
            tension: 40,
            useNativeDriver: false,
        }).start();
    }, [progressPercent]);

    const addWater = async (amount: number, type: string = "water") => {
        if (Platform.OS !== "web") {
            Haptics.impactAsync(amount >= 1 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        }

        // Splash animation
        Animated.sequence([
            Animated.timing(splashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(splashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();

        const newGlasses = glasses + amount;
        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const newLogs: firestoreDB.HydrationLog[] = [...logs, { time: timeStr, amount: amount * GLASS_ML, type }];

        setGlasses(newGlasses);
        setLogs(newLogs);

        await firestoreDB.saveHydration(uid, today, {
            glasses: newGlasses,
            target,
            totalMl: newGlasses * GLASS_ML,
            logs: newLogs,
            date: today,
        });
    };

    const removeWater = async () => {
        if (glasses <= 0) return;
        if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const newGlasses = glasses - 1;
        const newLogs = logs.slice(0, -1);

        setGlasses(newGlasses);
        setLogs(newLogs);

        await firestoreDB.saveHydration(uid, today, {
            glasses: newGlasses,
            target,
            totalMl: newGlasses * GLASS_ML,
            logs: newLogs,
            date: today,
        });
    };

    const fillHeight = fillAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    return (
        <View style={[s.screen, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.headerBg} />

            {/* ─── Header ─── */}
            <View style={[s.header, {
                backgroundColor: isDark ? colors.card : colors.headerBg,
                ...(isScrolled ? { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6 } : {}),
            }]}>
                <View style={s.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={colors.textOnHeader} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textOnHeader }]}>
                            {t("hydration") || "Hydration"}
                        </Text>
                        <Text style={[s.headerSub, { color: isDark ? colors.textSecondary : colors.textOnHeaderSub }]}>
                            {t("hydration_sub") || "Ayurvedic Water Tracker"}
                        </Text>
                    </View>
                </View>
                <View style={[s.headerGoldLine, { backgroundColor: colors.gold }]} />
            </View>

            {/* ─── Body ─── */}
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView
                    contentContainerStyle={s.body}
                    showsVerticalScrollIndicator={false}
                    onScroll={(e) => setIsScrolled(e.nativeEvent.contentOffset.y > 10)}
                    scrollEventThrottle={16}
                >
                    {/* ─── Water Glass Visual ─── */}
                    <View style={s.glassSection}>
                        <View style={[s.glassContainer, { borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
                            {/* Water fill */}
                            <Animated.View style={[s.waterFill, {
                                height: fillHeight,
                                backgroundColor: isDark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.2)",
                            }]}>
                                {/* Wave effect */}
                                <View style={[s.wave, { backgroundColor: isDark ? "rgba(96,165,250,0.4)" : "rgba(96,165,250,0.3)" }]} />
                            </Animated.View>

                            {/* Glass content */}
                            <View style={s.glassContent}>
                                <Animated.Text style={[s.glassEmoji, { transform: [{ scale: Animated.add(1, Animated.multiply(splashAnim, 0.3)) }] }]}>
                                    💧
                                </Animated.Text>
                                <Text style={[s.glassCount, { color: colors.text }]}>
                                    {glasses}
                                </Text>
                                <Text style={[s.glassTarget, { color: colors.textMuted }]}>
                                    of {target} glasses
                                </Text>
                                <Text style={[s.glassMl, { color: colors.textSecondary }]}>
                                    {glasses * GLASS_ML} / {target * GLASS_ML} ml
                                </Text>
                            </View>
                        </View>

                        {/* Progress bar */}
                        <View style={[s.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
                            <Animated.View style={[s.progressBarFill, {
                                width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                                backgroundColor: progressPercent >= 1 ? "#10B981" : "#3B82F6",
                            }]} />
                        </View>
                        {progressPercent >= 1 && (
                            <Text style={[s.completedText, { color: "#10B981" }]}>
                                ✨ Daily goal reached! Great job!
                            </Text>
                        )}
                    </View>

                    {/* ─── Quick Add Buttons ─── */}
                    <View style={s.quickAddRow}>
                        <TouchableOpacity
                            style={[s.addBtn, s.addBtnSmall, { backgroundColor: isDark ? "rgba(59,130,246,0.1)" : "#EFF6FF", borderColor: isDark ? "rgba(59,130,246,0.2)" : "#DBEAFE" }]}
                            onPress={() => addWater(0.5)}
                        >
                            <Text style={s.addBtnEmoji}>💧</Text>
                            <Text style={[s.addBtnText, { color: "#3B82F6" }]}>+½ Glass</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.addBtn, s.addBtnLarge, { backgroundColor: isDark ? "rgba(59,130,246,0.15)" : "#DBEAFE", borderColor: isDark ? "rgba(59,130,246,0.3)" : "#93C5FD" }]}
                            onPress={() => addWater(1)}
                        >
                            <Text style={s.addBtnEmojiLarge}>💧</Text>
                            <Text style={[s.addBtnTextLarge, { color: "#2563EB" }]}>+1 Glass</Text>
                            <Text style={[s.addBtnMl, { color: "#60A5FA" }]}>250 ml</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.addBtn, s.addBtnSmall, { backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "#FEF2F2", borderColor: isDark ? "rgba(239,68,68,0.15)" : "#FECACA" }]}
                            onPress={removeWater}
                        >
                            <Text style={s.addBtnEmoji}>↩️</Text>
                            <Text style={[s.addBtnText, { color: "#EF4444" }]}>Undo</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─── Dosha Water Recommendation ─── */}
                    <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionEmoji}>
                                {dosha === "Vata" ? "🌬️" : dosha === "Pitta" ? "🔥" : "🌿"}
                            </Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.sectionTitle, { color: colors.text }]}>
                                    {dosha} Water Guide
                                </Text>
                                <Text style={[s.sectionSub, { color: colors.textSecondary }]}>
                                    {waterInfo.recommended}
                                </Text>
                            </View>
                        </View>

                        <View style={s.waterInfoRow}>
                            <View style={[s.waterInfoBadge, { backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "#ECFDF5" }]}>
                                <Text style={[s.waterInfoLabel, { color: "#10B981" }]}>✓ {waterInfo.temperature}</Text>
                            </View>
                            <View style={[s.waterInfoBadge, { backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "#FEF2F2" }]}>
                                <Text style={[s.waterInfoLabel, { color: "#EF4444" }]}>✗ {waterInfo.avoid.split("—")[0].trim()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ─── Ayurvedic Water Recipes ─── */}
                    <Text style={[s.sectionTitleOut, { color: colors.text }]}>
                        🍵 Ayurvedic Water Recipes
                    </Text>
                    <Text style={[s.sectionSubOut, { color: colors.textSecondary }]}>
                        Personalized for {dosha} dosha
                    </Text>

                    {waterInfo.recipes.map((recipe) => (
                        <TouchableOpacity
                            key={recipe.id}
                            style={[s.recipeCard, {
                                backgroundColor: selectedRecipe === recipe.id
                                    ? (isDark ? "rgba(59,130,246,0.08)" : "#EFF6FF")
                                    : colors.card,
                                borderColor: selectedRecipe === recipe.id
                                    ? (isDark ? "rgba(59,130,246,0.2)" : "#BFDBFE")
                                    : colors.cardBorder,
                            }]}
                            activeOpacity={0.7}
                            onPress={() => setSelectedRecipe(selectedRecipe === recipe.id ? null : recipe.id)}
                        >
                            <View style={s.recipeRow}>
                                <Text style={s.recipeEmoji}>{recipe.emoji}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.recipeName, { color: colors.text }]}>{recipe.name}</Text>
                                    <Text style={[s.recipeDesc, { color: colors.textSecondary }]}>{recipe.description}</Text>
                                </View>
                                <TouchableOpacity
                                    style={[s.logRecipeBtn, { backgroundColor: isDark ? "rgba(59,130,246,0.12)" : "#DBEAFE" }]}
                                    onPress={() => addWater(1, recipe.id)}
                                >
                                    <Text style={[s.logRecipeBtnText, { color: "#3B82F6" }]}>+Log</Text>
                                </TouchableOpacity>
                            </View>
                            {selectedRecipe === recipe.id && (
                                <View style={[s.recipeBenefit, { backgroundColor: isDark ? "rgba(16,185,129,0.06)" : "#F0FDF4" }]}>
                                    <Text style={[s.recipeBenefitText, { color: isDark ? "#6EE7B7" : "#065F46" }]}>
                                        ✨ {recipe.benefit}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}

                    {/* ─── Today's Log ─── */}
                    {logs.length > 0 && (
                        <View style={s.logSection}>
                            <Text style={[s.sectionTitleOut, { color: colors.text }]}>📋 Today's Log</Text>
                            <View style={[s.logContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                {logs.slice().reverse().map((log, i) => (
                                    <View key={i} style={[s.logRow, i < logs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                                        <Text style={[s.logTime, { color: colors.textMuted }]}>{log.time}</Text>
                                        <Text style={[s.logAmount, { color: colors.text }]}>
                                            {log.amount}ml
                                        </Text>
                                        <Text style={[s.logType, { color: colors.textSecondary }]}>
                                            {log.type === "water" ? "💧 Water" :
                                                waterInfo.recipes.find(r => r.id === log.type)?.name || "💧 Water"}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ─── Ayurvedic Water Rules ─── */}
                    <Text style={[s.sectionTitleOut, { color: colors.text, marginTop: 20 }]}>
                        📜 Ayurvedic Water Rules
                    </Text>
                    <View style={[s.rulesCard, { backgroundColor: isDark ? colors.tipBg : "#FFFBEB", borderColor: isDark ? colors.tipBorder : "#FEF3C7" }]}>
                        {AYURVEDIC_RULES.map((rule, i) => (
                            <View key={i} style={[s.ruleRow, i < AYURVEDIC_RULES.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }]}>
                                <Text style={s.ruleEmoji}>{rule.emoji}</Text>
                                <Text style={[s.ruleText, { color: isDark ? colors.tipText : "#92400E" }]}>
                                    {rule.rule}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 120 }} />
                </ScrollView>
            </Animated.View>
        </View>
    );
}

/* ───────── Styles ───────── */
const s = StyleSheet.create({
    screen: { flex: 1 },
    header: {
        paddingTop: SAFE_TOP_PADDING,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
    headerSub: { fontSize: 13, marginTop: 2, fontWeight: "500" },
    headerGoldLine: { height: 2, borderRadius: 1, marginTop: 14, opacity: 0.4 },
    body: { paddingHorizontal: 20, paddingTop: 20 },

    /* Glass */
    glassSection: { alignItems: "center", marginBottom: 24 },
    glassContainer: {
        width: 180,
        height: 220,
        borderRadius: 24,
        borderWidth: 2,
        overflow: "hidden",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },
    waterFill: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    wave: {
        position: "absolute",
        top: -6,
        left: -10,
        right: -10,
        height: 12,
        borderRadius: 6,
    },
    glassContent: {
        alignItems: "center",
        zIndex: 2,
    },
    glassEmoji: { fontSize: 36 },
    glassCount: { fontSize: 48, fontWeight: "900", marginTop: 4 },
    glassTarget: { fontSize: 14, fontWeight: "600", marginTop: 2 },
    glassMl: { fontSize: 12, fontWeight: "500", marginTop: 4 },
    progressBar: {
        width: width - 80,
        height: 8,
        borderRadius: 4,
        marginTop: 16,
        overflow: "hidden",
    },
    progressBarFill: { height: "100%", borderRadius: 4 },
    completedText: { fontSize: 14, fontWeight: "700", marginTop: 8 },

    /* Quick Add */
    quickAddRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 10,
        marginBottom: 24,
    },
    addBtn: {
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    addBtnSmall: {
        width: 80,
        paddingVertical: 14,
    },
    addBtnLarge: {
        width: 120,
        paddingVertical: 16,
    },
    addBtnEmoji: { fontSize: 20 },
    addBtnEmojiLarge: { fontSize: 28 },
    addBtnText: { fontSize: 12, fontWeight: "700", marginTop: 4 },
    addBtnTextLarge: { fontSize: 15, fontWeight: "800", marginTop: 4 },
    addBtnMl: { fontSize: 11, fontWeight: "500", marginTop: 2 },

    /* Section Card */
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    sectionEmoji: { fontSize: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "700" },
    sectionSub: { fontSize: 13, fontWeight: "500", marginTop: 2 },
    sectionTitleOut: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
    sectionSubOut: { fontSize: 13, fontWeight: "500", marginBottom: 12 },
    waterInfoRow: {
        flexDirection: "row",
        gap: 8,
    },
    waterInfoBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    waterInfoLabel: { fontSize: 12, fontWeight: "600" },

    /* Recipe Cards */
    recipeCard: {
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
        overflow: "hidden",
    },
    recipeRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        gap: 12,
    },
    recipeEmoji: { fontSize: 24 },
    recipeName: { fontSize: 15, fontWeight: "700" },
    recipeDesc: { fontSize: 12, fontWeight: "500", marginTop: 2 },
    logRecipeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    logRecipeBtnText: { fontSize: 12, fontWeight: "700" },
    recipeBenefit: {
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    recipeBenefitText: { fontSize: 13, fontWeight: "600" },

    /* Log */
    logSection: { marginTop: 20 },
    logContainer: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: "hidden",
        marginTop: 8,
    },
    logRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 12,
    },
    logTime: { fontSize: 12, fontWeight: "600", width: 70 },
    logAmount: { fontSize: 14, fontWeight: "700", width: 50 },
    logType: { fontSize: 13, fontWeight: "500", flex: 1 },

    /* Rules */
    rulesCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        marginTop: 8,
    },
    ruleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 10,
    },
    ruleEmoji: { fontSize: 18 },
    ruleText: { fontSize: 13, fontWeight: "500", flex: 1, lineHeight: 19 },
});
