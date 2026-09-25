import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestoreDB from "@/services/firestoreService";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
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

/* ───────── Agni Type Definitions ───────── */
const AGNI_TYPES: Record<string, {
    name: string;
    emoji: string;
    color: string;
    dosha: string;
    description: string;
    dietTip: string;
    remedies: string[];
}> = {
    Sama: {
        name: "Sama Agni",
        emoji: "✨",
        color: "#10B981",
        dosha: "Balanced",
        description: "Your digestive fire is perfectly balanced! You digest food well, have regular appetite, and feel energized after meals.",
        dietTip: "Continue your current diet. Maintain regular meal times and eat mindfully.",
        remedies: [
            "Maintain regular meal times",
            "Eat seasonal, fresh foods",
            "Practice gratitude before meals",
        ],
    },
    Vishama: {
        name: "Vishama Agni",
        emoji: "🌬️",
        color: "#5B8FB9",
        dosha: "Vata Imbalance",
        description: "Irregular digestive fire — sometimes strong appetite, sometimes none. Gas, bloating, and variable energy are common.",
        dietTip: "Eat warm, cooked, oily foods at regular times. Avoid cold, raw, and dry foods.",
        remedies: [
            "Drink warm ginger water before meals",
            "Eat at the same times daily",
            "Avoid snacking between meals",
            "Use warming spices: ginger, cumin, hing",
            "Take Triphala before bed",
        ],
    },
    Tikshna: {
        name: "Tikshna Agni",
        emoji: "🔥",
        color: "#EF4444",
        dosha: "Pitta Imbalance",
        description: "Overly sharp digestive fire — intense hunger, acid reflux, irritability when meals are delayed. Burns through food too fast.",
        dietTip: "Eat cooling, sweet, bitter foods. Avoid spicy, sour, fermented foods. Don't skip meals.",
        remedies: [
            "Drink aloe vera juice in the morning",
            "Eat cooling foods: cucumber, coconut, mint",
            "Avoid spicy, sour, and fried foods",
            "Sip CCF tea (cumin-coriander-fennel)",
            "Take Amalaki (Indian gooseberry)",
        ],
    },
    Manda: {
        name: "Manda Agni",
        emoji: "🌿",
        color: "#6A994E",
        dosha: "Kapha Imbalance",
        description: "Sluggish digestive fire — low appetite, heavy feeling after meals, lethargy, slow metabolism. Food takes long to digest.",
        dietTip: "Eat light, warm, spiced foods. Skip breakfast if not hungry. Avoid heavy, oily, sweet foods.",
        remedies: [
            "Drink hot ginger-lemon-honey water",
            "Eat your biggest meal at noon",
            "Skip or eat very light dinner",
            "Use stimulating spices: black pepper, cayenne, mustard",
            "Practice brisk walking after meals",
        ],
    },
};

/* ───────── Agni Detection Logic ───────── */
function detectAgniType(appetite: number, digestion: number, energy: number): string {
    const avg = (appetite + digestion + energy) / 3;

    if (avg >= 3.8) return "Sama";       // Balanced
    if (appetite <= 2 && energy <= 2) return "Manda";   // Sluggish (Kapha)
    if (appetite >= 4 && digestion <= 2) return "Tikshna"; // Sharp (Pitta)
    if (Math.abs(appetite - digestion) >= 2) return "Vishama"; // Irregular (Vata)
    if (avg <= 2.5) return "Manda";
    if (appetite >= 4) return "Tikshna";
    return "Vishama";
}

/* ───────── Score Emoji Map ───────── */
const SCORE_OPTIONS = [
    { value: 1, emoji: "😔", label: "Very Low" },
    { value: 2, emoji: "😕", label: "Low" },
    { value: 3, emoji: "😐", label: "Moderate" },
    { value: 4, emoji: "🙂", label: "Good" },
    { value: 5, emoji: "😄", label: "Excellent" },
];

/* ───────── Component ───────── */
export default function AgniMonitorScreen() {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();
    const uid = user?.uid || "";

    const today = new Date().toISOString().split("T")[0];

    const [appetite, setAppetite] = useState(0);
    const [digestion, setDigestion] = useState(0);
    const [energy, setEnergy] = useState(0);
    const [hasLogged, setHasLogged] = useState(false);
    const [agniType, setAgniType] = useState<string>("Sama");
    const [agniScore, setAgniScore] = useState(0);
    const [history, setHistory] = useState<firestoreDB.AgniDay[]>([]);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const resultScale = useRef(new Animated.Value(0)).current;
    const flameAnim = useRef(new Animated.Value(1)).current;

    // Flame pulsing animation
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(flameAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                Animated.timing(flameAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (!uid) return;

        const unsubDay = firestoreDB.subscribeToAgniDay(uid, today, (data) => {
            if (data) {
                setAppetite(data.appetite);
                setDigestion(data.digestion);
                setEnergy(data.energy);
                setAgniType(data.agniType);
                setAgniScore(data.agniScore);
                setHasLogged(true);
                setShowResult(true);
            }
        });

        // Load history
        firestoreDB.getAgniHistory(uid, 14).then(setHistory);

        return () => unsubDay();
    }, [uid, today]);

    const handleSubmit = async () => {
        if (appetite === 0 || digestion === 0 || energy === 0) return;

        if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const type = detectAgniType(appetite, digestion, energy);
        const score = Math.round(((appetite + digestion + energy) / 3) * 10) / 10;

        setAgniType(type);
        setAgniScore(score);
        setHasLogged(true);

        // Animate result reveal
        Animated.spring(resultScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
        setShowResult(true);

        await firestoreDB.saveAgniLog(uid, today, {
            appetite,
            digestion,
            energy,
            agniScore: score,
            agniType: type,
            date: today,
        });

        // Refresh history
        const newHistory = await firestoreDB.getAgniHistory(uid, 14);
        setHistory(newHistory);
    };

    const agniInfo = AGNI_TYPES[agniType] || AGNI_TYPES.Sama;

    // Calculate weekly trend
    const recentDays = history.slice(0, 7);
    const avgScore = recentDays.length > 0
        ? Math.round((recentDays.reduce((sum, d) => sum + d.agniScore, 0) / recentDays.length) * 10) / 10
        : 0;

    const selectScore = (setter: (v: number) => void, value: number) => {
        if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setter(value);
    };

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
                            {t("agni_monitor") || "Agni Monitor"}
                        </Text>
                        <Text style={[s.headerSub, { color: isDark ? colors.textSecondary : colors.textOnHeaderSub }]}>
                            {t("agni_sub") || "Track Your Digestive Fire"}
                        </Text>
                    </View>
                    <Animated.Text style={[s.headerFlame, { transform: [{ scale: flameAnim }] }]}>
                        🔥
                    </Animated.Text>
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
                    {/* ─── Intro Card ─── */}
                    <View style={[s.introCard, { backgroundColor: isDark ? "rgba(245,158,11,0.06)" : "#FFFBEB", borderColor: isDark ? "rgba(245,158,11,0.12)" : "#FEF3C7" }]}>
                        <Text style={s.introEmoji}>🔥</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.introTitle, { color: isDark ? colors.tipLabel : "#B45309" }]}>
                                What is Agni?
                            </Text>
                            <Text style={[s.introText, { color: isDark ? colors.tipText : "#92400E" }]}>
                                Agni is your digestive fire — the root of health in Ayurveda. Strong Agni = good digestion, immunity, and clarity. Weak or imbalanced Agni leads to Ama (toxins) and disease.
                            </Text>
                        </View>
                    </View>

                    {/* ─── Daily Check-in ─── */}
                    {!hasLogged ? (
                        <View style={[s.checkinCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                            <Text style={[s.checkinTitle, { color: colors.text }]}>
                                📋 Daily Agni Check-in
                            </Text>
                            <Text style={[s.checkinSub, { color: colors.textSecondary }]}>
                                Answer 3 quick questions about your digestion today
                            </Text>

                            {/* Question 1: Appetite */}
                            <View style={s.questionBlock}>
                                <Text style={[s.questionLabel, { color: colors.text }]}>
                                    1. How is your appetite today?
                                </Text>
                                <Text style={[s.questionHint, { color: colors.textMuted }]}>
                                    🍽️ Are you hungry at mealtimes?
                                </Text>
                                <View style={s.scoreRow}>
                                    {SCORE_OPTIONS.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[s.scoreBtn, {
                                                backgroundColor: appetite === opt.value
                                                    ? (isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7")
                                                    : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"),
                                                borderColor: appetite === opt.value
                                                    ? colors.gold
                                                    : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                                            }]}
                                            onPress={() => selectScore(setAppetite, opt.value)}
                                        >
                                            <Text style={s.scoreEmoji}>{opt.emoji}</Text>
                                            <Text style={[s.scoreLabel, {
                                                color: appetite === opt.value ? colors.gold : colors.textMuted,
                                            }]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Question 2: Digestion */}
                            <View style={s.questionBlock}>
                                <Text style={[s.questionLabel, { color: colors.text }]}>
                                    2. How is your digestion?
                                </Text>
                                <Text style={[s.questionHint, { color: colors.textMuted }]}>
                                    🫃 Any bloating, gas, acidity, or heaviness?
                                </Text>
                                <View style={s.scoreRow}>
                                    {SCORE_OPTIONS.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[s.scoreBtn, {
                                                backgroundColor: digestion === opt.value
                                                    ? (isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5")
                                                    : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"),
                                                borderColor: digestion === opt.value
                                                    ? "#10B981"
                                                    : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                                            }]}
                                            onPress={() => selectScore(setDigestion, opt.value)}
                                        >
                                            <Text style={s.scoreEmoji}>{opt.emoji}</Text>
                                            <Text style={[s.scoreLabel, {
                                                color: digestion === opt.value ? "#10B981" : colors.textMuted,
                                            }]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Question 3: Energy */}
                            <View style={s.questionBlock}>
                                <Text style={[s.questionLabel, { color: colors.text }]}>
                                    3. Energy after eating?
                                </Text>
                                <Text style={[s.questionHint, { color: colors.textMuted }]}>
                                    ⚡ Do you feel light and energized or heavy and dull?
                                </Text>
                                <View style={s.scoreRow}>
                                    {SCORE_OPTIONS.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[s.scoreBtn, {
                                                backgroundColor: energy === opt.value
                                                    ? (isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF")
                                                    : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"),
                                                borderColor: energy === opt.value
                                                    ? "#3B82F6"
                                                    : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                                            }]}
                                            onPress={() => selectScore(setEnergy, opt.value)}
                                        >
                                            <Text style={s.scoreEmoji}>{opt.emoji}</Text>
                                            <Text style={[s.scoreLabel, {
                                                color: energy === opt.value ? "#3B82F6" : colors.textMuted,
                                            }]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Submit */}
                            <TouchableOpacity
                                style={[s.submitBtn, {
                                    backgroundColor: (appetite > 0 && digestion > 0 && energy > 0) ? colors.primaryBtn : colors.divider,
                                    opacity: (appetite > 0 && digestion > 0 && energy > 0) ? 1 : 0.5,
                                }]}
                                disabled={appetite === 0 || digestion === 0 || energy === 0}
                                onPress={handleSubmit}
                            >
                                <Ionicons name="flame" size={20} color={colors.primaryBtnText} />
                                <Text style={[s.submitBtnText, { color: colors.primaryBtnText }]}>
                                    Analyze My Agni
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* ─── Result Card ─── */}
                    {showResult && (
                        <Animated.View style={[s.resultCard, {
                            backgroundColor: colors.card,
                            borderColor: `${agniInfo.color}30`,
                            borderWidth: 1.5,
                            transform: hasLogged ? [] : [{ scale: resultScale }],
                        }]}>
                            {/* Agni Type Badge */}
                            <View style={[s.agniTypeBadge, { backgroundColor: `${agniInfo.color}15` }]}>
                                <Text style={s.agniTypeEmoji}>{agniInfo.emoji}</Text>
                                <View>
                                    <Text style={[s.agniTypeName, { color: agniInfo.color }]}>
                                        {agniInfo.name}
                                    </Text>
                                    <Text style={[s.agniTypeDosha, { color: colors.textSecondary }]}>
                                        {agniInfo.dosha}
                                    </Text>
                                </View>
                                <View style={[s.agniScoreBadge, { backgroundColor: `${agniInfo.color}20`, borderColor: `${agniInfo.color}40` }]}>
                                    <Text style={[s.agniScoreVal, { color: agniInfo.color }]}>
                                        {agniScore}
                                    </Text>
                                    <Text style={[s.agniScoreLabel, { color: `${agniInfo.color}99` }]}>
                                        /5
                                    </Text>
                                </View>
                            </View>

                            {/* Description */}
                            <Text style={[s.resultDesc, { color: colors.textSecondary }]}>
                                {agniInfo.description}
                            </Text>

                            {/* Score Breakdown */}
                            <View style={s.breakdownRow}>
                                {[
                                    { label: "Appetite", value: appetite, emoji: "🍽️", color: "#F59E0B" },
                                    { label: "Digestion", value: digestion, emoji: "🫃", color: "#10B981" },
                                    { label: "Energy", value: energy, emoji: "⚡", color: "#3B82F6" },
                                ].map((item) => (
                                    <View key={item.label} style={[s.breakdownItem, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
                                        <Text style={s.breakdownEmoji}>{item.emoji}</Text>
                                        <Text style={[s.breakdownValue, { color: item.color }]}>{item.value}/5</Text>
                                        <Text style={[s.breakdownLabel, { color: colors.textMuted }]}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Diet Tip */}
                            <View style={[s.dietTipBox, { backgroundColor: isDark ? `${agniInfo.color}08` : `${agniInfo.color}08`, borderColor: `${agniInfo.color}20` }]}>
                                <Text style={s.dietTipEmoji}>🥗</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.dietTipLabel, { color: agniInfo.color }]}>DIET RECOMMENDATION</Text>
                                    <Text style={[s.dietTipText, { color: colors.text }]}>{agniInfo.dietTip}</Text>
                                </View>
                            </View>

                            {/* Remedies */}
                            <Text style={[s.remediesTitle, { color: colors.text }]}>🌿 Ayurvedic Remedies</Text>
                            {agniInfo.remedies.map((remedy, i) => (
                                <View key={i} style={s.remedyRow}>
                                    <View style={[s.remedyDot, { backgroundColor: agniInfo.color }]} />
                                    <Text style={[s.remedyText, { color: colors.textSecondary }]}>{remedy}</Text>
                                </View>
                            ))}

                            {/* Retake Button */}
                            {hasLogged && (
                                <TouchableOpacity
                                    style={[s.retakeBtn, { borderColor: colors.cardBorder }]}
                                    onPress={() => {
                                        setHasLogged(false);
                                        setShowResult(false);
                                        setAppetite(0);
                                        setDigestion(0);
                                        setEnergy(0);
                                    }}
                                >
                                    <Ionicons name="refresh" size={16} color={colors.textMuted} />
                                    <Text style={[s.retakeBtnText, { color: colors.textMuted }]}>Retake Today's Check-in</Text>
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    )}

                    {/* ─── Trend Chart ─── */}
                    {history.length > 1 && (
                        <View style={s.trendSection}>
                            <Text style={[s.sectionTitle, { color: colors.text }]}>📊 Agni Trend</Text>
                            <Text style={[s.sectionSub, { color: colors.textSecondary }]}>
                                Last {Math.min(history.length, 14)} days • Avg: {avgScore}/5
                            </Text>

                            {/* Simple bar chart */}
                            <View style={[s.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                <View style={s.chartBars}>
                                    {history.slice(0, 14).reverse().map((day, i) => {
                                        const heightPct = (day.agniScore / 5) * 100;
                                        const typeInfo = AGNI_TYPES[day.agniType] || AGNI_TYPES.Sama;
                                        const dayLabel = day.date.slice(8); // just DD
                                        const isToday = day.date === today;

                                        return (
                                            <View key={i} style={s.barCol}>
                                                <View style={[s.barTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
                                                    <View style={[s.barFill, {
                                                        height: `${heightPct}%`,
                                                        backgroundColor: typeInfo.color,
                                                        opacity: isToday ? 1 : 0.6,
                                                    }]} />
                                                </View>
                                                <Text style={[s.barLabel, {
                                                    color: isToday ? colors.gold : colors.textMuted,
                                                    fontWeight: isToday ? "800" : "500",
                                                }]}>{dayLabel}</Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                {/* Legend */}
                                <View style={s.legendRow}>
                                    {Object.entries(AGNI_TYPES).map(([key, val]) => (
                                        <View key={key} style={s.legendItem}>
                                            <View style={[s.legendDot, { backgroundColor: val.color }]} />
                                            <Text style={[s.legendText, { color: colors.textMuted }]}>{val.emoji} {key}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ─── History List ─── */}
                    {history.length > 0 && (
                        <View style={s.historySection}>
                            <Text style={[s.sectionTitle, { color: colors.text }]}>📅 Recent Check-ins</Text>
                            {history.slice(0, 7).map((day, i) => {
                                const typeInfo = AGNI_TYPES[day.agniType] || AGNI_TYPES.Sama;
                                const dateObj = new Date(day.date + "T00:00:00");
                                const label = day.date === today ? "Today"
                                    : dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

                                return (
                                    <View key={i} style={[s.historyRow, {
                                        backgroundColor: colors.card,
                                        borderColor: colors.cardBorder,
                                    }]}>
                                        <View style={[s.historyDot, { backgroundColor: typeInfo.color }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.historyDate, { color: colors.text }]}>{label}</Text>
                                            <Text style={[s.historyType, { color: typeInfo.color }]}>
                                                {typeInfo.emoji} {typeInfo.name}
                                            </Text>
                                        </View>
                                        <View style={s.historyScores}>
                                            <Text style={[s.historyScoreItem, { color: colors.textSecondary }]}>🍽️{day.appetite}</Text>
                                            <Text style={[s.historyScoreItem, { color: colors.textSecondary }]}>🫃{day.digestion}</Text>
                                            <Text style={[s.historyScoreItem, { color: colors.textSecondary }]}>⚡{day.energy}</Text>
                                        </View>
                                        <View style={[s.historyBadge, { backgroundColor: `${typeInfo.color}15` }]}>
                                            <Text style={[s.historyBadgeText, { color: typeInfo.color }]}>
                                                {day.agniScore}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

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
    headerFlame: { fontSize: 32 },
    headerGoldLine: { height: 2, borderRadius: 1, marginTop: 14, opacity: 0.4 },
    body: { paddingHorizontal: 20, paddingTop: 16 },

    /* Intro */
    introCard: {
        flexDirection: "row",
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        gap: 12,
        marginBottom: 16,
    },
    introEmoji: { fontSize: 28 },
    introTitle: { fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
    introText: { fontSize: 13, fontWeight: "500", lineHeight: 19, marginTop: 4 },

    /* Check-in */
    checkinCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 20,
        marginBottom: 16,
    },
    checkinTitle: { fontSize: 20, fontWeight: "800" },
    checkinSub: { fontSize: 14, fontWeight: "500", marginTop: 4, marginBottom: 20 },
    questionBlock: { marginBottom: 24 },
    questionLabel: { fontSize: 16, fontWeight: "700" },
    questionHint: { fontSize: 13, fontWeight: "500", marginTop: 4, marginBottom: 12 },
    scoreRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 6,
    },
    scoreBtn: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    scoreEmoji: { fontSize: 22 },
    scoreLabel: { fontSize: 9, fontWeight: "700", marginTop: 4, letterSpacing: 0.3 },
    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    submitBtnText: { fontSize: 16, fontWeight: "800" },

    /* Result */
    resultCard: {
        borderRadius: 18,
        padding: 20,
        marginBottom: 16,
    },
    agniTypeBadge: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        gap: 12,
        marginBottom: 16,
    },
    agniTypeEmoji: { fontSize: 32 },
    agniTypeName: { fontSize: 18, fontWeight: "800" },
    agniTypeDosha: { fontSize: 13, fontWeight: "500", marginTop: 2 },
    agniScoreBadge: {
        marginLeft: "auto",
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    agniScoreVal: { fontSize: 22, fontWeight: "900" },
    agniScoreLabel: { fontSize: 14, fontWeight: "600" },
    resultDesc: { fontSize: 14, fontWeight: "500", lineHeight: 21, marginBottom: 16 },
    breakdownRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    breakdownItem: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    breakdownEmoji: { fontSize: 18 },
    breakdownValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
    breakdownLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
    dietTipBox: {
        flexDirection: "row",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
        marginBottom: 16,
    },
    dietTipEmoji: { fontSize: 20 },
    dietTipLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
    dietTipText: { fontSize: 13, fontWeight: "500", lineHeight: 19, marginTop: 4 },
    remediesTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
    remedyRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },
    remedyDot: { width: 6, height: 6, borderRadius: 3 },
    remedyText: { fontSize: 14, fontWeight: "500", flex: 1 },
    retakeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        marginTop: 16,
        borderTopWidth: 1,
    },
    retakeBtnText: { fontSize: 13, fontWeight: "600" },

    /* Trend Chart */
    trendSection: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "800" },
    sectionSub: { fontSize: 13, fontWeight: "500", marginTop: 2, marginBottom: 12 },
    chartCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    chartBars: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: 100,
        gap: 4,
    },
    barCol: { flex: 1, alignItems: "center" },
    barTrack: {
        width: "100%",
        height: 80,
        borderRadius: 4,
        overflow: "hidden",
        justifyContent: "flex-end",
    },
    barFill: { width: "100%", borderRadius: 4 },
    barLabel: { fontSize: 9, marginTop: 4 },
    legendRow: {
        flexDirection: "row",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.04)",
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, fontWeight: "600" },

    /* History */
    historySection: { marginBottom: 20 },
    historyRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
        gap: 10,
    },
    historyDot: { width: 8, height: 8, borderRadius: 4 },
    historyDate: { fontSize: 14, fontWeight: "700" },
    historyType: { fontSize: 12, fontWeight: "600", marginTop: 2 },
    historyScores: { flexDirection: "row", gap: 6 },
    historyScoreItem: { fontSize: 12, fontWeight: "600" },
    historyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    historyBadgeText: { fontSize: 14, fontWeight: "800" },
});
