import { useAuth } from "@/context/AuthContext";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as firestoreDB from "@/services/firestoreService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
} from "react-native";

const { width } = Dimensions.get("window");

/* ───────── QUESTION DATA ───────── */
type Question = {
  section: "physical" | "mental";
  title: string;
  emoji: string;
  image?: any;
  options: { label: string; dosha: "vata" | "pitta" | "kapha"; image?: any }[];
};

const QUESTIONS: Question[] = [
  // ═══ PHYSICAL (10) ═══
  {
    section: "physical",
    title: "Body Frame",
    emoji: "🏋️",
    options: [
      {
        label: "Thin, bony and small framed. Hardly gain weight.",
        dosha: "vata",
      },
      {
        label: "Medium built. Can gain or lose weight easily.",
        dosha: "pitta",
      },
      {
        label: "Large built. Gain weight easily but difficult to lose.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "physical",
    title: "Walk & Talk",
    emoji: "🚶",
    options: [
      { label: "Fast walk and talk.", dosha: "vata" },
      { label: "Moderate and determined walk.", dosha: "pitta" },
      { label: "Slow and steady walk.", dosha: "kapha" },
    ],
  },
  {
    section: "physical",
    title: "Weather Reaction",
    emoji: "🌦️",
    options: [
      {
        label: "Enjoy warm climate but feel uncomfortable in cool weather.",
        dosha: "vata",
      },
      { label: "Enjoy cool weather and dislike warm climate.", dosha: "pitta" },
      {
        label:
          "Comfortable for most of year but prefer summer. Don't like damp climate.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "physical",
    title: "Sweating",
    emoji: "💧",
    options: [
      {
        label: "Sweat little but not much. Minimal body odour.",
        dosha: "vata",
      },
      { label: "Sweat a lot. Medium body odour.", dosha: "pitta" },
      {
        label:
          "Sweat moderately but a lot when working hard. Strong body odour.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "physical",
    title: "Appetite",
    emoji: "🍽️",
    options: [
      { label: "Irregular. Sometimes hungry, sometimes not.", dosha: "vata" },
      { label: "Strong and sharp. Always feel hungry.", dosha: "pitta" },
      {
        label: "Decent appetite. Tendency to eat for comfort and taste.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "physical",
    title: "Skin",
    emoji: "✋",
    options: [
      {
        label:
          "Normal to dry, rough, thin and cool. Issues like dryness, dullness, wrinkles.",
        dosha: "vata",
      },
      {
        label:
          "Normal to oily, soft, reddish, sensitive and warm. Issues like inflammation.",
        dosha: "pitta",
      },
      {
        label:
          "Normal to oily, soft, thick and cool. Issues like excessive oiliness, itching.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "physical",
    title: "Hair",
    emoji: "💇",
    options: [
      { label: "Rough, dry and wavy. Get split ends easily.", dosha: "vata" },
      { label: "Normal, straight, thin and brownish.", dosha: "pitta" },
      {
        label: "Thick, curly and oily. Hair colour tends to be on darker side.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "physical",
    title: "Lips & Teeth",
    emoji: "😁",
    options: [
      {
        label: "Thin lips that tend to get dry. Teeth can be somewhat uneven.",
        dosha: "vata",
      },
      {
        label:
          "Medium soft lips. Teeth are medium sized, tend to suffer from cavities.",
        dosha: "pitta",
      },
      {
        label: "Large and smooth lips. Teeth are well formed and aligned.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "physical",
    title: "Eyes",
    emoji: "👁️",
    options: [
      {
        label: "Small in size. Feel dry and sleepy eyes often. Blink a lot.",
        dosha: "vata",
      },
      { label: "Medium in size. Often get reddish eyes.", dosha: "pitta" },
      { label: "Big and attractive. Have thick eye lashes.", dosha: "kapha" },
    ],
  },
  {
    section: "physical",
    title: "General Signs",
    emoji: "🔍",
    options: [
      {
        label: "Cracking sound in joints. Small forehead. Nails crack easily.",
        dosha: "vata",
      },
      {
        label: "Black moles on body. Medium forehead. Nails are pink and soft.",
        dosha: "pitta",
      },
      {
        label:
          "Disproportionate body. Large forehead. Nails are wide and whitish.",
        dosha: "kapha",
      },
    ],
  },
  // ═══ MENTAL / EMOTIONAL (5) ═══
  {
    section: "mental",
    title: "Memory",
    emoji: "🧠",
    options: [
      {
        label: "Quick to learn but quick to forget. Short term memory is good.",
        dosha: "vata",
      },
      {
        label: "Average speed of learning. But once learnt, never forgets.",
        dosha: "pitta",
      },
      {
        label:
          "Slow to learn but remembers for a long time. Long term memory is good.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "mental",
    title: "Mind",
    emoji: "🧘",
    options: [
      { label: "Mind tends to get restless easily.", dosha: "vata" },
      { label: "Mind gets impatient or aggressive easily.", dosha: "pitta" },
      {
        label: "Mind remains cool and calm. Mostly unruffled.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "mental",
    title: "Mind on Actions",
    emoji: "⚡",
    options: [
      { label: "Over thinking.", dosha: "vata" },
      { label: "Quick implementation.", dosha: "pitta" },
      {
        label: "Lazy implementation. Tendency to procrastinate.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "mental",
    title: "Sleep Quality",
    emoji: "😴",
    options: [
      {
        label: "Light and disturbed sleep. Wake up easily in morning.",
        dosha: "vata",
      },
      {
        label: "Moderate but regular. Can go back to sleep easily.",
        dosha: "pitta",
      },
      {
        label: "Deep and heavy. Can't easily wake up in morning.",
        dosha: "kapha",
      },
    ],
  },
  {
    section: "mental",
    title: "Emotional Nature",
    emoji: "💛",
    options: [
      { label: "Worry a lot. Often feel nervous and anxious.", dosha: "vata" },
      { label: "Often get irritable, angry and impatient.", dosha: "pitta" },
      {
        label: "Loving and caring. It takes a lot to make me angry.",
        dosha: "kapha",
      },
    ],
  },
];

/* ───── DOSHA COLORS ───── */
const DOSHA_COLORS: Record<string, string> = {
  Vata: "#5B8FB9",
  Pitta: "#E07A5F",
  Kapha: "#6A994E",
  "Vata-Pitta": "#9B5DE5",
  "Pitta-Kapha": "#D4A24E",
  "Vata-Kapha": "#40916C",
  Tridosha: "#1B4332",
};
const DOSHA_EMOJIS: Record<string, string> = {
  Vata: "🌬️",
  Pitta: "🔥",
  Kapha: "🌿",
  "Vata-Pitta": "🌬️🔥",
  "Pitta-Kapha": "🔥🌿",
  "Vata-Kapha": "🌬️🌿",
  Tridosha: "☯️",
};
const DOSHA_ELEMENTS: Record<string, string> = {
  Vata: "Air + Space",
  Pitta: "Fire + Water",
  Kapha: "Earth + Water",
  "Vata-Pitta": "Air + Fire",
  "Pitta-Kapha": "Fire + Earth",
  "Vata-Kapha": "Air + Earth",
  Tridosha: "All Five Elements",
};

/* ───── SCORING LOGIC ───── */
function calculateResult(
  answers: Record<number, "vata" | "pitta" | "kapha">,
): string {
  let v = 0,
    p = 0,
    k = 0;
  Object.values(answers).forEach((d) => {
    if (d === "vata") v++;
    else if (d === "pitta") p++;
    else k++;
  });
  const total = v + p + k;
  const threshold = total * 0.45;
  if (v >= threshold && p < threshold && k < threshold) return "Vata";
  if (p >= threshold && v < threshold && k < threshold) return "Pitta";
  if (k >= threshold && v < threshold && p < threshold) return "Kapha";
  if (v >= p && v >= k && p > k) return "Vata-Pitta";
  if (p >= v && p >= k && k > v) return "Pitta-Kapha";
  if (v >= p && k >= p && v <= k + 2 && k <= v + 2) return "Vata-Kapha";
  if (Math.abs(v - p) <= 1 && Math.abs(p - k) <= 1) return "Tridosha";
  if (v >= p && v >= k) return "Vata";
  if (p >= v && p >= k) return "Pitta";
  return "Kapha";
}

/* ═══════════════ AI RESULT SECTION ═══════════════ */
type AIAnalysis = {
  summary: string;
  strengths: string[];
  challenges: string[];
  dietTips: string[];
  lifestyleTips: string[];
  yogaPoses: string[];
  herbs: string[];
  seasonalAdvice: string;
};

/* ═══════════════════════ SCREEN ═══════════════════════ */
export default function DoshaAssessmentScreen() {
  const router = useRouter();
  const { retake } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const uid = user?.uid || "";

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<
    Record<number, "vata" | "pitta" | "kapha">
  >({});
  const [result, setResult] = useState<string | null>(null);
  const [hasTaken, setHasTaken] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!uid || retake === "true") return;
    firestoreDB.getDoshaResult(uid).then((d) => {
      if (d) {
        console.log("[DoshaAssessment] Loading existing result for:", uid);
        setResult(d.doshaType);
        setHasTaken(true);
        if (d.aiAnalysis) {
          // AI analysis removed
        }
        // Restore answers object from array
        if (d.answers && Array.isArray(d.answers)) {
          const restored: Record<number, "vata" | "pitta" | "kapha"> = {};
          d.answers.forEach((ans: any, i: number) => {
            restored[i] = ans;
          });
          setAnswers(restored);
        }
      }
    });
  }, [uid, retake]);

  const q = QUESTIONS[currentQ];
  const progress = (currentQ + 1) / QUESTIONS.length;
  const isPhysical = q?.section === "physical";

  const animateTransition = (direction: number, callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction * -50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction * 50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const selectOption = async (dosha: "vata" | "pitta" | "kapha") => {
    const newAnswers = { ...answers, [currentQ]: dosha };
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      animateTransition(1, () => setCurrentQ(currentQ + 1));
    } else {
      
      const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
      const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || defaultUrl;
      
      let doshaResult = "";
      let vS = 0, pS = 0, kS = 0;
      
      try {
        const payload = {
          body_frame: newAnswers[0] || 'vata',
          walk_and_talk: newAnswers[1] || 'vata',
          weather_reaction: newAnswers[2] || 'vata',
          sweating: newAnswers[3] || 'vata',
          appetite: newAnswers[4] || 'vata',
          skin: newAnswers[5] || 'vata',
          hair: newAnswers[6] || 'vata',
          lips_and_teeth: newAnswers[7] || 'vata',
          eyes: newAnswers[8] || 'vata',
          general_signs: newAnswers[9] || 'vata',
          memory: newAnswers[10] || 'vata',
          mind: newAnswers[11] || 'vata',
          mind_on_actions: newAnswers[12] || 'vata',
          sleep_quality: newAnswers[13] || 'vata',
          emotional_nature: newAnswers[14] || 'vata'
        };

        const response = await fetch(`${API_URL}/api/assess-dosha/`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Bypass-Tunnel-Reminder': 'true'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("Backend API failed");
        const json = await response.json();
        
        doshaResult = json.dominant_dosha || calculateResult(newAnswers);
        
      } catch (apiError) {
        console.error("ML Backend failed, using local calculation:", apiError);
        doshaResult = calculateResult(newAnswers);
      }

      setResult(doshaResult);

      Object.values(newAnswers).forEach((d) => {
        if (d === "vata") vS++;
        else if (d === "pitta") pS++;
        else kS++;
      });

      try {
        await firestoreDB.saveDoshaResult(uid, {
          doshaType: doshaResult,
          vataScore: vS,
          pittaScore: pS,
          kaphaScore: kS,
          aiAnalysis: "",
          answers: Object.values(newAnswers),
        });
        console.log("[DoshaAssessment] Initial result saved to Firestore");
      } catch (saveErr) {
        console.error("[DoshaAssessment] Could not save initial result:", saveErr);
      }

    }
  };

  const goBack = () => {
    if (currentQ > 0) {
      animateTransition(-1, () => setCurrentQ(currentQ - 1));
    }
  };

  const vata = Object.values(answers).filter((a) => a === "vata").length;
  const pitta = Object.values(answers).filter((a) => a === "pitta").length;
  const kapha = Object.values(answers).filter((a) => a === "kapha").length;
  const totalAnswered = Object.keys(answers).length || 1;


  /* ─── RESULT SCREEN ─── */
  if (result) {
    const color = DOSHA_COLORS[result] || colors.green;
    const emoji = DOSHA_EMOJIS[result] || "🧘";
    const element = DOSHA_ELEMENTS[result] || "";

    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={color} />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.resultHeader, { backgroundColor: color }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.resultClose}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={s.resultEmoji}>{emoji}</Text>
            <Text style={s.resultLabel}>YOUR DOSHA TYPE</Text>
            <Text style={[s.resultTitle, { color: colors.textOnHeader }]}>{result}</Text>
            <Text style={s.resultElement}>{element}</Text>
          </View>

          <View style={[s.resultBody]}>
            {/* Score breakdown */}
            <View
              style={[
                s.aiCard,
                { backgroundColor: colors.card, shadowColor: colors.shadow },
              ]}
            >
              <Text style={[s.aiCardTitle, { color: colors.text }]}>
                📊 Score Breakdown
              </Text>
              {[
                { label: "Vata", count: vata, barColor: "#5B8FB9" },
                { label: "Pitta", count: pitta, barColor: "#E07A5F" },
                { label: "Kapha", count: kapha, barColor: "#6A994E" },
              ].map(({ label, count, barColor }) => {
                const pct = Math.round((count / totalAnswered) * 100);
                return (
                  <View key={label} style={s.barRow}>
                    <Text style={[s.barLabel, { color: colors.text }]}>
                      {label}
                    </Text>
                    <View
                      style={[
                        s.barTrack,
                        { backgroundColor: colors.barTrackBg },
                      ]}
                    >
                      <View
                        style={[
                          s.barFill,
                          { width: `${pct}%`, backgroundColor: barColor },
                        ]}
                      />
                    </View>
                    <Text style={[s.barPct, { color: colors.textSecondary }]}>
                      {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>


            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: color }]}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Text style={[s.saveBtnText, { color: colors.textOnHeader }]}>Done</Text>
            </TouchableOpacity>

            {!hasTaken && (
              <TouchableOpacity
                style={s.retakeBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setResult(null);
                  setAnswers({});
                  setCurrentQ(0);
                }}
              >
                <Text style={[s.retakeBtnText, { color: colors.textMuted }]}>
                  Retake Assessment
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ─── QUIZ SCREEN ─── */
  const quizHeaderBg = isPhysical ? colors.green : "#C2185B";

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 10);
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={quizHeaderBg} />
      <View
        style={[
          s.quizHeader,
          { backgroundColor: quizHeaderBg },
          isScrolled && {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 4,
          },
        ]}
      >
        <View style={s.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.sectionTag}>
            {isPhysical ? "PHYSICAL" : "MENTAL & EMOTIONAL"}
          </Text>
          <Text style={s.qCount}>
            {currentQ + 1}/{QUESTIONS.length}
          </Text>
        </View>

        <View style={s.progressTrack}>
          <View
            style={[
              s.progressFill,
              { width: `${progress * 100}%`, backgroundColor: colors.gold },
            ]}
          />
        </View>

        <Text style={s.questionEmoji}>{q.emoji}</Text>
        {q.image && (
          <Image
            source={q.image}
            style={s.questionImage}
            resizeMode="contain"
          />
        )}
        <Text style={[s.questionTitle, { color: colors.textOnHeader }]}>{q.title}</Text>
      </View>

      <Animated.View
        style={[
          s.optionsWrap,
          { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
        ]}
      >
        <ScrollView
          contentContainerStyle={s.optionsList}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {q.options.map((opt, i) => {
            const isSelected = answers[currentQ] === opt.dosha;
            const optionLetter = String.fromCharCode(65 + i);
            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.optionCard,
                  {
                    backgroundColor: colors.optionBg,
                    shadowColor: colors.shadow,
                  },
                  isSelected && {
                    borderColor: colors.optionSelectedBorder,
                    backgroundColor: colors.optionSelectedBg,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => selectOption(opt.dosha)}
              >
                <View
                  style={[
                    s.optionLetter,
                    { backgroundColor: colors.optionLetterBg },
                    isSelected && { backgroundColor: colors.green },
                  ]}
                >
                  <Text
                    style={[
                      s.letterText,
                      { color: colors.text },
                      isSelected && { color: "#fff" },
                    ]}
                  >
                    {optionLetter}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  {opt.image && (
                    <Image
                      source={opt.image}
                      style={s.optionImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text
                    style={[
                      s.optionText,
                      { color: colors.optionText },
                      isSelected && { color: colors.text, fontWeight: "700" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {currentQ > 0 && (
          <TouchableOpacity
            style={[
              s.backBtn,
              { backgroundColor: colors.card, shadowColor: colors.shadow },
            ]}
            activeOpacity={0.7}
            onPress={goBack}
          >
            <Text style={[s.backBtnText, { color: colors.text }]}>
              ← Previous
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  /* Quiz Header */
  quizHeader: {
    paddingTop: SAFE_TOP_PADDING,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  sectionTag: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
  },
  qCount: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "700" },

  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },

  questionEmoji: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  questionTitle: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
  },

  /* Options */
  optionsWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  optionsList: { paddingBottom: 140 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  optionLetter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  letterText: { fontSize: 16, fontWeight: "900" },
  optionText: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  optionImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  questionImage: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    marginBottom: 16,
  },

  backBtn: {
    position: "absolute",
    bottom: 30,
    left: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtnText: { fontSize: 14, fontWeight: "700" },

  /* Result */
  resultHeader: {
    paddingTop: 64,
    paddingBottom: 36,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  resultClose: {
    position: "absolute",
    top: 54,
    left: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultEmoji: { fontSize: 56, marginBottom: 12 },
  resultLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 2,
  },
  resultElement: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },

  resultBody: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },

  /* AI Cards */
  aiCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  aiCardTitle: { fontSize: 15, fontWeight: "800", marginBottom: 12 },
  aiSummary: { fontSize: 15, lineHeight: 24, fontStyle: "italic" },
  aiItem: { flexDirection: "row", marginBottom: 8, paddingLeft: 4 },
  aiBullet: { fontSize: 14, fontWeight: "900", marginRight: 10, marginTop: 1 },
  aiItemText: { flex: 1, fontSize: 14, lineHeight: 22 },

  aiLoadingCard: {
    borderRadius: 20,
    padding: 30,
    marginBottom: 14,
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  aiLoadingTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 6,
  },
  aiLoadingText: { fontSize: 13, textAlign: "center" },

  errBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  errText: { fontSize: 13, textAlign: "center", fontWeight: "500" },

  /* Score bars */
  barRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  barLabel: { width: 55, fontSize: 12, fontWeight: "700" },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  barFill: { height: 10, borderRadius: 5 },
  barPct: { width: 36, fontSize: 12, fontWeight: "700", textAlign: "right" },

  saveBtn: {
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  retakeBtn: { marginTop: 16, alignItems: "center", paddingVertical: 14 },
  retakeBtnText: { fontSize: 14, fontWeight: "700" },
});

