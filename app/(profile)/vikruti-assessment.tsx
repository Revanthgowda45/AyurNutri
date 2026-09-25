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

/* ───────── Symptom Questions ───────── */
type Symptom = {
    id: string;
    emoji: string;
    question: string;
    dosha: "vata" | "pitta" | "kapha";
};

const SYMPTOMS: Symptom[] = [
    // VATA symptoms (4)
    { id: "dry_skin", emoji: "🏜️", question: "Is your skin unusually dry, rough, or flaky recently?", dosha: "vata" },
    { id: "anxiety", emoji: "😰", question: "Are you feeling anxious, worried, or restless lately?", dosha: "vata" },
    { id: "bloating", emoji: "🫃", question: "Do you have gas, bloating, or irregular digestion?", dosha: "vata" },
    { id: "insomnia", emoji: "😵‍💫", question: "Are you having trouble falling or staying asleep?", dosha: "vata" },
    // PITTA symptoms (4)
    { id: "acid_reflux", emoji: "🔥", question: "Do you have acid reflux, heartburn, or burning sensation?", dosha: "pitta" },
    { id: "irritability", emoji: "😤", question: "Are you feeling irritable, angry, or impatient?", dosha: "pitta" },
    { id: "skin_inflammation", emoji: "🔴", question: "Do you have skin rashes, acne, or inflammation?", dosha: "pitta" },
    { id: "excessive_heat", emoji: "🥵", question: "Are you feeling excessively hot or sweating more than usual?", dosha: "pitta" },
    // KAPHA symptoms (4)
    { id: "lethargy", emoji: "😴", question: "Are you feeling sluggish, lethargic, or unmotivated?", dosha: "kapha" },
    { id: "congestion", emoji: "🤧", question: "Do you have nasal congestion, mucus, or sinus issues?", dosha: "kapha" },
    { id: "weight_gain", emoji: "⚖️", question: "Have you gained weight or feel heavy/swollen recently?", dosha: "kapha" },
    { id: "depression", emoji: "😔", question: "Are you feeling emotionally low, attached, or stuck?", dosha: "kapha" },
];

const SEVERITY_OPTIONS = [
    { value: 0, label: "Not at all", emoji: "✅", color: "#10B981" },
    { value: 1, label: "Mild", emoji: "🟡", color: "#F59E0B" },
    { value: 2, label: "Moderate", emoji: "🟠", color: "#F97316" },
    { value: 3, label: "Severe", emoji: "🔴", color: "#EF4444" },
];

/* ───────── Imbalance Descriptions ───────── */
const IMBALANCE_INFO: Record<string, {
    emoji: string;
    color: string;
    description: string;
    dietAdvice: string;
    lifestyleAdvice: string;
    herbs: string[];
}> = {
    Vata: {
        emoji: "🌬️",
        color: "#5B8FB9",
        description: "Vata is aggravated — you're experiencing dryness, irregularity, anxiety, and restlessness. Your body needs grounding and warmth.",
        dietAdvice: "Eat warm, cooked, oily foods. Favor sweet, sour, salty tastes. Avoid cold, raw, dry foods. Regular meal times are crucial.",
        lifestyleAdvice: "Maintain a strict daily routine. Warm oil self-massage (Abhyanga). Gentle yoga, not vigorous exercise. Early bedtime.",
        herbs: ["Ashwagandha", "Triphala", "Ginger", "Dashmool"],
    },
    Pitta: {
        emoji: "🔥",
        color: "#EF4444",
        description: "Pitta is aggravated — you're experiencing heat, inflammation, irritability, and acid reflux. Your body needs cooling and calming.",
        dietAdvice: "Eat cooling, sweet, bitter foods. Avoid spicy, sour, fermented foods. Include coconut, cucumber, mint, ghee. Don't skip meals.",
        lifestyleAdvice: "Avoid midday sun and overexertion. Moonlight walks. Cool showers. Meditation to calm the mind. Avoid competitive situations.",
        herbs: ["Amalaki", "Brahmi", "Shatavari", "Neem"],
    },
    Kapha: {
        emoji: "🌿",
        color: "#6A994E",
        description: "Kapha is aggravated — you're experiencing heaviness, lethargy, congestion, and emotional stagnation. Your body needs stimulation and lightness.",
        dietAdvice: "Eat light, warm, spiced foods. Favor pungent, bitter, astringent tastes. Avoid heavy, oily, sweet, dairy foods. Skip or lighten breakfast.",
        lifestyleAdvice: "Vigorous daily exercise. No daytime naps. Dry brushing before bath. Wake before 6 AM. Seek new experiences and social stimulation.",
        herbs: ["Trikatu", "Guggulu", "Punarnava", "Tulsi"],
    },
    Balanced: {
        emoji: "✨",
        color: "#10B981",
        description: "Your doshas are well-balanced! No significant imbalance detected. Your current diet and lifestyle appear to be working well.",
        dietAdvice: "Continue your current balanced diet. Eat seasonal, fresh, sattvic foods. Maintain regular meal times.",
        lifestyleAdvice: "Keep up your daily routine (Dinacharya). Regular exercise, meditation, and good sleep hygiene.",
        herbs: ["Chyawanprash", "Triphala", "Turmeric"],
    },
};

/* ───────── Component ───────── */
export default function VikrutiAssessmentScreen() {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();
    const uid = user?.uid || "";

    const today = new Date().toISOString().split("T")[0];

    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [currentStep, setCurrentStep] = useState(0); // 0-11
    const [showResult, setShowResult] = useState(false);
    const [prakruti, setPrakruti] = useState<string | undefined>(undefined);
    const [vikrutiResult, setVikrutiResult] = useState<firestoreDB.VikrutiLog | null>(null);
    const [previousVikruti, setPreviousVikruti] = useState<firestoreDB.VikrutiLog | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const resultScale = useRef(new Animated.Value(0)).current;

    const totalQuestions = SYMPTOMS.length;
    const answeredCount = Object.keys(answers).length;
    const progress = answeredCount / totalQuestions;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (!uid) return;
        // Get user's Prakruti (birth constitution)
        const unsubDosha = firestoreDB.subscribeToDoshaResult(uid, (d) => {
            setPrakruti(d?.doshaType || undefined);
        });
        // Get previous Vikruti for comparison
        const unsubVikruti = firestoreDB.subscribeToLatestVikruti(uid, (v) => {
            setPreviousVikruti(v);
            // Auto-show result if they already took it recently
            if (v) {
                setVikrutiResult(v);
                setShowResult(true);
                Animated.spring(resultScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
            }
        });
        return () => { unsubDosha(); unsubVikruti(); };
    }, [uid]);

    const animateToQuestion = (newStep: number) => {
        Animated.timing(slideAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start(() => {
            setCurrentStep(newStep);
            slideAnim.setValue(0);
            Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
        });
    };

    const selectSeverity = (symptomId: string, severity: number) => {
        if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setAnswers({ ...answers, [symptomId]: severity });

        // Auto-advance after a short delay
        if (currentStep < totalQuestions - 1) {
            setTimeout(() => animateToQuestion(currentStep + 1), 300);
        }
    };

    const calculateResult = () => {
        let vataScore = 0, pittaScore = 0, kaphaScore = 0;
        let vataMax = 0, pittaMax = 0, kaphaMax = 0;
        const activeSymptoms: string[] = [];

        SYMPTOMS.forEach((s) => {
            const severity = answers[s.id] || 0;
            if (s.dosha === "vata") { vataScore += severity; vataMax += 3; }
            if (s.dosha === "pitta") { pittaScore += severity; pittaMax += 3; }
            if (s.dosha === "kapha") { kaphaScore += severity; kaphaMax += 3; }
            if (severity >= 2) activeSymptoms.push(s.question);
        });

        // Convert to percentages
        const vataPct = Math.round((vataScore / vataMax) * 100);
        const pittaPct = Math.round((pittaScore / pittaMax) * 100);
        const kaphaPct = Math.round((kaphaScore / kaphaMax) * 100);

        // Determine dominant imbalance
        let dominant = "Balanced";
        const threshold = 40; // 40% = significant imbalance
        if (vataPct >= threshold || pittaPct >= threshold || kaphaPct >= threshold) {
            if (vataPct >= pittaPct && vataPct >= kaphaPct) dominant = "Vata";
            else if (pittaPct >= vataPct && pittaPct >= kaphaPct) dominant = "Pitta";
            else dominant = "Kapha";
        }

        return { vataPct, pittaPct, kaphaPct, dominant, activeSymptoms };
    };

    const handleSubmit = async () => {
        if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const { vataPct, pittaPct, kaphaPct, dominant, activeSymptoms } = calculateResult();

        const result: firestoreDB.VikrutiLog = {
            vataScore: vataPct,
            pittaScore: pittaPct,
            kaphaScore: kaphaPct,
            dominantImbalance: dominant,
            symptoms: activeSymptoms,
            date: today,
        };

        setVikrutiResult(result);
        setShowResult(true);

        Animated.spring(resultScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();

        await firestoreDB.saveVikrutiLog(uid, today, result);
    };

    const currentSymptom = SYMPTOMS[currentStep];
    const imbalanceInfo = vikrutiResult ? (IMBALANCE_INFO[vikrutiResult.dominantImbalance] || IMBALANCE_INFO.Balanced) : null;

    // Check if Prakruti and Vikruti mismatch (this is the key insight!)
    const hasMismatch = vikrutiResult && prakruti &&
        vikrutiResult.dominantImbalance !== "Balanced" &&
        !prakruti.includes(vikrutiResult.dominantImbalance);

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
                            {t("vikruti_assessment") || "Current Imbalance"}
                        </Text>
                        <Text style={[s.headerSub, { color: isDark ? colors.textSecondary : colors.textOnHeaderSub }]}>
                            {t("vikruti_sub") || "Prakruti vs Vikruti Analysis"}
                        </Text>
                    </View>
                </View>

                {/* Progress Bar */}
                {!showResult && (
                    <View style={s.progressRow}>
                        <View style={[s.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)" }]}>
                            <View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.gold }]} />
                        </View>
                        <Text style={[s.progressText, { color: isDark ? colors.textSecondary : colors.textOnHeaderSub }]}>
                            {answeredCount}/{totalQuestions}
                        </Text>
                    </View>
                )}

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
                    {!showResult ? (
                        <>
                            {/* ─── Intro Card ─── */}
                            <View style={[s.introCard, { backgroundColor: isDark ? "rgba(139,92,246,0.06)" : "#F5F3FF", borderColor: isDark ? "rgba(139,92,246,0.12)" : "#EDE9FE" }]}>
                                <Text style={s.introEmoji}>⚖️</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.introTitle, { color: isDark ? "#A78BFA" : "#6D28D9" }]}>
                                        How are you feeling this week?
                                    </Text>
                                    <Text style={[s.introText, { color: isDark ? "#C4B5FD" : "#7C3AED" }]}>
                                        Rate each symptom based on the past 7 days. This tells the AI if your meals are working and what to adjust.
                                    </Text>
                                </View>
                            </View>

                            {/* ─── Question Card ─── */}
                            <View style={[s.questionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                {/* Question Counter */}
                                <View style={s.questionCounter}>
                                    <Text style={[s.questionNum, { color: colors.gold }]}>
                                        Q{currentStep + 1}
                                    </Text>
                                    <Text style={[s.questionOf, { color: colors.textMuted }]}>
                                        of {totalQuestions}
                                    </Text>
                                    <View style={[s.doshaPill, {
                                        backgroundColor: currentSymptom.dosha === "vata" ? "#5B8FB920" :
                                            currentSymptom.dosha === "pitta" ? "#EF444420" : "#6A994E20",
                                    }]}>
                                        <Text style={[s.doshaPillText, {
                                            color: currentSymptom.dosha === "vata" ? "#5B8FB9" :
                                                currentSymptom.dosha === "pitta" ? "#EF4444" : "#6A994E",
                                        }]}>
                                            {currentSymptom.dosha.charAt(0).toUpperCase() + currentSymptom.dosha.slice(1)} indicator
                                        </Text>
                                    </View>
                                </View>

                                {/* Question */}
                                <Text style={s.questionEmoji}>{currentSymptom.emoji}</Text>
                                <Text style={[s.questionText, { color: colors.text }]}>
                                    {currentSymptom.question}
                                </Text>

                                {/* Severity Options */}
                                <View style={s.severityGrid}>
                                    {SEVERITY_OPTIONS.map((opt) => {
                                        const isSelected = answers[currentSymptom.id] === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[s.severityBtn, {
                                                    backgroundColor: isSelected
                                                        ? `${opt.color}18`
                                                        : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"),
                                                    borderColor: isSelected ? opt.color : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                                                    borderWidth: isSelected ? 2 : 1,
                                                }]}
                                                onPress={() => selectSeverity(currentSymptom.id, opt.value)}
                                            >
                                                <Text style={s.severityEmoji}>{opt.emoji}</Text>
                                                <Text style={[s.severityLabel, { color: isSelected ? opt.color : colors.textMuted }]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Navigation */}
                                <View style={s.navRow}>
                                    <TouchableOpacity
                                        style={[s.navBtn, { opacity: currentStep === 0 ? 0.3 : 1 }]}
                                        disabled={currentStep === 0}
                                        onPress={() => animateToQuestion(currentStep - 1)}
                                    >
                                        <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                                        <Text style={[s.navBtnText, { color: colors.textMuted }]}>Previous</Text>
                                    </TouchableOpacity>

                                    {currentStep < totalQuestions - 1 ? (
                                        <TouchableOpacity
                                            style={s.navBtn}
                                            onPress={() => animateToQuestion(currentStep + 1)}
                                        >
                                            <Text style={[s.navBtnText, { color: colors.gold }]}>Next</Text>
                                            <Ionicons name="chevron-forward" size={18} color={colors.gold} />
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={[s.submitBtn, {
                                                backgroundColor: answeredCount >= totalQuestions - 2 ? colors.primaryBtn : colors.divider,
                                                opacity: answeredCount >= totalQuestions - 2 ? 1 : 0.5,
                                            }]}
                                            disabled={answeredCount < totalQuestions - 2}
                                            onPress={handleSubmit}
                                        >
                                            <Ionicons name="analytics" size={18} color={colors.primaryBtnText} />
                                            <Text style={[s.submitBtnText, { color: colors.primaryBtnText }]}>Analyze</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* ─── Quick-Jump Dots ─── */}
                            <View style={s.dotsRow}>
                                {SYMPTOMS.map((sym, i) => {
                                    const isActive = i === currentStep;
                                    const isAnswered = answers[sym.id] !== undefined;
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[s.dot, {
                                                backgroundColor: isActive ? colors.gold
                                                    : isAnswered ? "#10B981"
                                                    : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
                                                width: isActive ? 20 : 8,
                                            }]}
                                            onPress={() => setCurrentStep(i)}
                                        />
                                    );
                                })}
                            </View>
                        </>
                    ) : vikrutiResult && imbalanceInfo ? (
                        /* ─── RESULT SECTION ─── */
                        <Animated.View style={{ transform: [{ scale: resultScale }] }}>
                            {/* Prakruti vs Vikruti Comparison */}
                            <View style={[s.comparisonCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                <Text style={[s.compTitle, { color: colors.text }]}>⚖️ Prakruti vs Vikruti</Text>
                                <Text style={[s.compSub, { color: colors.textSecondary }]}>
                                    Your birth constitution vs current state
                                </Text>

                                <View style={s.compRow}>
                                    {/* Prakruti Side */}
                                    <View style={[s.compSide, { backgroundColor: isDark ? "rgba(16,185,129,0.06)" : "#F0FDF4", borderColor: isDark ? "rgba(16,185,129,0.12)" : "#D1FAE5" }]}>
                                        <Text style={s.compSideEmoji}>🧬</Text>
                                        <Text style={[s.compSideLabel, { color: "#10B981" }]}>PRAKRUTI</Text>
                                        <Text style={[s.compSideValue, { color: colors.text }]}>
                                            {prakruti || "Unknown"}
                                        </Text>
                                        <Text style={[s.compSideDesc, { color: colors.textMuted }]}>Birth Constitution</Text>
                                    </View>

                                    {/* VS Divider */}
                                    <View style={s.vsDivider}>
                                        <Text style={[s.vsText, { color: colors.textMuted }]}>vs</Text>
                                    </View>

                                    {/* Vikruti Side */}
                                    <View style={[s.compSide, { backgroundColor: `${imbalanceInfo.color}08`, borderColor: `${imbalanceInfo.color}20` }]}>
                                        <Text style={s.compSideEmoji}>{imbalanceInfo.emoji}</Text>
                                        <Text style={[s.compSideLabel, { color: imbalanceInfo.color }]}>VIKRUTI</Text>
                                        <Text style={[s.compSideValue, { color: colors.text }]}>
                                            {vikrutiResult.dominantImbalance}
                                        </Text>
                                        <Text style={[s.compSideDesc, { color: colors.textMuted }]}>Current State</Text>
                                    </View>
                                </View>

                                {/* Mismatch Alert */}
                                {hasMismatch && (
                                    <View style={[s.mismatchAlert, { backgroundColor: isDark ? "rgba(245,158,11,0.08)" : "#FFFBEB", borderColor: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7" }]}>
                                        <Text style={s.mismatchEmoji}>⚠️</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.mismatchTitle, { color: isDark ? "#FBBF24" : "#B45309" }]}>
                                                Imbalance Detected
                                            </Text>
                                            <Text style={[s.mismatchText, { color: isDark ? "#FDE68A" : "#92400E" }]}>
                                                Your base is {prakruti} but {vikrutiResult.dominantImbalance} is currently aggravated.
                                                The AI will adjust your next meal plan to correct this.
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {vikrutiResult.dominantImbalance === "Balanced" && (
                                    <View style={[s.mismatchAlert, { backgroundColor: isDark ? "rgba(16,185,129,0.06)" : "#F0FDF4", borderColor: isDark ? "rgba(16,185,129,0.12)" : "#D1FAE5" }]}>
                                        <Text style={s.mismatchEmoji}>✨</Text>
                                        <Text style={[s.mismatchText, { color: isDark ? "#6EE7B7" : "#065F46", flex: 1 }]}>
                                            Your doshas are well-balanced! Your current diet and lifestyle are working. Keep going!
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Dosha Bars */}
                            <View style={[s.barsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                <Text style={[s.barsTitle, { color: colors.text }]}>📊 Imbalance Levels</Text>
                                {[
                                    { label: "Vata", score: vikrutiResult.vataScore, emoji: "🌬️", color: "#5B8FB9" },
                                    { label: "Pitta", score: vikrutiResult.pittaScore, emoji: "🔥", color: "#EF4444" },
                                    { label: "Kapha", score: vikrutiResult.kaphaScore, emoji: "🌿", color: "#6A994E" },
                                ].map((item) => (
                                    <View key={item.label} style={s.barRow}>
                                        <View style={s.barLabel}>
                                            <Text style={s.barEmoji}>{item.emoji}</Text>
                                            <Text style={[s.barName, { color: colors.text }]}>{item.label}</Text>
                                            <Text style={[s.barPct, { color: item.color }]}>{item.score}%</Text>
                                        </View>
                                        <View style={[s.barTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
                                            <View style={[s.barFill, {
                                                width: `${item.score}%`,
                                                backgroundColor: item.color,
                                                opacity: item.score >= 40 ? 1 : 0.5,
                                            }]} />
                                        </View>
                                        {item.score >= 40 && (
                                            <Text style={[s.barAlert, { color: item.color }]}>⚠ Aggravated</Text>
                                        )}
                                    </View>
                                ))}
                            </View>

                            {/* Description + Advice */}
                            <View style={[s.adviceCard, { backgroundColor: colors.card, borderColor: `${imbalanceInfo.color}25` }]}>
                                <View style={[s.adviceBadge, { backgroundColor: `${imbalanceInfo.color}12` }]}>
                                    <Text style={s.adviceEmoji}>{imbalanceInfo.emoji}</Text>
                                    <Text style={[s.adviceName, { color: imbalanceInfo.color }]}>
                                        {vikrutiResult.dominantImbalance === "Balanced" ? "Balanced State" : `${vikrutiResult.dominantImbalance} Aggravation`}
                                    </Text>
                                </View>

                                <Text style={[s.adviceDesc, { color: colors.textSecondary }]}>
                                    {imbalanceInfo.description}
                                </Text>

                                {/* Diet Advice */}
                                <View style={[s.adviceSection, { borderColor: colors.divider }]}>
                                    <Text style={[s.adviceSectionTitle, { color: colors.text }]}>🥗 Diet Correction</Text>
                                    <Text style={[s.adviceSectionText, { color: colors.textSecondary }]}>{imbalanceInfo.dietAdvice}</Text>
                                </View>

                                {/* Lifestyle Advice */}
                                <View style={[s.adviceSection, { borderColor: colors.divider }]}>
                                    <Text style={[s.adviceSectionTitle, { color: colors.text }]}>🧘 Lifestyle Correction</Text>
                                    <Text style={[s.adviceSectionText, { color: colors.textSecondary }]}>{imbalanceInfo.lifestyleAdvice}</Text>
                                </View>

                                {/* Herbs */}
                                <Text style={[s.adviceSectionTitle, { color: colors.text, marginTop: 14 }]}>🌿 Recommended Herbs</Text>
                                <View style={s.herbsRow}>
                                    {imbalanceInfo.herbs.map((herb) => (
                                        <View key={herb} style={[s.herbPill, { backgroundColor: `${imbalanceInfo.color}10`, borderColor: `${imbalanceInfo.color}25` }]}>
                                            <Text style={[s.herbText, { color: imbalanceInfo.color }]}>{herb}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* AI Feedback Info */}
                            <View style={[s.aiCard, { backgroundColor: isDark ? "rgba(59,130,246,0.06)" : "#EFF6FF", borderColor: isDark ? "rgba(59,130,246,0.12)" : "#DBEAFE" }]}>
                                <Text style={s.aiEmoji}>🤖</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.aiTitle, { color: isDark ? "#93C5FD" : "#1D4ED8" }]}>
                                        AI Meal Plan Updated
                                    </Text>
                                    <Text style={[s.aiText, { color: isDark ? "#BFDBFE" : "#1E40AF" }]}>
                                        Your next meal plan will automatically adjust to {vikrutiResult.dominantImbalance === "Balanced"
                                            ? "maintain your balanced state"
                                            : `pacify your ${vikrutiResult.dominantImbalance} aggravation`
                                        }. Generate a new plan to see the changes.
                                    </Text>
                                </View>
                            </View>

                            {/* Retake / Go to Meal Plan buttons */}
                            <View style={s.actionRow}>
                                <TouchableOpacity
                                    style={[s.actionBtn, { borderColor: colors.cardBorder }]}
                                    onPress={() => {
                                        setShowResult(false);
                                        setAnswers({});
                                        setCurrentStep(0);
                                        setVikrutiResult(null);
                                    }}
                                >
                                    <Ionicons name="refresh" size={18} color={colors.textMuted} />
                                    <Text style={[s.actionBtnText, { color: colors.textMuted }]}>Retake</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[s.actionBtnPrimary, { backgroundColor: colors.primaryBtn }]}
                                    onPress={() => router.push("/(tabs)/meal-plan")}
                                >
                                    <Ionicons name="restaurant" size={18} color={colors.primaryBtnText} />
                                    <Text style={[s.actionBtnPrimaryText, { color: colors.primaryBtnText }]}>
                                        Update Meal Plan
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    ) : null}

                    <View style={{ height: 120 }} />
                </ScrollView>
            </Animated.View>
        </View>
    );
}

/* ───────── Styles ───────── */
const s = StyleSheet.create({
    screen: { flex: 1 },
    header: { paddingTop: SAFE_TOP_PADDING, paddingHorizontal: 20, paddingBottom: 16 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
    headerSub: { fontSize: 13, marginTop: 2, fontWeight: "500" },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
    progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 3 },
    progressText: { fontSize: 12, fontWeight: "700" },
    headerGoldLine: { height: 2, borderRadius: 1, marginTop: 14, opacity: 0.4 },
    body: { paddingHorizontal: 20, paddingTop: 16 },

    /* Intro */
    introCard: { flexDirection: "row", padding: 16, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 16 },
    introEmoji: { fontSize: 28 },
    introTitle: { fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
    introText: { fontSize: 13, fontWeight: "500", lineHeight: 19, marginTop: 4 },

    /* Question */
    questionCard: { borderRadius: 18, borderWidth: 1, padding: 24, marginBottom: 16 },
    questionCounter: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
    questionNum: { fontSize: 16, fontWeight: "900" },
    questionOf: { fontSize: 14, fontWeight: "500" },
    doshaPill: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    doshaPillText: { fontSize: 11, fontWeight: "700" },
    questionEmoji: { fontSize: 42, textAlign: "center", marginBottom: 12 },
    questionText: { fontSize: 18, fontWeight: "700", textAlign: "center", lineHeight: 26 },
    severityGrid: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 24 },
    severityBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14 },
    severityEmoji: { fontSize: 22 },
    severityLabel: { fontSize: 10, fontWeight: "700", marginTop: 6, letterSpacing: 0.3 },
    navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
    navBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 12 },
    navBtnText: { fontSize: 14, fontWeight: "600" },
    submitBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
    submitBtnText: { fontSize: 15, fontWeight: "800" },

    /* Dots */
    dotsRow: { flexDirection: "row", justifyContent: "center", gap: 4, marginBottom: 20 },
    dot: { height: 8, borderRadius: 4 },

    /* Comparison */
    comparisonCard: { borderRadius: 18, borderWidth: 1, padding: 20, marginBottom: 16 },
    compTitle: { fontSize: 20, fontWeight: "800" },
    compSub: { fontSize: 13, fontWeight: "500", marginTop: 4, marginBottom: 16 },
    compRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    compSide: { flex: 1, alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1 },
    compSideEmoji: { fontSize: 28 },
    compSideLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 8 },
    compSideValue: { fontSize: 18, fontWeight: "900", marginTop: 4 },
    compSideDesc: { fontSize: 11, fontWeight: "500", marginTop: 2 },
    vsDivider: { paddingHorizontal: 4 },
    vsText: { fontSize: 14, fontWeight: "700" },
    mismatchAlert: { flexDirection: "row", padding: 14, borderRadius: 12, borderWidth: 1, gap: 10, marginTop: 14 },
    mismatchEmoji: { fontSize: 18 },
    mismatchTitle: { fontSize: 13, fontWeight: "800" },
    mismatchText: { fontSize: 13, fontWeight: "500", lineHeight: 19, marginTop: 2 },

    /* Bars */
    barsCard: { borderRadius: 18, borderWidth: 1, padding: 20, marginBottom: 16 },
    barsTitle: { fontSize: 18, fontWeight: "800", marginBottom: 14 },
    barRow: { marginBottom: 14 },
    barLabel: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    barEmoji: { fontSize: 18 },
    barName: { fontSize: 15, fontWeight: "700", flex: 1 },
    barPct: { fontSize: 15, fontWeight: "800" },
    barTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 5 },
    barAlert: { fontSize: 11, fontWeight: "700", marginTop: 4 },

    /* Advice */
    adviceCard: { borderRadius: 18, borderWidth: 1.5, padding: 20, marginBottom: 16 },
    adviceBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, marginBottom: 14 },
    adviceEmoji: { fontSize: 24 },
    adviceName: { fontSize: 16, fontWeight: "800" },
    adviceDesc: { fontSize: 14, fontWeight: "500", lineHeight: 21, marginBottom: 14 },
    adviceSection: { borderTopWidth: 1, paddingTop: 14, marginBottom: 10 },
    adviceSectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
    adviceSectionText: { fontSize: 13, fontWeight: "500", lineHeight: 20 },
    herbsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    herbPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
    herbText: { fontSize: 13, fontWeight: "700" },

    /* AI Card */
    aiCard: { flexDirection: "row", padding: 16, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 16 },
    aiEmoji: { fontSize: 24 },
    aiTitle: { fontSize: 14, fontWeight: "800" },
    aiText: { fontSize: 13, fontWeight: "500", lineHeight: 19, marginTop: 4 },

    /* Actions */
    actionRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
    actionBtnText: { fontSize: 14, fontWeight: "600" },
    actionBtnPrimary: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14 },
    actionBtnPrimaryText: { fontSize: 15, fontWeight: "800" },
});
