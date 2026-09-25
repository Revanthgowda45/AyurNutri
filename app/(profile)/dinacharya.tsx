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

/* ───────── Dosha-Specific Routine Data ───────── */
type RoutineTask = {
    id: string;
    time: string;
    emoji: string;
    title: string;
    description: string;
    period: "brahma_muhurta" | "morning" | "midday" | "afternoon" | "evening";
};

type DoshaRoutines = {
    [key: string]: RoutineTask[];
};

const PERIOD_INFO: Record<string, { label: string; emoji: string; color: string; timeRange: string }> = {
    brahma_muhurta: { label: "Brahma Muhurta", emoji: "🌅", color: "#F59E0B", timeRange: "5:00 – 6:00 AM" },
    morning: { label: "Morning", emoji: "☀️", color: "#EF4444", timeRange: "6:00 – 9:00 AM" },
    midday: { label: "Midday", emoji: "🌞", color: "#10B981", timeRange: "12:00 – 2:00 PM" },
    afternoon: { label: "Afternoon", emoji: "🍵", color: "#8B5CF6", timeRange: "3:00 – 5:00 PM" },
    evening: { label: "Evening", emoji: "🌙", color: "#3B82F6", timeRange: "6:00 – 10:00 PM" },
};

const GENERAL_TASKS: RoutineTask[] = [
    { id: "wake", time: "5:30 AM", emoji: "🌅", title: "Wake Up Early", description: "Rise during Brahma Muhurta for Sattvic energy", period: "brahma_muhurta" },
    { id: "tongue", time: "5:35 AM", emoji: "👅", title: "Tongue Scraping", description: "Remove Ama (toxins) with a copper tongue scraper", period: "brahma_muhurta" },
    { id: "oil_pull", time: "5:40 AM", emoji: "🫒", title: "Oil Pulling", description: "Swish 1 tbsp sesame/coconut oil for 5-10 mins", period: "brahma_muhurta" },
    { id: "water", time: "6:00 AM", emoji: "💧", title: "Warm Water", description: "Drink warm water to kindle Agni (digestive fire)", period: "morning" },
    { id: "yoga", time: "6:30 AM", emoji: "🧘", title: "Yoga & Pranayama", description: "30 mins of gentle yoga and breathing exercises", period: "morning" },
    { id: "abhyanga", time: "7:00 AM", emoji: "💆", title: "Self-Massage (Abhyanga)", description: "Warm oil massage before bathing", period: "morning" },
    { id: "breakfast", time: "8:00 AM", emoji: "🍳", title: "Mindful Breakfast", description: "Eat warm, nourishing food in silence", period: "morning" },
    { id: "lunch", time: "12:30 PM", emoji: "🥗", title: "Main Meal", description: "Eat your largest meal when Agni is strongest", period: "midday" },
    { id: "walk_lunch", time: "1:00 PM", emoji: "🚶", title: "Post-Lunch Walk", description: "100 steps (Shatapavali) to aid digestion", period: "midday" },
    { id: "tea", time: "3:30 PM", emoji: "🍵", title: "Herbal Tea Break", description: "Sip warm herbal tea to sustain energy", period: "afternoon" },
    { id: "dinner", time: "6:30 PM", emoji: "🌙", title: "Light Dinner", description: "Eat light, warm food before sunset", period: "evening" },
    { id: "walk_eve", time: "7:00 PM", emoji: "🌳", title: "Evening Walk", description: "Gentle walk to settle the day", period: "evening" },
    { id: "meditate", time: "9:00 PM", emoji: "🕉️", title: "Meditation", description: "10 mins of calm meditation before sleep", period: "evening" },
    { id: "sleep", time: "10:00 PM", emoji: "😴", title: "Early Sleep", description: "Sleep by 10 PM for optimal rejuvenation", period: "evening" },
];

const DOSHA_CUSTOMIZATIONS: Record<string, Record<string, { title?: string; description: string }>> = {
    Vata: {
        water: { description: "Drink warm ginger water to calm Vata and kindle Agni" },
        yoga: { title: "Gentle Yoga & Nadi Shodhana", description: "Slow, grounding yoga + alternate nostril breathing" },
        abhyanga: { description: "Warm sesame oil massage — deeply calming for Vata" },
        breakfast: { description: "Warm, oily foods — oats with ghee, stewed fruits" },
        tea: { description: "Ginger-cinnamon tea to warm and ground Vata" },
        dinner: { description: "Warm, soupy dinner — khichdi, dal, root veggies" },
        sleep: { description: "Warm milk with nutmeg & ashwagandha. Sleep by 10 PM" },
    },
    Pitta: {
        water: { description: "Room-temperature water with mint or rose petals" },
        yoga: { title: "Moderate Yoga & Sheetali", description: "Moon salutations + cooling breath (Sheetali pranayama)" },
        abhyanga: { description: "Coconut oil massage — cooling and soothing for Pitta" },
        breakfast: { description: "Cooling breakfast — sweet fruits, oats, coconut" },
        tea: { description: "Cooling mint-fennel tea or CCF (cumin-coriander-fennel)" },
        dinner: { description: "Moderate, non-spicy dinner — rice, ghee, sweet veggies" },
        sleep: { description: "Cool bedroom, reading. Avoid screens. Sleep by 10 PM" },
    },
    Kapha: {
        water: { description: "Hot water with honey & lemon to stimulate Kapha" },
        yoga: { title: "Vigorous Yoga & Kapalabhati", description: "Sun salutations + skull-shining breath (energizing)" },
        abhyanga: { title: "Dry Brush + Light Oil", description: "Dry brushing (Garshana) + light mustard oil massage" },
        breakfast: { description: "Light, spiced breakfast — millet porridge, warm spices" },
        tea: { description: "Spicy ginger-black pepper tea to stimulate metabolism" },
        dinner: { description: "Very light dinner — clear soup, steamed veggies only" },
        sleep: { description: "Avoid daytime naps. Light walk after dinner. Sleep by 10" },
    },
};

function getTasksForDosha(doshaType?: string): RoutineTask[] {
    const dosha = doshaType?.split("-")[0] || "Vata"; // Use primary dosha
    const customizations = DOSHA_CUSTOMIZATIONS[dosha] || {};

    return GENERAL_TASKS.map((task) => {
        const custom = customizations[task.id];
        if (custom) {
            return {
                ...task,
                title: custom.title || task.title,
                description: custom.description,
            };
        }
        return task;
    });
}

/* ───────── Component ───────── */
export default function DinacharyaScreen() {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();
    const uid = user?.uid || "";

    const today = new Date().toISOString().split("T")[0];
    const season = getCurrentSeason();

    const [doshaType, setDoshaType] = useState<string | undefined>(undefined);
    const [tasks, setTasks] = useState<Record<string, boolean>>({});
    const [streak, setStreak] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const streakScale = useRef(new Animated.Value(1)).current;

    const routineTasks = getTasksForDosha(doshaType);
    const completedCount = Object.values(tasks).filter(Boolean).length;
    const totalTasks = routineTasks.length;
    const progressPercent = totalTasks > 0 ? completedCount / totalTasks : 0;

    // Group tasks by period
    const periods = ["brahma_muhurta", "morning", "midday", "afternoon", "evening"] as const;
    const groupedTasks = periods.map((period) => ({
        period,
        info: PERIOD_INFO[period],
        tasks: routineTasks.filter((t) => t.period === period),
    }));

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (!uid) return;

        const unsubDosha = firestoreDB.subscribeToDoshaResult(uid, (d) => {
            setDoshaType(d?.doshaType || undefined);
        });

        const unsubDay = firestoreDB.subscribeToDinacharyaDay(uid, today, (data) => {
            if (data) {
                setTasks(data.tasks || {});
            }
        });

        // Load streak
        firestoreDB.getDinacharyaStreak(uid).then(setStreak);

        return () => {
            unsubDosha();
            unsubDay();
        };
    }, [uid, today]);

    const toggleTask = async (taskId: string) => {
        if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const newTasks = { ...tasks, [taskId]: !tasks[taskId] };
        setTasks(newTasks);

        const newCompleted = Object.values(newTasks).filter(Boolean).length;

        // Streak animation
        if (!tasks[taskId]) {
            Animated.sequence([
                Animated.spring(streakScale, { toValue: 1.3, friction: 3, useNativeDriver: true }),
                Animated.spring(streakScale, { toValue: 1, friction: 5, useNativeDriver: true }),
            ]).start();
        }

        await firestoreDB.saveDinacharyaProgress(uid, today, {
            tasks: newTasks,
            completedCount: newCompleted,
            totalTasks,
            date: today,
        });

        // Refresh streak
        const newStreak = await firestoreDB.getDinacharyaStreak(uid);
        setStreak(newStreak);
    };

    return (
        <View style={[s.screen, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.headerBg} />

            {/* ─── Header ─── */}
            <View style={[s.header, {
                backgroundColor: isDark ? colors.card : colors.headerBg,
                ...(isScrolled ? { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6 } : {})
            }]}>
                <View style={s.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={colors.textOnHeader} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textOnHeader }]}>
                            {t("dinacharya") || "Daily Routine"}
                        </Text>
                        <Text style={[s.headerSub, { color: isDark ? colors.textSecondary : colors.textOnHeaderSub }]}>
                            {t("dinacharya_sub") || "Ayurvedic Dinacharya"} • {season.emoji} {season.ayurvedic}
                        </Text>
                    </View>
                </View>

                {/* Progress + Streak row */}
                <View style={s.progressRow}>
                    {/* Progress Ring */}
                    <View style={s.progressSection}>
                        <View style={[s.progressRing, { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)" }]}>
                            <View style={[s.progressFill, {
                                borderColor: colors.gold,
                                borderTopColor: progressPercent > 0 ? colors.gold : "transparent",
                                borderRightColor: progressPercent > 0.25 ? colors.gold : "transparent",
                                borderBottomColor: progressPercent > 0.5 ? colors.gold : "transparent",
                                borderLeftColor: progressPercent > 0.75 ? colors.gold : "transparent",
                                transform: [{ rotate: "-45deg" }],
                            }]} />
                            <Text style={[s.progressText, { color: colors.textOnHeader }]}>
                                {Math.round(progressPercent * 100)}%
                            </Text>
                        </View>
                        <View>
                            <Text style={[s.progressLabel, { color: colors.textOnHeader }]}>
                                {completedCount}/{totalTasks}
                            </Text>
                            <Text style={[s.progressSubLabel, { color: isDark ? colors.textSecondary : colors.textOnHeaderSub }]}>
                                {t("tasks_done") || "tasks done"}
                            </Text>
                        </View>
                    </View>

                    {/* Streak */}
                    <Animated.View style={[s.streakBox, { backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.15)", transform: [{ scale: streakScale }] }]}>
                        <Text style={s.streakFire}>🔥</Text>
                        <Text style={[s.streakNum, { color: colors.textOnHeader }]}>{streak}</Text>
                        <Text style={[s.streakLabel, { color: isDark ? colors.textSecondary : colors.textOnHeaderSub }]}>
                            {t("day_streak") || "day streak"}
                        </Text>
                    </Animated.View>
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
                    {/* Dosha Tag */}
                    {doshaType && (
                        <View style={[s.doshaTag, { backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "#ECFDF5", borderColor: isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5" }]}>
                            <Text style={s.doshaTagEmoji}>
                                {doshaType.includes("Vata") ? "🌬️" : doshaType.includes("Pitta") ? "🔥" : "🌿"}
                            </Text>
                            <Text style={[s.doshaTagText, { color: isDark ? "#6EE7B7" : "#065F46" }]}>
                                Personalized for {doshaType} constitution
                            </Text>
                        </View>
                    )}

                    {/* Timeline */}
                    {groupedTasks.map((group, gi) => (
                        <View key={group.period} style={s.periodBlock}>
                            {/* Period Header */}
                            <View style={s.periodHeader}>
                                <View style={[s.periodDot, { backgroundColor: group.info.color }]} />
                                <View style={{ flex: 1 }}>
                                    <View style={s.periodTitleRow}>
                                        <Text style={s.periodEmoji}>{group.info.emoji}</Text>
                                        <Text style={[s.periodTitle, { color: colors.text }]}>
                                            {group.info.label}
                                        </Text>
                                    </View>
                                    <Text style={[s.periodTime, { color: colors.textMuted }]}>
                                        {group.info.timeRange}
                                    </Text>
                                </View>
                                {/* Period completion badge */}
                                {(() => {
                                    const periodDone = group.tasks.filter((t) => tasks[t.id]).length;
                                    const periodTotal = group.tasks.length;
                                    return (
                                        <View style={[s.periodBadge, {
                                            backgroundColor: periodDone === periodTotal
                                                ? (isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5")
                                                : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"),
                                            borderColor: periodDone === periodTotal
                                                ? (isDark ? "rgba(16,185,129,0.25)" : "#D1FAE5")
                                                : "transparent",
                                        }]}>
                                            <Text style={[s.periodBadgeText, {
                                                color: periodDone === periodTotal ? "#10B981" : colors.textMuted,
                                            }]}>
                                                {periodDone}/{periodTotal}
                                            </Text>
                                        </View>
                                    );
                                })()}
                            </View>

                            {/* Tasks */}
                            {group.tasks.map((task, ti) => {
                                const isCompleted = !!tasks[task.id];
                                const isLast = ti === group.tasks.length - 1 && gi === groupedTasks.length - 1;

                                return (
                                    <TouchableOpacity
                                        key={task.id}
                                        style={[
                                            s.taskCard,
                                            {
                                                backgroundColor: isCompleted
                                                    ? (isDark ? "rgba(16,185,129,0.08)" : "#F0FDF4")
                                                    : colors.card,
                                                borderColor: isCompleted
                                                    ? (isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5")
                                                    : colors.cardBorder,
                                            },
                                        ]}
                                        activeOpacity={0.7}
                                        onPress={() => toggleTask(task.id)}
                                    >
                                        {/* Timeline connector */}
                                        {!isLast && (
                                            <View style={[s.timelineConnector, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]} />
                                        )}

                                        <View style={s.taskRow}>
                                            {/* Checkbox */}
                                            <View style={[s.checkbox, {
                                                backgroundColor: isCompleted ? colors.green : "transparent",
                                                borderColor: isCompleted ? colors.green : colors.textMuted,
                                            }]}>
                                                {isCompleted && (
                                                    <Ionicons name="checkmark" size={14} color="#FFF" />
                                                )}
                                            </View>

                                            {/* Content */}
                                            <View style={s.taskContent}>
                                                <View style={s.taskTitleRow}>
                                                    <Text style={s.taskEmoji}>{task.emoji}</Text>
                                                    <Text style={[s.taskTitle, {
                                                        color: isCompleted ? colors.textMuted : colors.text,
                                                        textDecorationLine: isCompleted ? "line-through" : "none",
                                                    }]}>
                                                        {task.title}
                                                    </Text>
                                                </View>
                                                <Text style={[s.taskDesc, {
                                                    color: isCompleted ? colors.textMuted : colors.textSecondary,
                                                }]}>
                                                    {task.description}
                                                </Text>
                                            </View>

                                            {/* Time badge */}
                                            <View style={[s.timeBadge, {
                                                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                                            }]}>
                                                <Text style={[s.timeText, { color: colors.textMuted }]}>
                                                    {task.time}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}

                    {/* Ayurvedic Tip */}
                    <View style={[s.tipCard, { backgroundColor: isDark ? colors.tipBg : "#FFFBEB", borderColor: isDark ? colors.tipBorder : "#FEF3C7" }]}>
                        <Text style={s.tipIcon}>💡</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.tipLabel, { color: isDark ? colors.tipLabel : "#B45309" }]}>
                                SEASONAL TIP • {season.emoji} {season.name}
                            </Text>
                            <Text style={[s.tipText, { color: isDark ? colors.tipText : "#92400E" }]}>
                                {season.advice}
                            </Text>
                        </View>
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
        marginBottom: 16,
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
    progressRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    progressSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    progressRing: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 3,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    progressFill: {
        position: "absolute",
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderRadius: 26,
        borderWidth: 3,
    },
    progressText: { fontSize: 13, fontWeight: "800" },
    progressLabel: { fontSize: 18, fontWeight: "800" },
    progressSubLabel: { fontSize: 11, fontWeight: "500" },
    streakBox: {
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
    },
    streakFire: { fontSize: 22 },
    streakNum: { fontSize: 20, fontWeight: "900", marginTop: 2 },
    streakLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
    headerGoldLine: { height: 2, borderRadius: 1, marginTop: 14, opacity: 0.4 },
    body: { paddingHorizontal: 20, paddingTop: 16 },
    doshaTag: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        gap: 8,
    },
    doshaTagEmoji: { fontSize: 16 },
    doshaTagText: { fontSize: 13, fontWeight: "600" },
    periodBlock: { marginBottom: 20 },
    periodHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        gap: 10,
    },
    periodDot: { width: 10, height: 10, borderRadius: 5 },
    periodTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    periodEmoji: { fontSize: 18 },
    periodTitle: { fontSize: 17, fontWeight: "700" },
    periodTime: { fontSize: 12, fontWeight: "500", marginTop: 1 },
    periodBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
    },
    periodBadgeText: { fontSize: 12, fontWeight: "700" },
    taskCard: {
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
        marginLeft: 4,
        overflow: "hidden",
        position: "relative",
    },
    timelineConnector: {
        position: "absolute",
        left: 23,
        top: 52,
        bottom: -12,
        width: 2,
        borderRadius: 1,
    },
    taskRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        gap: 12,
    },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    taskContent: { flex: 1 },
    taskTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    taskEmoji: { fontSize: 16 },
    taskTitle: { fontSize: 15, fontWeight: "700" },
    taskDesc: { fontSize: 12, fontWeight: "500", marginTop: 3, lineHeight: 17 },
    timeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    timeText: { fontSize: 11, fontWeight: "600" },
    tipCard: {
        flexDirection: "row",
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        gap: 12,
        marginTop: 8,
    },
    tipIcon: { fontSize: 20 },
    tipLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
    tipText: { fontSize: 13, fontWeight: "500", lineHeight: 19, marginTop: 4 },
});
