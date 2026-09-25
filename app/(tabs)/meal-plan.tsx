import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestoreDB from "@/services/firestoreService";
import { callAI } from "@/utils/aiApi";
import { extractAndParseJSON } from "@/utils/parseJSON";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import {
  formatWeekRange,
  getCurrentSeason,
  getTodayIndex,
  getWeekDates,
  getWeekStartDate,
  isCurrentWeek,
  isFutureWeek,
  shiftWeek,
  type DayInfo,
} from "@/utils/weekUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";

/* ── Types ── */
type Ingredient = {
  name: string;
  quantity: string;
  ayurvedicNote?: string;
};

type Meal = {
  type: string;
  time: string;
  emoji: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageKeyword?: string;
  ingredients?: Ingredient[];
  guna?: string;
  virya?: string;
  doshaEffect?: string;
  rasa?: string[];
  preparationTip?: string;
};

type DayPlan = {
  day: string;
  totalCalories: number;
  meals: Meal[];
};

type WeekPlan = {
  weeklyCalories: number;
  doshaNote?: string;
  days: DayPlan[];
};

const MEAL_COLORS: Record<string, string> = {
  "Early Morning": "#F59E0B",
  Breakfast: "#EF4444",
  Lunch: "#10B981",
  Snack: "#8B5CF6",
  Dinner: "#3B82F6",
};

/* Build a dynamic food image URL from AI's keyword */
const getFoodImageUrl = (keyword?: string, fallbackName?: string): string => {
  const term = keyword || fallbackName || "indian food";
  return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=400&h=300&c=7&rs=1&p=0`;
};

/* ═══════════════════════════════════════════
   IN-MEMORY PENDING MEAL PLAN GENERATION
   Tracks in-flight 7-day plan generations so
   navigating away and back shows loading state
   and picks up the result without re-triggering AI.
   ═══════════════════════════════════════════ */
const pendingMealPlanGeneration = new Map<string, Promise<any>>();

export default function MealPlanScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 768;
  const router = useRouter();
  const uid = user?.uid || "";

  const [doshaData, setDoshaData] = useState<{
    doshaType?: string;
    aiAnalysis?: string;
  } | null>(null);
  const [onboardingData, setOnboardingData] = useState<{
    goal?: string;
    weight?: number;
    height?: number;
    age?: number;
    diet?: string;
    region?: string;
  } | null>(null);

  /* ── Calendar State ── */
  const [viewingWeekStart, setViewingWeekStart] = useState(getWeekStartDate());
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(getTodayIndex());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [favoriteMeals, setFavoriteMeals] = useState<any[]>([]);

  /* ── Reflection Modal State ── */
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionRatings, setReflectionRatings] = useState<
    Record<string, "liked" | "disliked">
  >({});
  const [previousWeekPlan, setPreviousWeekPlan] = useState<WeekPlan | null>(
    null,
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const [vikrutiData, setVikrutiData] = useState<firestoreDB.VikrutiLog | null>(null);
  const [agniData, setAgniData] = useState<{ avgScore: number; dominantType: string } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dayFade = useRef(new Animated.Value(1)).current;
  const daySlide = useRef(new Animated.Value(0)).current;
  const calendarHeight = useRef(new Animated.Value(120)).current;
  const calendarOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(calendarHeight, {
        toValue: isScrolled ? 0 : 120,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(calendarOpacity, {
        toValue: isScrolled ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isScrolled]);

  // Animate content when switching days
  const animateDaySwitch = (newDay: number) => {
    Animated.parallel([
      Animated.timing(dayFade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(daySlide, { toValue: 15, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setSelectedDay(newDay);
      daySlide.setValue(-15);
      Animated.parallel([
        Animated.timing(dayFade, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(daySlide, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      ]).start();
    });
  };

  const season = getCurrentSeason();
  const weekDates = getWeekDates(viewingWeekStart);
  const isViewingCurrent = isCurrentWeek(viewingWeekStart);
  const canGoForward = !isFutureWeek(shiftWeek(viewingWeekStart, 1));
  const weekLabel = formatWeekRange(viewingWeekStart);

  // Subscribe to dosha + onboarding data
  useEffect(() => {
    if (!uid) return;
    const unsubDosha = firestoreDB.subscribeToDoshaResult(uid, (d) =>
      setDoshaData(d || null),
    );
    const unsubOnboarding = firestoreDB.subscribeToOnboarding(uid, (d) =>
      setOnboardingData(d || null),
    );
    // Feedback loop: subscribe to latest Vikruti + fetch Agni average
    const unsubVikruti = firestoreDB.subscribeToLatestVikruti(uid, (v) => setVikrutiData(v));
    firestoreDB.getRecentAgniAverage(uid, 5).then(setAgniData);
    return () => {
      unsubDosha();
      unsubOnboarding();
      unsubVikruti();
    };
  }, [uid]);

  // Subscribe to favorites
  useEffect(() => {
    if (!uid) return;
    const unsub = firestoreDB.subscribeToFavorites(uid, (favs: any[]) =>
      setFavoriteMeals(favs),
    );
    return () => unsub();
  }, [uid]);

  // Migration: one-time check for old meal plan format
  useEffect(() => {
    if (!uid || migrationDone) return;
    firestoreDB.migrateOldMealPlan(uid, getWeekStartDate).then((migrated) => {
      if (migrated) console.log("[MealPlan] Migration complete.");
      setMigrationDone(true);
    });
  }, [uid, migrationDone]);

  // Load available weeks list
  useEffect(() => {
    if (!uid || !migrationDone) return;
    firestoreDB.getAvailableWeeks(uid).then(setAvailableWeeks);
  }, [uid, migrationDone, weekPlan]);

  // Subscribe to the viewed week's meal plan
  useEffect(() => {
    if (!uid || !migrationDone) return;
    const unsub = firestoreDB.subscribeToMealPlanWeek(
      uid,
      viewingWeekStart,
      (data) => {
        setWeekPlan(data?.weekPlan || null);
        setInitialLoadDone(true);
        // If data arrived (from background generation), stop loading
        if (data?.weekPlan) {
          setLoading(false);
        }
      },
    );
    return () => unsub();
  }, [uid, viewingWeekStart, migrationDone]);

  // Subscribe to checked meals for the viewed week
  useEffect(() => {
    if (!uid || !migrationDone) return;
    const unsub = firestoreDB.subscribeToCheckedMeals(
      uid,
      viewingWeekStart,
      (data) => {
        setCheckedMeals(data);
      },
    );
    return () => unsub();
  }, [uid, viewingWeekStart, migrationDone]);

  // On mount: check if a generation is already in-flight for this week
  useEffect(() => {
    const pendingPromise = pendingMealPlanGeneration.get(viewingWeekStart);
    if (pendingPromise) {
      console.log(`[MealPlan] ⏳ Resuming pending generation for week: ${viewingWeekStart}`);
      setLoading(true);
      pendingPromise
        .then((result) => {
          // The Firestore subscription will handle updating weekPlan
          // We just need to clear loading if still relevant
          if (result) {
            console.log(`[MealPlan] ✅ Pending generation completed for week: ${viewingWeekStart}`);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
    }
  }, [viewingWeekStart]);

  // Auto-select today when viewing current week, Monday otherwise
  useEffect(() => {
    setSelectedDay(isViewingCurrent ? getTodayIndex() : 0);
  }, [viewingWeekStart]);

  const hasDosha = !!doshaData?.doshaType;
  const hasOnboarding = !!onboardingData?.goal;

  /* ── Week Navigation ── */
  const goToPrevWeek = () => {
    setWeekPlan(null);
    setInitialLoadDone(false);
    setViewingWeekStart(shiftWeek(viewingWeekStart, -1));
  };

  const goToNextWeek = () => {
    const next = shiftWeek(viewingWeekStart, 1);
    if (isFutureWeek(next)) return;
    setWeekPlan(null);
    setInitialLoadDone(false);
    setViewingWeekStart(next);
  };

  /* ── Generate Plan (with in-memory tracking) ── */
  const handleGenerate = async () => {
    // Don't start if already generating for this week
    if (pendingMealPlanGeneration.has(viewingWeekStart)) {
      console.log(`[MealPlan] ⚠️ Generation already in progress for week: ${viewingWeekStart}`);
      return;
    }

    setLoading(true);
    setError("");

    const generationPromise = (async () => {
      try {
        const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
        const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || defaultUrl;
        const payload = {
          dosha: doshaData?.doshaType || 'Vata',
          target_calories: 2000,
          target_protein: 70,
          target_carbs: 200,
          target_fat: 60,
          cuisine: onboardingData?.region || 'Any',
          weight_kg: onboardingData?.weight ? parseFloat(String(onboardingData.weight)) : null,
          height_cm: onboardingData?.height ? parseFloat(String(onboardingData.height)) : null,
          age: onboardingData?.age ? parseInt(String(onboardingData.age)) : null,
          gender: (onboardingData as any)?.gender || 'Male',
          goal: onboardingData?.goal || 'Balance Doshas',
          dietary_preference: onboardingData?.diet || 'Mixed / Both'
        };

        console.log(`[MealPlan] 🚀 Calling FastAPI Backend for: ${viewingWeekStart}`);
        const response = await fetch(`${API_URL}/api/generate-meal/`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Bypass-Tunnel-Reminder': 'true'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Backend API failed to generate meal plan");
        const json = await response.json();
        
        if (json.status !== "success") throw new Error(json.message || "Generation failed");
        
        // Adapt FastAPI structure to the frontend's expected format
        const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const mealTimeMeta: Record<string, { time: string, emoji: string }> = {
          "Early_Morning": { time: "6:30 AM", emoji: "🌅" },
          "Breakfast": { time: "8:30 AM", emoji: "🥞" },
          "Mid_Morning_Snack": { time: "11:00 AM", emoji: "🍎" },
          "Lunch": { time: "1:30 PM", emoji: "🍛" },
          "Afternoon_Snack": { time: "4:00 PM", emoji: "☕" },
          "Evening_Snack": { time: "5:30 PM", emoji: "🍵" },
          "Dinner": { time: "7:30 PM", emoji: "🍲" }
        };

        // Dynamic NLP-style description generator for each meal
        const doshaQual: Record<string, string[]> = {
          "Vata": ["Warm and grounding", "Nourishing and oily", "Hearty and stabilizing"],
          "Pitta": ["Cooling and soothing", "Mild and refreshing", "Light and calming"],
          "Kapha": ["Light and stimulating", "Warming and invigorating", "Energizing and dry"],
        };
        const mealCtx: Record<string, string[]> = {
          "Early_Morning": ["starts the day with gentle detox", "kickstarts morning metabolism", "prepares Agni for the day"],
          "Breakfast": ["provides sustained morning energy", "fuels a productive morning", "nourishes body and mind"],
          "Mid_Morning_Snack": ["bridges the gap between meals", "keeps energy levels steady", "supports midday digestion"],
          "Lunch": ["balances doshas at peak Agni", "maximizes nutrient absorption at noon", "aligns with midday principles"],
          "Afternoon_Snack": ["sustains afternoon energy", "prevents evening fatigue", "keeps metabolism active"],
          "Evening_Snack": ["provides a gentle pre-dinner boost", "eases the transition to evening", "supports relaxation"],
          "Dinner": ["promotes restful sleep", "is easy on the digestive system", "winds down the body gently"],
        };
        const generateMealDescription = (items: string[], mealKey: string, dosha: string): string => {
          const firstItem = items[0] || "This meal";
          const shortName = firstItem.split("(")[0].trim();
          const qualities = doshaQual[dosha] || ["Balanced and wholesome"];
          const contexts = mealCtx[mealKey] || ["supports overall well-being"];
          const quality = qualities[Math.floor(Math.random() * qualities.length)];
          const context = contexts[Math.floor(Math.random() * contexts.length)];
          return `${quality} ${shortName.toLowerCase()} ${context} for ${dosha}`;
        };

        const parsed = {
          weeklyCalories: Math.round((json.average_daily_calories || 2000) * 7),
          doshaNote: json.llm_doctor_note || `Personalized Ayurvedic plan focusing on balancing ${json.target_dosha}.`,
          days: Object.keys(json.weekly_plan).map((dayKey, i) => {
            const dayData = json.weekly_plan[dayKey];
            
            const mealsArray = Object.keys(dayData.meals).map((mealName) => {
              const meta = mealTimeMeta[mealName] || { time: "", emoji: "🍽️" };
              const mealObj = dayData.meals[mealName];
              
              return {
                type: mealName.replace(/_/g, " "),
                time: meta.time,
                emoji: meta.emoji,
                name: mealObj.items.join(" + "),
                description: generateMealDescription(mealObj.items, mealName, json.target_dosha),
                calories: mealObj.calories,
                protein: mealObj.protein,
                carbs: mealObj.carbs,
                fat: mealObj.fat
              };
            });

            return {
              day: daysOfWeek[i % 7],
              totalCalories: dayData.daily_calories,
              meals: mealsArray
            };
          })
        };

        if (uid) {
          await firestoreDB.saveMealPlan(uid, parsed, viewingWeekStart);
          await firestoreDB.saveCheckedMeals(uid, {}, viewingWeekStart);
          console.log(`[MealPlan] 💾 Saved plan for week: ${viewingWeekStart}`);
        }

        return parsed;
      } catch (e: any) {
        console.error("Meal plan generation failed:", e);
        throw e;
      } finally {
        pendingMealPlanGeneration.delete(viewingWeekStart);
      }
    })();

    pendingMealPlanGeneration.set(viewingWeekStart, generationPromise);

    try {
      const parsed = await generationPromise;
      setWeekPlan(parsed);
      setSelectedDay(getTodayIndex());
      setCheckedMeals({});
    } catch (e: any) {
      setError(e?.message || "Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Generate with Reflection Feedback (with in-memory tracking) ── */
  const handleGenerateWithFeedback = async () => {
    setShowReflection(false);

    // Don't start if already generating for this week
    if (pendingMealPlanGeneration.has(viewingWeekStart)) {
      console.log(`[MealPlan] ⚠️ Generation already in progress for week: ${viewingWeekStart}`);
      return;
    }

    const liked = Object.entries(reflectionRatings)
      .filter(([, v]) => v === "liked")
      .map(([k]) => k);
    const disliked = Object.entries(reflectionRatings)
      .filter(([, v]) => v === "disliked")
      .map(([k]) => k);

    // Save feedback to Firestore
    const prevWeek = shiftWeek(viewingWeekStart, -1);
    if (uid) firestoreDB.saveWeekFeedback(uid, prevWeek, { liked, disliked });

    // Add liked meals to favorites
    if (liked.length > 0 && uid) {
      const newFavs = [...new Set([...favoriteMeals, ...liked])];
      firestoreDB.saveFavoriteMeals(uid, newFavs);
    }

    setLoading(true);
    setError("");

    const generationPromise = (async () => {
      try {
        const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
        const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || defaultUrl;
        const payload = {
          dosha: doshaData?.doshaType || 'Vata',
          target_calories: 2000,
          target_protein: 70,
          target_carbs: 200,
          target_fat: 60,
          cuisine: onboardingData?.region || 'Any',
          weight_kg: onboardingData?.weight ? parseFloat(String(onboardingData.weight)) : null,
          height_cm: onboardingData?.height ? parseFloat(String(onboardingData.height)) : null,
          age: onboardingData?.age ? parseInt(String(onboardingData.age)) : null,
          gender: (onboardingData as any)?.gender || 'Male',
          goal: onboardingData?.goal || 'Balance Doshas',
          dietary_preference: onboardingData?.diet || 'Mixed / Both'
        };

        console.log(`[MealPlan] 🚀 Calling FastAPI Backend (with feedback) for: ${viewingWeekStart}`);
        const response = await fetch(`${API_URL}/api/generate-meal/`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Bypass-Tunnel-Reminder': 'true'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Backend API failed to generate meal plan");
        const json = await response.json();
        if (json.status !== "success") throw new Error(json.message || "Generation failed");

        const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const mealTimeMeta: Record<string, { time: string, emoji: string }> = {
          "Early_Morning": { time: "6:30 AM", emoji: "🌅" },
          "Breakfast": { time: "8:30 AM", emoji: "🥞" },
          "Mid_Morning_Snack": { time: "11:00 AM", emoji: "🍎" },
          "Lunch": { time: "1:30 PM", emoji: "🍛" },
          "Afternoon_Snack": { time: "4:00 PM", emoji: "☕" },
          "Evening_Snack": { time: "5:30 PM", emoji: "🍵" },
          "Dinner": { time: "7:30 PM", emoji: "🍲" }
        };

        // Dynamic NLP-style description generator for each meal (Fallback block)
        const doshaQual2: Record<string, string[]> = {
          "Vata": ["Warm and grounding", "Nourishing and oily", "Hearty and stabilizing"],
          "Pitta": ["Cooling and soothing", "Mild and refreshing", "Light and calming"],
          "Kapha": ["Light and stimulating", "Warming and invigorating", "Energizing and dry"],
        };
        const mealCtx2: Record<string, string[]> = {
          "Early_Morning": ["starts the day with gentle detox", "kickstarts morning metabolism", "prepares Agni for the day"],
          "Breakfast": ["provides sustained morning energy", "fuels a productive morning", "nourishes body and mind"],
          "Mid_Morning_Snack": ["bridges the gap between meals", "keeps energy levels steady", "supports midday digestion"],
          "Lunch": ["balances doshas at peak Agni", "maximizes nutrient absorption at noon", "aligns with midday principles"],
          "Afternoon_Snack": ["sustains afternoon energy", "prevents evening fatigue", "keeps metabolism active"],
          "Evening_Snack": ["provides a gentle pre-dinner boost", "eases the transition to evening", "supports relaxation"],
          "Dinner": ["promotes restful sleep", "is easy on the digestive system", "winds down the body gently"],
        };
        const generateMealDescription2 = (items: string[], mealKey: string, dosha: string): string => {
          const firstItem = items[0] || "This meal";
          const shortName = firstItem.split("(")[0].trim();
          const qualities = doshaQual2[dosha] || ["Balanced and wholesome"];
          const contexts = mealCtx2[mealKey] || ["supports overall well-being"];
          const quality = qualities[Math.floor(Math.random() * qualities.length)];
          const context = contexts[Math.floor(Math.random() * contexts.length)];
          return `${quality} ${shortName.toLowerCase()} ${context} for ${dosha}`;
        };

        const parsed = {
          weeklyCalories: Math.round((json.average_daily_calories || 2000) * 7),
          doshaNote: json.llm_doctor_note || `Personalized Ayurvedic plan focusing on balancing ${json.target_dosha}.`,
          days: Object.keys(json.weekly_plan).map((dayKey, i) => {
            const dayData = json.weekly_plan[dayKey];
            
            const mealsArray = Object.keys(dayData.meals).map((mealName) => {
              const meta = mealTimeMeta[mealName] || { time: "", emoji: "🍽️" };
              const mealObj = dayData.meals[mealName];
              
              return {
                type: mealName.replace(/_/g, " "),
                time: meta.time,
                emoji: meta.emoji,
                name: mealObj.items.join(" + "),
                description: generateMealDescription2(mealObj.items, mealName, json.target_dosha),
                calories: mealObj.calories,
                protein: mealObj.protein,
                carbs: mealObj.carbs,
                fat: mealObj.fat
              };
            });

            return {
              day: daysOfWeek[i % 7],
              totalCalories: dayData.daily_calories,
              meals: mealsArray
            };
          })
        };

        if (uid) {
          await firestoreDB.saveMealPlan(uid, parsed, viewingWeekStart);
          await firestoreDB.saveCheckedMeals(uid, {}, viewingWeekStart);
          console.log(`[MealPlan] 💾 Saved plan for week: ${viewingWeekStart}`);
        }

        return parsed;
      } catch (e: any) {
        console.error("Meal plan generation failed:", e);
        throw e;
      } finally {
        pendingMealPlanGeneration.delete(viewingWeekStart);
      }
    })();

    pendingMealPlanGeneration.set(viewingWeekStart, generationPromise);

    try {
      const parsed = await generationPromise;
      setWeekPlan(parsed);
      setSelectedDay(getTodayIndex());
      setCheckedMeals({});
    } catch (e: any) {
      setError(e?.message || "Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Start Generation (check if reflection needed) ── */
  const startGeneration = async () => {
    // Check if there's a previous week plan to reflect on
    const prevWeek = shiftWeek(viewingWeekStart, -1);
    const prevData = await firestoreDB.getMealPlanForWeek(uid, prevWeek);
    if (prevData?.weekPlan?.days?.length > 0) {
      setPreviousWeekPlan(prevData!.weekPlan);
      setReflectionRatings({});
      setShowReflection(true);
    } else {
      handleGenerate();
    }
  };

  /* ── Favorites ── */
  const toggleFavorite = (meal: any) => {
    if (!uid) return;
    const isFav = favoriteMeals.some((f: any) => f.name === meal.name);
    const newFavs = isFav
      ? favoriteMeals.filter((f: any) => f.name !== meal.name)
      : [...favoriteMeals, meal];
    setFavoriteMeals(newFavs);
    firestoreDB.saveFavoriteMeals(uid, newFavs);
  };

  /* ── Check Meals ── */
  const toggleMealCheck = (dayIdx: number, mealIdx: number) => {
    const key = `${dayIdx}-${mealIdx}`;
    setCheckedMeals((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (uid) firestoreDB.saveCheckedMeals(uid, updated, viewingWeekStart);
      return updated;
    });
  };

  /* ── Computed ── */
  const currentDay = weekPlan?.days?.[selectedDay];
  const completedToday =
    currentDay?.meals?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`])
      .length || 0;
  const totalMeals = currentDay?.meals?.length || 0;
  const consumedCal =
    currentDay?.meals
      ?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`])
      .reduce((sum, m) => sum + m.calories, 0) || 0;

  const consumedProtein = currentDay?.meals
    ?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`])
    .reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
  const consumedCarbs = currentDay?.meals
    ?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`])
    .reduce((sum, m) => sum + (m.carbs || 0), 0) || 0;
  const consumedFat = currentDay?.meals
    ?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`])
    .reduce((sum, m) => sum + (m.fat || 0), 0) || 0;

  const targetProtein = currentDay?.meals?.reduce((a, m) => a + (m.protein || 0), 0) || 0;
  const targetCarbs = currentDay?.meals?.reduce((a, m) => a + (m.carbs || 0), 0) || 0;
  const targetFat = currentDay?.meals?.reduce((a, m) => a + (m.fat || 0), 0) || 0;

  // Week-level stats
  const weekCompletedMeals = weekPlan?.days
    ? weekPlan.days.reduce(
        (sum, _, dayIdx) =>
          sum +
          (weekPlan.days[dayIdx]?.meals?.filter(
            (_, mealIdx) => checkedMeals[`${dayIdx}-${mealIdx}`],
          ).length || 0),
        0,
      )
    : 0;
  const weekTotalMeals =
    weekPlan?.days?.reduce((sum, d) => sum + (d.meals?.length || 0), 0) || 0;

  // Day completion dots for calendar
  const getDayCompletion = (dayIdx: number): "full" | "partial" | "none" => {
    const day = weekPlan?.days?.[dayIdx];
    if (!day?.meals?.length) return "none";
    const checked = day.meals.filter(
      (_, i) => checkedMeals[`${dayIdx}-${i}`],
    ).length;
    if (checked === day.meals.length) return "full";
    if (checked > 0) return "partial";
    return "none";
  };

  /* ─── REFLECTION MODAL ─── */
  const renderReflectionModal = () => (
    <Modal visible={showReflection} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalCard, { backgroundColor: colors.card }]}>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {t('how_was_last_week')}
          </Text>
          <Text style={[s.modalSubtitle, { color: colors.textMuted }]}>
            {t('rate_meals_desc')}
          </Text>

          <ScrollView
            style={s.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            {previousWeekPlan?.days
              ?.flatMap((day) => day.meals)
              .slice(0, 12)
              .map((meal, i) => {
                const rating = reflectionRatings[meal.name];
                return (
                  <View
                    key={i}
                    style={[
                      s.reflectItem,
                      { borderColor: colors.cardBorder || "rgba(0,0,0,0.05)" },
                    ]}
                  >
                    <Text
                      style={[s.reflectName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {meal.emoji} {meal.name}
                    </Text>
                    <View style={s.reflectBtns}>
                      <TouchableOpacity
                        style={[
                          s.reflectBtn,
                          rating === "liked" && {
                            backgroundColor: "rgba(16,185,129,0.15)",
                          },
                        ]}
                        onPress={() =>
                          setReflectionRatings((p) => ({
                            ...p,
                            [meal.name]:
                              p[meal.name] === "liked"
                                ? (undefined as any)
                                : "liked",
                          }))
                        }
                      >
                        <Ionicons
                          name="thumbs-up"
                          size={16}
                          color={
                            rating === "liked" ? "#10B981" : colors.textMuted
                          }
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          s.reflectBtn,
                          rating === "disliked" && {
                            backgroundColor: "rgba(239,68,68,0.15)",
                          },
                        ]}
                        onPress={() =>
                          setReflectionRatings((p) => ({
                            ...p,
                            [meal.name]:
                              p[meal.name] === "disliked"
                                ? (undefined as any)
                                : "disliked",
                          }))
                        }
                      >
                        <Ionicons
                          name="thumbs-down"
                          size={16}
                          color={
                            rating === "disliked" ? "#EF4444" : colors.textMuted
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
          </ScrollView>

          <TouchableOpacity
            style={[s.modalGenBtn, { backgroundColor: colors.primaryBtn }]}
            onPress={handleGenerateWithFeedback}
          >
            <Text style={[s.modalGenText, { color: colors.primaryBtnText }]}>
              {t('generate_plan')} ✨
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.modalSkip}
            onPress={() => {
              setShowReflection(false);
              handleGenerate();
            }}
          >
            <Text style={[s.modalSkipText, { color: colors.textMuted }]}>
              {t('skip_feedback')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 10);
  };

  /* ─── CALENDAR STRIP ─── */
  const renderCalendarStrip = () => (
    <View
      style={[
        s.calendarSection,
        { backgroundColor: isDark ? colors.card : colors.headerBg },
        isScrolled && {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 6,
        },
      ]}
    >
      {/* Week Navigation */}
      <View style={s.weekNavRow}>
        <TouchableOpacity
          onPress={goToPrevWeek}
          style={[s.weekArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)' }]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={isDark ? colors.text : colors.textOnHeader}
          />
        </TouchableOpacity>
        <View style={s.weekLabelWrap}>
          <Text style={[s.weekLabel, { color: colors.textOnHeader }]}>
            {weekLabel}
          </Text>
          {isViewingCurrent && (
            <View style={[s.currentWeekBadge, { backgroundColor: `${colors.gold}25` }]}>
              <View style={[s.currentWeekDot, { backgroundColor: colors.gold }]} />
              <Text style={[s.currentWeekText, { color: colors.gold }]}>{t('this_week')}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={goToNextWeek}
          style={[s.weekArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)' }, !canGoForward && { opacity: 0.3 }]}
          activeOpacity={0.7}
          disabled={!canGoForward}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? colors.text : colors.textOnHeader}
          />
        </TouchableOpacity>
      </View>

      {/* Day Cells */}
      <Animated.View style={{ maxHeight: calendarHeight, opacity: calendarOpacity, overflow: 'hidden' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.dayRow}
        >
          {weekDates.map((d: DayInfo, i: number) => {
            const isActive = selectedDay === i;
            const completion = getDayCompletion(i);
            const completionColor = completion === 'full' ? '#10B981' : completion === 'partial' ? '#F59E0B' : 'transparent';
            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.dayCell,
                  {
                    backgroundColor: isDark
                      ? colors.surface
                      : 'rgba(255,255,255,0.10)',
                  },
                  isActive && {
                    backgroundColor: colors.gold,
                    shadowColor: colors.gold,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                  d.isToday && !isActive && {
                    borderColor: colors.gold,
                    borderWidth: 2,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => animateDaySwitch(i)}
              >
                <Text
                  style={[
                    s.dayCellDay,
                    {
                      color: isDark ? colors.textMuted : 'rgba(255,255,255,0.5)',
                    },
                    isActive && { color: '#1B4332' },
                    d.isToday && !isActive && { color: colors.gold },
                  ]}
                >
                  {d.dayShort}
                </Text>
                <Text
                  style={[
                    s.dayCellDate,
                    { color: isDark ? colors.text : colors.textOnHeader },
                    isActive && { color: '#1B4332' },
                  ]}
                >
                  {d.date}
                </Text>
                {/* Completion strip at bottom */}
                <View style={[
                  s.completionStrip,
                  { backgroundColor: isActive ? (completion !== 'none' ? '#1B4332' : 'rgba(27,67,50,0.2)') : completionColor },
                  completion === 'none' && !isActive && { opacity: 0 },
                ]} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );

  /* ─── SEASONAL BADGE ─── */
  const renderSeasonalBadge = () => (
    <View
      style={[
        s.seasonBadge,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.03)",
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <Text style={s.seasonEmoji}>{season.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.seasonName, { color: colors.text }]}>
          {season.ayurvedic} ({season.name})
        </Text>
        <Text style={[s.seasonAdvice, { color: colors.textMuted }]}>
          {season.dominantDosha}-balancing meals
        </Text>
      </View>
    </View>
  );

  /* ─── EMPTY / SETUP STATE ─── */
  if (!weekPlan && initialLoadDone && isViewingCurrent) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0 }]}>
        <StatusBar
          barStyle={colors.statusBarStyle}
          backgroundColor={colors.headerBg}
        />
        <View style={{ zIndex: 10, elevation: 10 }}>
          <View
            style={[
              s.header,
              { backgroundColor: isDark ? colors.card : colors.headerBg },
            ]}
          >
            <Text
              style={[
                s.headerTitle,
                { color: isDark ? colors.text : colors.textOnHeader },
              ]}
            >
              {t('your_meal_plan')}
            </Text>
            <Text
              style={[
                s.headerSub,
                { color: isDark ? colors.textSecondary : colors.textOnHeaderSub },
              ]}
            >
              AI-powered Ayurvedic nutrition
            </Text>
          </View>
          {renderCalendarStrip()}
        </View>

        <Animated.View style={[s.emptyWrap, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={s.emptyBody}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* New Week Prompt */}
            <View
              style={[
                s.newWeekCard,
                { backgroundColor: colors.card, shadowColor: colors.shadow },
              ]}
            >
              <Text style={s.newWeekEmoji}>🌱</Text>
              <Text style={[s.newWeekTitle, { color: colors.text }]}>
                {t('new_week')} — {weekLabel}
              </Text>
              <Text style={[s.newWeekDesc, { color: colors.textMuted }]}>
                {t('gen_new_plan')}
              </Text>
              {renderSeasonalBadge()}
              {favoriteMeals.length > 0 && (
                <View
                  style={[
                    s.favCarryBadge,
                    { backgroundColor: "rgba(168,114,8,0.08)" },
                  ]}
                >
                  <Ionicons name="heart" size={12} color="#A87208" />
                  <Text style={s.favCarryText}>
                    Carrying over {favoriteMeals.length} favorite
                    {favoriteMeals.length > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>

            {/* Step 1: Dosha Assessment */}
            <View
              style={[
                s.stepCard,
                { backgroundColor: colors.card, shadowColor: colors.shadow },
                hasDosha && {
                  borderColor: colors.stepDoneBorder,
                  backgroundColor: colors.stepDoneBg,
                },
              ]}
            >
              <View style={s.stepHeader}>
                <View
                  style={[
                    s.stepBadge,
                    hasDosha
                      ? { backgroundColor: "#10B981" }
                      : { backgroundColor: colors.gold },
                  ]}
                >
                  <Text style={s.stepBadgeText}>{hasDosha ? "✓" : "1"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.stepTitle, { color: colors.text }]}>
                    {t('dosha_assessment')}
                  </Text>
                  <Text style={[s.stepDesc, { color: colors.textSecondary }]}>
                    {hasDosha
                      ? `Your dosha: ${doshaData?.doshaType} — meals will be tailored to balance it`
                      : "Take the quiz to get dosha-specific meals"}
                  </Text>
                </View>
              </View>
              {!hasDosha && (
                <TouchableOpacity
                  style={[s.stepBtn, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                  onPress={() => router.push("/(profile)/dosha-assessment")}
                >
                  <Text style={[s.stepBtnText, { color: colors.text }]}>
                    Take Assessment →
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* AI Feedback Loop Data */}
            {(vikrutiData || agniData) && (
              <View
                style={[
                  s.stepCard,
                  { backgroundColor: isDark ? "rgba(16,185,129,0.06)" : "#F0FDF4", borderColor: isDark ? "rgba(16,185,129,0.12)" : "#D1FAE5" },
                ]}
              >
                <View style={s.stepHeader}>
                  <Text style={{ fontSize: 20, marginRight: 12 }}>✨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stepTitle, { color: isDark ? "#6EE7B7" : "#065F46" }]}>
                      Plan Tailored For You
                    </Text>
                    {vikrutiData && (
                      <Text style={[s.stepDesc, { color: isDark ? "#A7F3D0" : "#047857", marginTop: 4 }]}>
                        {vikrutiData.dominantImbalance === "Balanced" ? "• Maintaining Dosha balance" : `• Balancing ${vikrutiData.dominantImbalance} imbalance`}
                      </Text>
                    )}
                    {agniData && (
                      <Text style={[s.stepDesc, { color: isDark ? "#A7F3D0" : "#047857", marginTop: 2 }]}>
                        • Supporting {agniData.dominantType} digestion
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Step 2: Preferences */}
            <View
              style={[
                s.stepCard,
                { backgroundColor: colors.card, shadowColor: colors.shadow },
                hasOnboarding && {
                  borderColor: colors.stepDoneBorder,
                  backgroundColor: colors.stepDoneBg,
                },
              ]}
            >
              <View style={s.stepHeader}>
                <View
                  style={[
                    s.stepBadge,
                    hasOnboarding
                      ? { backgroundColor: "#10B981" }
                      : { backgroundColor: colors.gold },
                  ]}
                >
                  <Text style={s.stepBadgeText}>
                    {hasOnboarding ? "✓" : "2"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.stepTitle, { color: colors.text }]}>
                    Health Profile
                  </Text>
                  <Text style={[s.stepDesc, { color: colors.textSecondary }]}>
                    {hasOnboarding
                      ? `Goal: ${onboardingData?.goal} · ${onboardingData?.weight}kg · ${onboardingData?.height}cm`
                      : "Set weight, height & fitness goal"}
                  </Text>
                </View>
              </View>
              {!hasOnboarding && (
                <TouchableOpacity
                  style={[s.stepBtn, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                  onPress={() => router.push("/onboarding")}
                >
                  <Text style={[s.stepBtnText, { color: colors.text }]}>
                    Set Preferences →
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Generate */}
            <TouchableOpacity
              style={[
                s.generateBtn,
                {
                  backgroundColor: !hasDosha ? colors.divider : colors.primaryBtn,
                  shadowColor: !hasDosha ? "transparent" : colors.primaryBtn,
                },
                (loading || !hasDosha) && { opacity: 0.6 },
              ]}
              activeOpacity={0.8}
              onPress={startGeneration}
              disabled={loading || !hasDosha}
            >
              {loading ? (
                <View style={s.loadRow}>
                  <ActivityIndicator color={colors.gold} size="small" />
                  <Text style={[s.genText, { color: colors.primaryBtnText }]}>
                    {" "}
                    AI is cooking your plan...
                  </Text>
                </View>
              ) : (
                <Text style={[s.genText, { color: !hasDosha ? colors.textMuted : colors.primaryBtnText }]}>
                  {hasDosha
                    ? `Generate ${doshaData?.doshaType} Plan ✨`
                    : "Wait for Assessment 🧘"}
                </Text>
              )}
            </TouchableOpacity>

            {!hasDosha && (
              <Text style={[s.hintText, { color: colors.textMuted }]}>
                💡 Take the Dosha Assessment first for a deeply personalized
                plan
              </Text>
            )}

            {error ? (
              <View
                style={[
                  s.errBox,
                  {
                    backgroundColor: colors.errorBg,
                    borderColor: colors.errorBorder,
                  },
                ]}
              >
                <Text style={[s.errText, { color: colors.errorText }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <View style={{ height: 80 }} />
          </ScrollView>
        </Animated.View>
        {renderReflectionModal()}
      </View>
    );
  }

  /* ─── PAST WEEK EMPTY STATE ─── */
  if (!weekPlan && initialLoadDone && !isViewingCurrent) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0 }]}>
        <StatusBar
          barStyle={colors.statusBarStyle}
          backgroundColor={colors.headerBg}
        />
        <View style={{ zIndex: 10, elevation: 10 }}>
          <View
            style={[
              s.header,
              { backgroundColor: isDark ? colors.card : colors.headerBg },
            ]}
          >
            <Text
              style={[
                s.headerTitle,
                { color: isDark ? colors.text : colors.textOnHeader },
              ]}
            >
              Your Meal Plan
            </Text>
            <Text
              style={[
                s.headerSub,
                { color: isDark ? colors.textSecondary : colors.textOnHeaderSub },
              ]}
            >
              AI-powered Ayurvedic nutrition
            </Text>
          </View>
          {renderCalendarStrip()}
        </View>
        <View style={s.pastEmptyWrap}>
          <Ionicons
            name="calendar-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={[s.pastEmptyTitle, { color: colors.text }]}>
            No Plan This Week
          </Text>
          <Text style={[s.pastEmptyDesc, { color: colors.textMuted }]}>
            No meal plan was generated for {weekLabel}
          </Text>
          <TouchableOpacity
            style={[s.goCurrentBtn, { backgroundColor: colors.primaryBtn }]}
            onPress={() => setViewingWeekStart(getWeekStartDate())}
          >
            <Text style={[s.goCurrentText, { color: colors.primaryBtnText }]}>
              Go to Current Week →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ─── LOADING STATE ─── */
  if (!initialLoadDone) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0 }]}>
        <StatusBar
          barStyle={colors.statusBarStyle}
          backgroundColor={colors.headerBg}
        />
        <View style={{ zIndex: 10, elevation: 10 }}>
          <View
            style={[
              s.header,
              { backgroundColor: isDark ? colors.card : colors.headerBg },
            ]}
          >
            <Text
              style={[
                s.headerTitle,
                { color: isDark ? colors.text : colors.textOnHeader },
              ]}
            >
              Your Meal Plan
            </Text>
            <Text
              style={[
                s.headerSub,
                { color: isDark ? colors.textSecondary : colors.textOnHeaderSub },
              ]}
            >
              AI-powered Ayurvedic nutrition
            </Text>
          </View>
          {renderCalendarStrip()}
        </View>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={colors.gold} size="large" />
          <Text
            style={[s.loadingText, { color: colors.textMuted, marginTop: 12 }]}
          >
            Loading meal plan...
          </Text>
        </View>
      </View>
    );
  }

  /* ─── PLAN VIEW ─── */
  return (
    <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0 }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBg}
      />

      <View style={{ zIndex: 10, elevation: 10 }}>
        <View
          style={[
            s.header,
            { backgroundColor: isDark ? colors.card : colors.headerBg },
          ]}
        >
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text
                  style={[
                    s.headerTitle,
                    { color: isDark ? colors.text : colors.textOnHeader },
                  ]}
                >
                  Meal Plan
                </Text>
                {doshaData?.doshaType && (
                  <View style={[s.doshaPill, { backgroundColor: isDark ? 'rgba(253,224,71,0.12)' : 'rgba(255,255,255,0.15)', borderColor: isDark ? 'rgba(253,224,71,0.25)' : 'rgba(255,255,255,0.25)' }]}>
                    <Text style={{ fontSize: 12 }}>🧘</Text>
                    <Text style={[s.doshaPillText, { color: isDark ? colors.gold : colors.textOnHeader }]}>{doshaData.doshaType}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                <Text style={[s.headerCalNum, { color: colors.gold }]}>
                  {weekPlan?.weeklyCalories?.toLocaleString()}
                </Text>
                <Text
                  style={[
                    s.headerSub,
                    { color: isDark ? colors.textSecondary : colors.textOnHeaderSub },
                  ]}
                >
                  kcal this week
                </Text>
              </View>
            </View>
            {isViewingCurrent && (
              <TouchableOpacity
                style={[s.regenBtn, { backgroundColor: isDark ? 'rgba(253,224,71,0.10)' : 'rgba(255,255,255,0.12)', borderColor: isDark ? 'rgba(253,224,71,0.20)' : 'rgba(255,255,255,0.20)' }]}
                activeOpacity={0.7}
                onPress={startGeneration}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.gold} size="small" />
                ) : (
                  <Ionicons
                    name="refresh-outline"
                    size={20}
                    color={colors.gold}
                  />
                )}
              </TouchableOpacity>
            )}
            {!isViewingCurrent && (
              <View
                style={[s.pastBadge, { backgroundColor: 'rgba(168,114,8,0.15)' }]}
              >
                <Ionicons name="time-outline" size={12} color="#A87208" />
                <Text style={s.pastBadgeText}>Past</Text>
              </View>
            )}
          </View>
          {/* Gold accent line */}
          <View style={[s.headerGoldLine, { backgroundColor: colors.gold }]} />
        </View>

        {renderCalendarStrip()}
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* Week Progress */}
        {isViewingCurrent && weekTotalMeals > 0 && (
          <View
            style={[
              s.weekProgress,
              {
                backgroundColor: isDark
                  ? "rgba(16,185,129,0.08)"
                  : "rgba(16,185,129,0.05)",
                borderColor: isDark
                  ? "rgba(16,185,129,0.15)"
                  : "rgba(16,185,129,0.10)",
              },
            ]}
          >
            <View style={s.weekProgressRow}>
              <View style={[s.weekProgressIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <Ionicons name="checkmark-done" size={14} color="#10B981" />
              </View>
              <Text style={[s.weekProgressText, { color: colors.text }]}>
                {weekCompletedMeals} of {weekTotalMeals} meals completed
              </Text>
              <Text style={[s.weekProgressPct, { color: "#10B981" }]}>
                {Math.round((weekCompletedMeals / weekTotalMeals) * 100)}%
              </Text>
            </View>
            <View
              style={[s.weekProgressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
            >
              <View
                style={[
                  s.weekProgressFill,
                  {
                    width: `${Math.min((weekCompletedMeals / weekTotalMeals) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Seasonal + Dosha Note Row */}
        {isViewingCurrent && renderSeasonalBadge()}

        {weekPlan?.doshaNote && (
          <View
            style={[
              s.doshaNote,
              {
                backgroundColor: colors.doshaNoteBg,
                borderColor: colors.doshaNoteBorder,
              },
            ]}
          >
            <Text style={s.doshaNoteIcon}>🧘</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.doshaNoteText, { color: colors.doshaNoteText }]}>
                {weekPlan.doshaNote}
              </Text>
              
              {/* AI Feedback Loop Data (Generated View) appended inside dosha note */}
              {(vikrutiData || agniData) && isViewingCurrent && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#6EE7B7' : '#065F46' }}>✨ AI Adapted:</Text>
                  {vikrutiData && (
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#6EE7B7' : '#065F46' }}>
                      {vikrutiData.dominantImbalance === "Balanced" ? "Maintaining balance" : `Balancing ${vikrutiData.dominantImbalance}`}
                    </Text>
                  )}
                  {vikrutiData && agniData && <Text style={{ fontSize: 12, color: isDark ? '#6EE7B7' : '#065F46' }}>•</Text>}
                  {agniData && (
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#6EE7B7' : '#065F46' }}>
                      {agniData.dominantType} digestion
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Animated Day Content */}
        <Animated.View style={{ opacity: dayFade, transform: [{ translateY: daySlide }] }}>

        {/* Day Header */}
        <View style={s.dayHeader}>
          <View>
            <Text style={[s.dayTitle, { color: colors.text }]}>
              {weekDates[selectedDay]?.dayFull}
            </Text>
            <Text style={[s.daySubtitle, { color: colors.textMuted }]}>
              {weekDates[selectedDay]?.month} {weekDates[selectedDay]?.date}
            </Text>
          </View>
          <View style={s.dayHeaderRight}>
            <View style={[s.progressBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)', borderColor: isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.15)' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={[s.progressText, { color: '#10B981' }]}>
                {completedToday}/{totalMeals}
              </Text>
            </View>
          </View>
        </View>

        {/* Calorie Ring Card */}
        <View
          style={[
            s.calCard,
            { backgroundColor: colors.calCardBg, shadowColor: colors.shadow },
          ]}
        >
          <View style={s.calCardLayout}>
            {/* Ring Section */}
            <View style={s.calRingWrap}>
              <View style={[s.calRingOuter, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[s.calRingFill, {
                  borderColor: '#10B981',
                  borderTopColor: consumedCal > 0 ? '#10B981' : 'transparent',
                  borderRightColor: currentDay?.totalCalories && consumedCal / currentDay.totalCalories > 0.25 ? '#10B981' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  borderBottomColor: currentDay?.totalCalories && consumedCal / currentDay.totalCalories > 0.5 ? '#10B981' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  borderLeftColor: currentDay?.totalCalories && consumedCal / currentDay.totalCalories > 0.75 ? '#10B981' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  transform: [{ rotate: '-45deg' }],
                }]} />
                <View style={s.calRingInner}>
                  <Text style={[s.calRingVal, { color: colors.text }]}>{consumedCal}</Text>
                  <Text style={[s.calRingUnit, { color: colors.textMuted }]}>kcal</Text>
                </View>
              </View>
              <Text style={[s.calRingOf, { color: colors.textMuted }]}>of {currentDay?.totalCalories || 0}</Text>
            </View>

            {/* Macro Bars Section */}
            <View style={s.calMacroSection}>
              {[
                { label: 'Prot', consumed: consumedProtein, target: targetProtein, color: '#EF4444', icon: '💪' },
                { label: 'Carbs', consumed: consumedCarbs, target: targetCarbs, color: '#F59E0B', icon: '🌾' },
                { label: 'Fat', consumed: consumedFat, target: targetFat, color: '#10B981', icon: '🥑' },
              ].map((macro, i) => {
                const percentage = macro.target > 0 ? (macro.consumed / macro.target) * 100 : 0;
                return (
                  <View key={i} style={s.calMacroItem}>
                    <View style={s.calMacroLabelRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 11 }}>{macro.icon}</Text>
                        <Text style={[s.calMacroLabel, { color: colors.textSecondary }]}>{macro.label}</Text>
                      </View>
                      <Text style={[s.calMacroValue, { color: colors.text }]}>
                        {macro.consumed}g <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '400' }}>/ {macro.target}g</Text>
                      </Text>
                    </View>
                    <View style={[s.calMacroTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                      <View style={[s.calMacroFill, { backgroundColor: macro.color, width: `${Math.min(percentage, 100)}%` }]} />
                    </View>
                  </View>
                );
              })}
              <View style={s.calRemainRow}>
                <Text style={[s.calRemainLabel, { color: colors.textMuted }]}>Remaining</Text>
                <Text style={[s.calRemainVal, { color: '#F59E0B' }]}>{(currentDay?.totalCalories || 0) - consumedCal} kcal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Timeline Meal Cards */}
        <View style={[s.timelineWrap, isDesktop && s.timelineWrapDesktop]}>
          {currentDay?.meals?.map((meal, i) => {
            const checked = checkedMeals[`${selectedDay}-${i}`];
            const color = MEAL_COLORS[meal.type] || colors.gold;
            const isFav = favoriteMeals.some((f: any) => f.name === meal.name);
            const isLast = i === (currentDay?.meals?.length || 1) - 1;
            return (
              <View key={i} style={[s.timelineItem, isDesktop && s.timelineItemDesktop]}>
                {/* Timeline Gutter */}
                {!isDesktop && (
                  <View style={s.timelineGutter}>
                  <View style={[s.timelineDot, { backgroundColor: checked ? '#10B981' : color, borderColor: checked ? '#10B981' : color }]}>
                    {checked && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                  {!isLast && <View style={[s.timelineLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />}
                  </View>
                )}

                {/* Meal Card */}
                <TouchableOpacity
                  style={[
                    s.mealCard,
                    {
                      backgroundColor: colors.card,
                      shadowColor: colors.shadow,
                      borderColor: 'transparent',
                    },
                    checked && {
                      borderColor: colors.mealCheckedBorder,
                      backgroundColor: colors.mealCheckedBg,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/(profile)/meal-detail",
                      params: { meal: JSON.stringify(meal) },
                    })
                  }
                  onLongPress={() =>
                    isViewingCurrent && toggleMealCheck(selectedDay, i)
                  }
                >
                  {/* Time + Type Header */}
                  <View style={s.mealHeaderRow}>
                    <View style={[s.mealTypePill, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
                      <Text style={{ fontSize: 13 }}>{meal.emoji}</Text>
                      <Text style={[s.mealTypePillText, { color }]}>{meal.type}</Text>
                    </View>
                    <Text style={[s.mealTime, { color: colors.textMuted }]}>{meal.time}</Text>
                    <View style={{ flex: 1 }} />
                    {isViewingCurrent && (
                      <TouchableOpacity
                        onPress={() => toggleFavorite(meal)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={s.mealFavBtn}
                      >
                        <Ionicons
                          name={isFav ? "heart" : "heart-outline"}
                          size={18}
                          color={isFav ? "#EF4444" : colors.textMuted}
                        />
                      </TouchableOpacity>
                    )}
                    {isViewingCurrent && (
                      <TouchableOpacity
                        onPress={() => toggleMealCheck(selectedDay, i)}
                        style={[
                          s.checkCircle,
                          { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' },
                          checked && {
                            backgroundColor: '#10B981',
                            borderColor: '#10B981',
                          },
                        ]}
                      >
                        {checked && (
                          <Ionicons name="checkmark" size={13} color="#fff" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Image + Info */}
                  <View style={s.mealBody}>
                    <View style={s.mealImgBox}>
                      <Image
                        source={{ uri: getFoodImageUrl(meal.imageKeyword, meal.name) }}
                        style={s.mealImg}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={s.mealInfo}>
                      <Text
                        style={[
                          s.mealName,
                          { color: colors.text },
                          checked && s.mealNameDone,
                        ]}
                        numberOfLines={2}
                      >
                        {meal.name}
                      </Text>
                      <Text
                        style={[s.mealDesc, { color: colors.textMuted }]}
                        numberOfLines={2}
                      >
                        {meal.description}
                      </Text>
                    </View>
                  </View>

                  {/* Macro Row */}
                  <View style={s.macroRow}>
                    <View style={[s.macroPill, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)' }]}>
                      <Text style={[s.macroVal, { color: '#EF4444' }]}>🔥 {meal.calories}</Text>
                      <Text style={[s.macroUnit, { color: '#EF4444' }]}>kcal</Text>
                    </View>
                    <View style={[s.macroPill, { backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.12)' }]}>
                      <Text style={[s.macroVal, { color: colors.text }]}>💪 {meal.protein}g</Text>
                    </View>
                    <View style={[s.macroPill, { backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.12)' }]}>
                      <Text style={[s.macroVal, { color: colors.text }]}>🌾 {meal.carbs}g</Text>
                    </View>
                    <View style={[s.macroPill, { backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.12)' }]}>
                      <Text style={[s.macroVal, { color: colors.text }]}>🥑 {meal.fat}g</Text>
                    </View>
                  </View>

                  {/* Navigate Arrow */}
                  <View style={s.mealArrowRow}>
                    <Text style={[s.mealArrowText, { color: colors.textMuted }]}>View details</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        </Animated.View>

        {error ? (
          <View
            style={[
              s.errBox,
              {
                backgroundColor: colors.errorBg,
                borderColor: colors.errorBorder,
              },
            ]}
          >
            <Text style={[s.errText, { color: colors.errorText }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {loading && (
          <View
            style={[
              s.loadingOverlay,
              {
                backgroundColor: isDark
                  ? "rgba(0,0,0,0.4)"
                  : "rgba(255,255,255,0.6)",
              },
            ]}
          >
            <ActivityIndicator color={colors.gold} size="small" />
            <Text style={[s.loadingOverlayText, { color: colors.text }]}>
              Regenerating your plan...
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {renderReflectionModal()}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingTop: SAFE_TOP_PADDING,
    paddingBottom: 14,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    zIndex: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontWeight: "600" },
  headerCalNum: { fontSize: 18, fontWeight: "900" },
  headerGoldLine: { height: 3, borderRadius: 2, marginTop: 10, marginHorizontal: 0, opacity: 0.4 },
  doshaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  doshaPillText: { fontSize: 11, fontWeight: "800" },
  regenBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 160, width: '100%', maxWidth: 900, alignSelf: 'center' },
  loadingText: { fontSize: 13, fontWeight: "600" },

  /* Calendar Strip */
  calendarSection: {
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    zIndex: 10,
  },
  weekNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  weekArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabelWrap: { alignItems: "center" },
  weekLabel: { fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
  currentWeekBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  currentWeekDot: { width: 5, height: 5, borderRadius: 3 },
  currentWeekText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  dayRow: { paddingHorizontal: 10, gap: 8 },
  dayCell: {
    width: 50,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 18,
    alignItems: "center",
  },
  dayCellDay: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" as any },
  dayCellDate: { fontSize: 18, fontWeight: "900", marginTop: 3 },
  completionStrip: { width: 20, height: 3, borderRadius: 2, marginTop: 6 },

  /* Seasonal Badge */
  seasonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  seasonEmoji: { fontSize: 20 },
  seasonName: { fontSize: 12, fontWeight: "700" },
  seasonAdvice: { fontSize: 10, fontWeight: "500", marginTop: 1 },

  /* Week Progress */
  weekProgress: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  weekProgressIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center" as any,
    justifyContent: "center" as any,
  },
  weekProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  weekProgressText: { flex: 1, fontSize: 13, fontWeight: "700" },
  weekProgressPct: { fontSize: 14, fontWeight: "900" },
  weekProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  weekProgressFill: { height: 6, borderRadius: 3, backgroundColor: "#10B981" },

  /* Past Badge */
  pastBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pastBadgeText: { color: "#A87208", fontSize: 11, fontWeight: "700" },

  /* Dosha Note */
  doshaNote: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  doshaNoteIcon: { fontSize: 18, marginRight: 10, marginTop: 1 },
  doshaNoteText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: "500" },

  /* Day Header */
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  dayHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -0.3 },
  daySubtitle: { fontSize: 13, fontWeight: "500", marginTop: 3, opacity: 0.7 },
  progressBadge: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  progressText: { fontSize: 14, fontWeight: "900" },

  /* Calorie Ring Card */
  calCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  calCardLayout: { flexDirection: "row", alignItems: "center" },
  calRingWrap: { alignItems: "center", marginRight: 20 },
  calRingOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  calRingFill: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
  },
  calRingInner: { alignItems: "center" },
  calRingVal: { fontSize: 22, fontWeight: "900" },
  calRingUnit: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginTop: -2 },
  calRingOf: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  calMacroSection: { flex: 1 },
  calMacroItem: { marginBottom: 10 },
  calMacroLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  calMacroLabel: { fontSize: 11, fontWeight: "600" },
  calMacroValue: { fontSize: 13, fontWeight: "900", textAlign: "right" },
  calMacroTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  calMacroFill: { height: 6, borderRadius: 3 },
  calRemainRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)" },
  calRemainLabel: { fontSize: 11, fontWeight: "600" },
  calRemainVal: { fontSize: 14, fontWeight: "900" },

  /* Timeline */
  timelineWrap: { paddingLeft: 0 },
  timelineWrapDesktop: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  timelineItem: { flexDirection: "row", marginBottom: 0 },
  timelineItemDesktop: { width: "49%", marginBottom: 16 },
  timelineGutter: { width: 28, alignItems: "center", paddingTop: 18 },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  timelineLine: { width: 2, flex: 1, marginTop: 2, marginBottom: -2 },

  /* Meal Card */
  mealCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    marginLeft: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
  },
  mealHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  mealTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  mealTypePillText: { fontSize: 11, fontWeight: "800" },
  mealTime: { fontSize: 11, fontWeight: "600" },
  mealFavBtn: { padding: 4 },
  mealBody: { flexDirection: "row", marginBottom: 12 },
  mealImgBox: {
    width: 90,
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 14,
  },
  mealImg: { width: 90, height: 90, borderRadius: 16 },
  mealInfo: { flex: 1, justifyContent: "center" },
  mealName: { fontSize: 16, fontWeight: "800", marginBottom: 4, lineHeight: 21 },
  mealNameDone: { textDecorationLine: "line-through", opacity: 0.4 },
  mealDesc: { fontSize: 12, lineHeight: 17 },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  macroRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  macroPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
  },
  macroVal: { fontSize: 11, fontWeight: "800", marginRight: 2 },
  macroUnit: { fontSize: 9, fontWeight: "600" },
  mealArrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    gap: 4,
  },
  mealArrowText: { fontSize: 11, fontWeight: "600" },

  /* Empty / Setup */
  emptyWrap: { flex: 1 },
  emptyBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 160 },
  newWeekCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 14,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  newWeekEmoji: { fontSize: 36, marginBottom: 10 },
  newWeekTitle: { fontSize: 18, fontWeight: "900", marginBottom: 6 },
  newWeekDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  favCarryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  favCarryText: { color: "#A87208", fontSize: 11, fontWeight: "700" },
  stepCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  stepHeader: { flexDirection: "row", alignItems: "flex-start" },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  stepBadgeText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  stepTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  stepDesc: { fontSize: 13, lineHeight: 19 },
  stepBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },
  stepBtnText: { fontSize: 14, fontWeight: "700" },
  generateBtn: {
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  genText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  loadRow: { flexDirection: "row", alignItems: "center" },
  hintText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    fontStyle: "italic",
  },
  errBox: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 },
  errText: { fontSize: 13, textAlign: "center", fontWeight: "500" },

  /* Past Empty */
  pastEmptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  pastEmptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 6,
  },
  pastEmptyDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  goCurrentBtn: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  goCurrentText: { fontSize: 14, fontWeight: "700" },

  /* Reflection Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  modalScroll: { maxHeight: 340, marginBottom: 16 },
  reflectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  reflectName: { flex: 1, fontSize: 13, fontWeight: "600", marginRight: 10 },
  reflectBtns: { flexDirection: "row", gap: 8 },
  reflectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalGenBtn: {
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalGenText: { fontSize: 15, fontWeight: "800" },
  modalSkip: { alignItems: "center", paddingVertical: 8 },
  modalSkipText: { fontSize: 12, fontWeight: "600" },

  /* Loading Overlay */
  loadingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  loadingOverlayText: { fontSize: 13, fontWeight: "600" },
});

