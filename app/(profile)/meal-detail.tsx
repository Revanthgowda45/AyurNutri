import { useAuth } from "@/context/AuthContext";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { useTheme } from "@/context/ThemeContext";
import * as firestoreDB from "@/services/firestoreService";
import { callAI } from "@/utils/aiApi";
import { extractAndParseJSON } from "@/utils/parseJSON";
import { buildMealDetailPrompt } from "@/utils/prompts";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    ImageBackground,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from "react-native";

type Ingredient = {
    name: string;
    quantity: string;
    emoji?: string;
    ayurvedicNote?: string;
};

type VideoSuggestion = {
    title: string;
    channel: string;
    searchQuery: string;
    doshaMatch: number;
    reason: string;
};

type MealData = {
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
};

type AyurvedicDetail = {
    ingredients: Ingredient[];
    instructions?: string[];
    guna: string;
    virya: string;
    doshaEffect: string;
    rasa: string[];
    preparationTip: string;
    videos: VideoSuggestion[];
};

const RASA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Sweet: { bg: "rgba(168,114,8,0.10)", text: "#A87208", border: "rgba(168,114,8,0.22)" },
    Sour: { bg: "rgba(196,78,28,0.10)", text: "#C44E1C", border: "rgba(196,78,28,0.20)" },
    Salty: { bg: "rgba(46,104,176,0.09)", text: "#2E68B0", border: "rgba(46,104,176,0.18)" },
    Pungent: { bg: "rgba(196,78,28,0.10)", text: "#C44E1C", border: "rgba(196,78,28,0.20)" },
    Bitter: { bg: "rgba(54,181,106,0.10)", text: "#36B56A", border: "rgba(54,181,106,0.20)" },
    Astringent: { bg: "rgba(46,104,176,0.09)", text: "#2E68B0", border: "rgba(46,104,176,0.18)" },
};

const TYPE_COLORS: Record<string, string> = {
    "Early Morning": "#F59E0B",
    Breakfast: "#EF4444",
    Lunch: "#10B981",
    Snack: "#8B5CF6",
    Dinner: "#3B82F6",
};

const MEAL_IMAGES: Record<string, string> = {
    "Early Morning": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80",
    Breakfast: "https://images.unsplash.com/photo-1645177628172-a94c1f96debb?w=800&q=80",
    Lunch: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
    Snack: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80",
    Dinner: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80",
};

const INGREDIENT_EMOJI_MAP: Record<string, string> = {
    // Spices & Seasonings
    "Ginger": "🫚", "Fresh Ginger": "🫚", "Dry Ginger": "🫚",
    "Lemon": "🍋", "Lime": "🍋",
    "Honey": "🍯",
    "Water": "💧", "Warm Water": "💧",
    "Cumin Seeds": "🧂", "Cumin": "🧂", "Jeera": "🧂",
    "Turmeric": "🧂", "Haldi": "🧂",
    "Black Pepper": "🧂", "Pepper": "🧂", "Kali Mirch": "🧂",
    "Salt": "🧂", "Rock Salt": "🧂", "Saindhava Lavana": "🧂",
    "Cinnamon": "🪵", "Dalchini": "🪵",
    "Cardamom": "🟢", "Elaichi": "🟢",
    "Cloves": "🍂", "Laung": "🍂",
    "Mustard Seeds": "⚫", "Mustard": "⚫", "Rai": "⚫",
    "Fenugreek": "🌿", "Methi Seeds": "🌿", "Methi": "🌿",
    "Asafoetida": "🧂", "Hing": "🧂",
    "Saffron": "🌸", "Kesar": "🌸",
    "Nutmeg": "🌰", "Jaiphal": "🌰",
    "Chilli": "🌶️", "Green Chilli": "🌶️", "Red Chilli": "🌶️", "Mirch": "🌶️",
    "Curry Leaves": "🍃", "Kadi Patta": "🍃",
    "Coriander Powder": "🧂", "Dhania Powder": "🧂",
    "Fennel Seeds": "🌿", "Saunf": "🌿",

    // Fats & Dairy
    "Ghee": "🧈", "Clarified Butter": "🧈",
    "Milk": "🥛", "Cow Milk": "🥛",
    "Yogurt": "🍦", "Curd": "🍦", "Dahi": "🍦", "Buttermilk": "🥛", "Chaas": "🥛",
    "Paneer": "🧀", "Cheese": "🧀",
    "Butter": "🧈",
    "Coconut Oil": "🥥", "Sesame Oil": "🫗", "Mustard Oil": "🫗", "Olive Oil": "🫗",

    // Grains & Flours
    "Rice": "🍚", "Basmati Rice": "🍚", "Brown Rice": "🍚", "Poha": "🍚",
    "Wheat": "🌾", "Whole Wheat": "🌾", "Atta": "🌾", "Roti": "🫓", "Chapati": "🫓",
    "Barley": "🌾", "Jau": "🌾",
    "Oats": "🥣", "Oatmeal": "🥣",
    "Quinoa": "🥣",
    "Millet": "🌾", "Bajra": "🌾", "Jowar": "🌾", "Ragi": "🌾",
    "Semolina": "🥣", "Suji": "🥣", "Rava": "🥣",

    // Pulses & Lentils
    "Dal": "🥣", "Lentils": "🥣",
    "Moong Dal": "🥣", "Yellow Mung": "🥣", "Green Mung": "🥣",
    "Toor Dal": "🥣", "Arhar Dal": "🥣",
    "Chana Dal": "🥣", "Bengal Gram": "🥣",
    "Urad Dal": "🥣", "Black Gram": "🥣",
    "Masoor Dal": "🥣", "Red Lentils": "🥣",
    "Chickpeas": "🥙", "Chana": "🥙", "Kabuli Chana": "🥙",
    "Rajma": "🥘", "Kidney Beans": "🥘",
    "Sprouts": "🌱", "Moong Sprouts": "🌱",

    // Vegetables
    "Spinach": "🥬", "Palak": "🥬",
    "Coriander": "🌿", "Cilantro": "🌿", "Dhania": "🌿",
    "Mint": "🌿", "Pudina": "🌿",
    "Basil": "🌿", "Tulsi": "🌿",
    "Garlic": "🧄", "Lahsun": "🧄",
    "Onion": "🧅", "Pyaz": "🧅",
    "Tomato": "🍅", "Tamatar": "🍅",
    "Potato": "🥔", "Aloo": "🥔",
    "Carrot": "🥕", "Gajar": "🥕",
    "Cucumber": "🥒", "Kheera": "🥒",
    "Broccoli": "🥦",
    "Cauliflower": "🥦", "Gobi": "🥦",
    "Cabbage": "🥬", "Patta Gobi": "🥬",
    "Peas": "🫛", "Matar": "🫛",
    "Okra": "🥒", "Ladyfinger": "🥒", "Bhindi": "🥒",
    "Eggplant": "🍆", "Aubergine": "🍆", "Baingan": "🍆",
    "Bitter Gourd": "🥒", "Karela": "🥒",
    "Bottle Gourd": "🥒", "Lauki": "🥒",
    "Pumpkin": "🎃", "Kaddu": "🎃",
    "Radish": "🥕", "Muli": "🥕",
    "Beetroot": "🧶",
    "Sweet Potato": "🍠", "Shakarkand": "🍠",

    // Fruits
    "Apple": "🍎", "Seb": "🍎",
    "Banana": "🍌", "Kela": "🍌",
    "Mango": "🥭", "Aam": "🥭",
    "Orange": "🍊", "Santra": "🍊",
    "Grapes": "🍇", "Angoor": "🍇",
    "Pomegranate": "🍎", "Anar": "🍎",
    "Papaya": "🥭", "Papita": "🥭",
    "Coconut": "🥥", "Nariyal": "🥥",
    "Pineapple": "🍍", "Ananas": "🍍",
    "Watermelon": "🍉", "Tarbooj": "🍉",
    "Dates": "🌴", "Khajur": "🌴",
    "Figs": "🥯", "Anjeer": "🥯",
    "Amla": "🟢", "Gooseberry": "🟢",

    // Nuts & Seeds
    "Nuts": "🥜", "Dry Fruits": "🥜",
    "Almonds": "🥜", "Badam": "🥜",
    "Walnuts": "🥜", "Akhrot": "🥜",
    "Cashews": "🥜", "Kaju": "🥜",
    "Pistachios": "🥜", "Pista": "🥜",
    "Peanuts": "🥜", "Mungfali": "🥜",
    "Sesame": "⚪", "Til": "⚪",
    "Flax Seeds": "🟤", "Alsi": "🟤",
    "Chia Seeds": "🥣",
    "Pumpkin Seeds": "🎃",
    "Sunflower Seeds": "🌻",

    // Others
    "Sugar": "🍬", "Brown Sugar": "🍬",
    "Jaggery": "🍬", "Gur": "🍬",
    "Tea": "☕", "Chai": "☕", "Green Tea": "🍵",
    "Coffee": "☕",
    "Egg": "🥚", "Anda": "🥚",
    "Chicken": "🍗", "Murgh": "🍗",
    "Fish": "🐟", "Machli": "🐟",
    "Mutton": "🍖", "Meat": "🍖",
};

const getIngredientEmoji = (name: string, aiEmoji?: string) => {
    if (aiEmoji) return aiEmoji;
    const normalized = name.trim();
    // Try exact match first
    if (INGREDIENT_EMOJI_MAP[normalized]) return INGREDIENT_EMOJI_MAP[normalized];
    // Try partial match
    for (const [key, value] of Object.entries(INGREDIENT_EMOJI_MAP)) {
        if (normalized.toLowerCase().includes(key.toLowerCase())) return value;
    }
    return "🌿"; // Default emoji
};

/* Build a dynamic food image URL from AI's keyword */
const getFoodImageUrl = (keyword?: string, fallbackName?: string, mealType?: string): string => {
    const term = keyword || fallbackName;
    if (term) {
        return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=800&h=400&c=7&rs=1&p=0`;
    }
    return MEAL_IMAGES[mealType || "Lunch"];
};

/* ═══════════════════════════════════════════
   PER-MEAL AI DEDUP
   - Same meal opened twice → reuse the in-flight promise
   - Different meals → run in parallel (no blocking)
   ═══════════════════════════════════════════ */
const pendingGenerations = new Map<string, Promise<AyurvedicDetail | null>>();

function getMealCacheKey(mealName: string, doshaType?: string): string {
    return `${(doshaType || "general").toLowerCase()}_${mealName.toLowerCase()}`;
}

/** Start or reuse an AI generation for a specific meal */
function getOrStartGeneration(
    cacheKey: string,
    uid: string,
    mealName: string,
    mealType: string,
    doshaType?: string
): Promise<AyurvedicDetail | null> {
    // If this exact meal is already being generated, reuse that promise
    const existing = pendingGenerations.get(cacheKey);
    if (existing) {
        console.log(`[MealDetail] ⏳ Reusing pending AI generation for: ${mealName}`);
        return existing;
    }

    // Start a new generation (runs independently, doesn't block other meals)
    console.log(`[MealDetail] 🤖 Starting AI generation for: ${mealName}`);
    const generationPromise = (async (): Promise<AyurvedicDetail | null> => {
        try {
            const prompt = buildMealDetailPrompt(mealName, mealType, doshaType);
            const result = await callAI(prompt, 4000);
            
            const parsed = extractAndParseJSON(result);

            await firestoreDB.saveMealDetail(uid, mealName, parsed, doshaType);
            console.log(`[MealDetail] 💾 Saved to cache: ${mealName} (${doshaType || "Tridosha"})`);

            return parsed as AyurvedicDetail;
        } catch (e) {
            console.error("AI generation failed:", e);
            return null;
        } finally {
            pendingGenerations.delete(cacheKey);
        }
    })();

    pendingGenerations.set(cacheKey, generationPromise);
    return generationPromise;
}

export default function MealDetailScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const params = useLocalSearchParams<{ meal: string }>();
    const [activeTab, setActiveTab] = useState<"overview" | "ingredients" | "videos">("overview");
    const [detail, setDetail] = useState<AyurvedicDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiError, setAiError] = useState(false);
    const [doshaType, setDoshaType] = useState<string | undefined>(undefined);
    const [doshaLoaded, setDoshaLoaded] = useState(false);

    let meal: MealData;
    try {
        meal = JSON.parse(params.meal || "{}");
    } catch {
        meal = {} as MealData;
    }

    const typeColor = TYPE_COLORS[meal.type] || colors.gold;
    const totalMacro = (meal.protein || 0) * 4 + (meal.carbs || 0) * 4 + (meal.fat || 0) * 9 || 1;
    const proteinPct = Math.round(((meal.protein || 0) * 4 / totalMacro) * 100);
    const carbsPct = Math.round(((meal.carbs || 0) * 4 / totalMacro) * 100);
    const fatPct = 100 - proteinPct - carbsPct;

    // Fetch dosha type
    useEffect(() => {
        if (!user?.uid) {
            setDoshaLoaded(true);
            return;
        }
        const unsub = firestoreDB.subscribeToDoshaResult(user.uid, (d) => {
            setDoshaType(d?.doshaType || undefined);
            setDoshaLoaded(true);
        });
        return () => unsub();
    }, [user?.uid]);

    // Fetch Ayurvedic detail — cache-first, then queued AI generation
    useEffect(() => {
        if (!meal.name || !user?.uid || !doshaLoaded) return;
        let cancelled = false;
        const cacheKey = getMealCacheKey(meal.name, doshaType);

        const fetchDetail = async () => {
            setLoading(true);
            setAiError(false);
            try {
                // 1️⃣ Check Firebase cache first
                const cached = await firestoreDB.getMealDetail(meal.name, doshaType);
                if (cached && !cancelled) {
                    console.log(`[MealDetail] ✅ Loaded from cache: ${meal.name} (${doshaType || "Tridosha"})`);
                    setDetail(cached);
                    setLoading(false);
                    return;
                }

                // 2️⃣ Cache miss — start or reuse AI generation (parallel for different meals)
                const generatedDetail = await getOrStartGeneration(
                    cacheKey, user.uid!, meal.name, meal.type, doshaType
                );

                if (!cancelled) {
                    setDetail(generatedDetail);
                }
            } catch (e) {
                console.error("Meal detail fetch failed:", e);
                if (!cancelled) {
                    setDetail(null);
                    setAiError(true);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchDetail();
        return () => { cancelled = true; };
    }, [meal.name, user?.uid, doshaLoaded, doshaType]);

    const openYouTube = (query: string) => {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        Linking.openURL(url);
    };

    const handleRegenerate = async () => {
        if (!user?.uid || !meal.name || loading) return;
        setLoading(true);
        setDetail(null);
        setAiError(false);
        
        // Ensure pending lock is cleared before regenerating
        pendingGenerations.delete(getMealCacheKey(meal.name, doshaType));
        
        try {
            const prompt = buildMealDetailPrompt(meal.name, meal.type, doshaType);
            const result = await callAI(prompt, 4000);
            const parsed = extractAndParseJSON(result);
            setDetail(parsed);
            firestoreDB.saveMealDetail(user.uid!, meal.name, parsed, doshaType);
            console.log(`[MealDetail] 🔄 Regenerated & saved to Global cache: ${meal.name}`);
        } catch (e: any) {
            console.error("Regenerate failed:", e);
            alert("Regenerate failed: " + (e?.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const getMatchColor = (score: number) => {
        if (score >= 70) return { bg: "rgba(54,181,106,0.10)", text: "#36B56A", bar: "#36B56A" };
        if (score >= 45) return { bg: "rgba(168,114,8,0.10)", text: "#A87208", bar: "#A87208" };
        return { bg: "rgba(196,78,28,0.10)", text: "#C44E1C", bar: "#C44E1C" };
    };

    const macroPills = [
        { label: "KCAL", value: `${meal.calories || 0}`, color: "#A87208", icon: "flame-outline" as const },
        { label: "PROTEIN", value: `${meal.protein || 0}g`, color: "#2E68B0", icon: "fitness-outline" as const },
        { label: "CARBS", value: `${meal.carbs || 0}g`, color: "#36B56A", icon: "leaf-outline" as const },
        { label: "FAT", value: `${meal.fat || 0}g`, color: "#C44E1C", icon: "water-outline" as const },
    ].map((m, i) => (
        <View key={i} style={[s.macroPill, { backgroundColor: colors.card, shadowColor: colors.shadow, borderTopColor: m.color }]}>
            <Ionicons name={m.icon} size={14} color={m.color} style={{ marginBottom: 2 }} />
            <Text style={[s.macroValue, { color: m.color }]}>{m.value}</Text>
            <Text style={[s.macroLabel, { color: colors.textMuted }]}>{m.label}</Text>
        </View>
    ));

    return (
        <View style={[s.screen, { backgroundColor: colors.background, flexDirection: isDesktop ? 'row' : 'column' }]}>
            <StatusBar barStyle="light-content" backgroundColor={typeColor} />

            <View style={isDesktop ? { flex: 4, height: '100%' } : undefined}>
                {/* ─── Hero Header with Food Image ─── */}
                <ImageBackground
                    source={{ uri: getFoodImageUrl(meal.imageKeyword, meal.name, meal.type) }}
                    style={[s.hero, isDesktop && { height: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.75)"]}
                        locations={[0, 0.5, 1]}
                        style={s.heroOverlay}
                    />
                    <View style={[s.heroContent, isDesktop && { paddingBottom: 120 }]}>
                        <View style={s.heroTop}>
                            <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
                                <Ionicons name="chevron-back" size={20} color={colors.textOnHeader} />
                            </TouchableOpacity>
                            <View style={s.heroTopRight}>
                                <TouchableOpacity onPress={handleRegenerate} style={s.regenBtn} activeOpacity={0.7}>
                                    <Ionicons name="refresh-outline" size={18} color={colors.textOnHeader} />
                                </TouchableOpacity>
                                <View style={[s.heroBadge, { backgroundColor: `${typeColor}E8` }]}>
                                    <Text style={s.heroBadgeEmoji}>{meal.emoji}</Text>
                                    <Text style={[s.heroBadgeText, { color: colors.textOnHeader }]}>{meal.type?.toUpperCase()}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={s.heroBottom}>
                            <Text style={[s.heroName, { color: colors.textOnHeader }]}>{meal.name}</Text>
                            <View style={s.heroInfoRow}>
                                <View style={s.heroTimePill}>
                                    <Ionicons name="time-outline" size={13} color={colors.textOnHeaderSub} />
                                    <Text style={[s.heroTime, { color: colors.textOnHeaderSub }]}>{meal.time}</Text>
                                </View>
                                {detail?.doshaEffect && (
                                    <View style={s.doshaEffectBadge}>
                                        <Ionicons name="checkmark-circle" size={13} color="#4ADE80" />
                                        <Text style={[s.doshaEffectText, { color: colors.textOnHeader }]}>{detail.doshaEffect}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </ImageBackground>

                {/* ─── Macro Pills (Desktop Absolute Bottom) ─── */}
                {isDesktop && (
                    <View style={[s.macroRow, { position: 'absolute', bottom: 20, left: 20, right: 20, marginTop: 0 }]}>
                        {macroPills}
                    </View>
                )}
            </View>

            {/* ─── Macro Pills (Mobile Flow) ─── */}
            {!isDesktop && (
                <View style={[s.macroRow, { backgroundColor: colors.background }]}>
                    {macroPills}
                </View>
            )}

            {/* ─── Right Column (Desktop) / Bottom Flow (Mobile) ─── */}
            <View style={isDesktop ? { flex: 5, height: '100%' } : { flex: 1 }}>

            {/* ─── Tabs ─── */}
            <View style={[s.tabBar, { borderBottomColor: colors.cardBorder || "rgba(0,0,0,0.05)", backgroundColor: colors.background }]}>
                {([
                    { key: "overview" as const, label: "Overview", icon: "document-text-outline" as const },
                    { key: "ingredients" as const, label: "Ingredients", icon: "nutrition-outline" as const },
                    { key: "videos" as const, label: "Videos", icon: "videocam-outline" as const },
                ] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={[s.tab, activeTab === tab.key && { borderBottomColor: typeColor }]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? typeColor : colors.textMuted} style={{ marginBottom: 3 }} />
                        <Text style={[s.tabText, { color: colors.textMuted }, activeTab === tab.key && { color: typeColor, fontWeight: "800" }]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ─── Tab Content ─── */}
            <ScrollView contentContainerStyle={isDesktop ? [s.body, { maxWidth: '100%', padding: 40 }] : s.body} showsVerticalScrollIndicator={false}>
                {activeTab === "overview" ? (
                    <>
                        {/* Description */}
                        <View style={[s.descCard, { backgroundColor: colors.card, borderColor: colors.cardBorder || "transparent" }]}>
                            <View style={[s.descIconWrap, { backgroundColor: `${typeColor}15` }]}>
                                <Ionicons name="sparkles" size={16} color={typeColor} />
                            </View>
                            <Text style={[s.description, { color: colors.textSecondary || colors.textMuted }]}>{meal.description}</Text>
                        </View>

                        {/* Nutrition Breakdown */}
                        <View style={s.sectionLabelRow}>
                            <View style={[s.sectionAccent, { backgroundColor: typeColor }]} />
                            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>NUTRITION BREAKDOWN</Text>
                        </View>
                        <View style={[s.nutritionCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                            {[
                                { name: "Protein", pct: proteinPct, val: `${meal.protein || 0}g`, color: "#2E68B0", icon: "fitness-outline" as const },
                                { name: "Carbs", pct: carbsPct, val: `${meal.carbs || 0}g`, color: "#36B56A", icon: "leaf-outline" as const },
                                { name: "Fat", pct: fatPct, val: `${meal.fat || 0}g`, color: "#C44E1C", icon: "water-outline" as const },
                            ].map((n, i) => (
                                <View key={i} style={s.nutritionRow}>
                                    <View style={s.nutritionHeader}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: `${n.color}15`, alignItems: "center", justifyContent: "center" }}>
                                                <Ionicons name={n.icon} size={12} color={n.color} />
                                            </View>
                                            <Text style={[s.nutritionName, { color: colors.text }]}>{n.name}</Text>
                                        </View>
                                        <Text style={[s.nutritionVal, { color: colors.textMuted }]}>{n.val} · {n.pct}%</Text>
                                    </View>
                                    <View style={[s.barTrack, { backgroundColor: colors.surface }]}>
                                        <View style={[s.barFill, { backgroundColor: n.color, width: `${Math.min(n.pct, 100)}%` }]} />
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Loading state for AI data */}
                        {(!doshaLoaded || loading) && (
                            <View style={s.loadingBox}>
                                <View style={[s.loadingPulse, { backgroundColor: `${typeColor}15` }]}>
                                    <ActivityIndicator color={typeColor} size="small" />
                                </View>
                                <Text style={[s.loadingText, { color: colors.textMuted }]}>
                                    {!doshaLoaded ? "Loading your dosha profile..." : "Generating Ayurvedic analysis..."}
                                </Text>
                                <Text style={[s.loadingSubtext, { color: colors.textMuted }]}>This may take a few moments</Text>
                            </View>
                        )}

                        {/* Error state with retry */}
                        {!loading && aiError && !detail && (
                            <View style={[s.loadingBox, { paddingVertical: 24 }]}>
                                <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
                                <Text style={[s.loadingText, { color: colors.textMuted, marginTop: 8, textAlign: "center" }]}>
                                    AI analysis couldn't be generated right now.{"\n"}The AI servers may be busy.
                                </Text>
                                <TouchableOpacity 
                                    onPress={handleRegenerate} 
                                    style={[s.retryBtn, { backgroundColor: typeColor }]} 
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="refresh" size={16} color="#fff" />
                                    <Text style={s.retryBtnText}>  Tap to Retry</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Ayurvedic Profile */}
                        {!loading && detail && (detail.guna || detail.virya || detail.doshaEffect) && (
                            <>
                                <View style={s.sectionLabelRow}>
                                    <View style={[s.sectionAccent, { backgroundColor: typeColor }]} />
                                    <Text style={[s.sectionLabel, { color: colors.textMuted }]}>AYURVEDIC PROFILE</Text>
                                </View>
                                <View style={s.profileGrid}>
                                    {detail.guna ? (
                                        <View style={[s.profileCard, { backgroundColor: colors.card, borderLeftColor: "#8B5CF6" }]}>
                                            <View style={[s.profileIconWrap, { backgroundColor: "rgba(139,92,246,0.10)" }]}>
                                                <Ionicons name="flower-outline" size={14} color="#8B5CF6" />
                                            </View>
                                            <Text style={[s.profileLabel, { color: colors.textMuted }]}>GUNA</Text>
                                            <Text style={[s.profileValue, { color: colors.text }]}>{detail.guna}</Text>
                                        </View>
                                    ) : null}
                                    {detail.virya ? (
                                        <View style={[s.profileCard, { backgroundColor: colors.card, borderLeftColor: "#EF4444" }]}>
                                            <View style={[s.profileIconWrap, { backgroundColor: "rgba(239,68,68,0.10)" }]}>
                                                <Ionicons name="thermometer-outline" size={14} color="#EF4444" />
                                            </View>
                                            <Text style={[s.profileLabel, { color: colors.textMuted }]}>VIRYA</Text>
                                            <Text style={[s.profileValue, { color: colors.text }]}>{detail.virya}</Text>
                                        </View>
                                    ) : null}
                                    {detail.doshaEffect ? (
                                        <View style={[s.profileCard, { backgroundColor: colors.card, borderLeftColor: "#10B981" }]}>
                                            <View style={[s.profileIconWrap, { backgroundColor: "rgba(16,185,129,0.10)" }]}>
                                                <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
                                            </View>
                                            <Text style={[s.profileLabel, { color: colors.textMuted }]}>DOSHA EFFECT</Text>
                                            <Text style={[s.profileValue, { color: colors.text }]}>{detail.doshaEffect}</Text>
                                        </View>
                                    ) : null}
                                    {meal.time ? (
                                        <View style={[s.profileCard, { backgroundColor: colors.card, borderLeftColor: "#F59E0B" }]}>
                                            <View style={[s.profileIconWrap, { backgroundColor: "rgba(245,158,11,0.10)" }]}>
                                                <Ionicons name="time-outline" size={14} color="#F59E0B" />
                                            </View>
                                            <Text style={[s.profileLabel, { color: colors.textMuted }]}>BEST TIME</Text>
                                            <Text style={[s.profileValue, { color: colors.text }]}>{meal.time}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </>
                        )}

                        {/* Rasa Tags */}
                        {!loading && detail?.rasa && detail.rasa.length > 0 && (
                            <>
                                <View style={s.sectionLabelRow}>
                                    <View style={[s.sectionAccent, { backgroundColor: typeColor }]} />
                                    <Text style={[s.sectionLabel, { color: colors.textMuted }]}>RASA — TASTE PROFILE</Text>
                                </View>
                                <View style={s.rasaRow}>
                                    {detail.rasa.map((r, i) => {
                                        const rc = RASA_COLORS[r] || { bg: "rgba(100,100,100,0.1)", text: "#888", border: "rgba(100,100,100,0.2)" };
                                        return (
                                            <View key={i} style={[s.rasaTag, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                                                <Text style={[s.rasaText, { color: rc.text }]}>{r}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* Preparation Tip */}
                        {!loading && detail?.preparationTip && (
                            <>
                                <View style={s.sectionLabelRow}>
                                    <View style={[s.sectionAccent, { backgroundColor: typeColor }]} />
                                    <Text style={[s.sectionLabel, { color: colors.textMuted }]}>AYURVEDIC TIP</Text>
                                </View>
                                <View style={[s.prepCard, { backgroundColor: colors.tipBg, borderColor: colors.tipBorder, borderLeftColor: typeColor }]}>
                                    <View style={[s.prepIconWrap, { backgroundColor: `${typeColor}15` }]}>
                                        <Text style={s.prepIcon}>🌿</Text>
                                    </View>
                                    <Text style={[s.prepText, { color: colors.tipText }]}>{detail.preparationTip}</Text>
                                </View>
                            </>
                        )}
                    </>
                ) : activeTab === "ingredients" ? (
                    <>
                        {/* Ingredients Tab */}
                        {!doshaLoaded || loading ? (
                            <View style={s.loadingBox}>
                                <View style={[s.loadingPulse, { backgroundColor: `${typeColor}15` }]}>
                                    <ActivityIndicator color={typeColor} size="small" />
                                </View>
                                <Text style={[s.loadingText, { color: colors.textMuted }]}>
                                    {!doshaLoaded ? "Loading your dosha profile..." : "Loading ingredients & recipe..."}
                                </Text>
                                <Text style={[s.loadingSubtext, { color: colors.textMuted }]}>This may take a few moments</Text>
                            </View>
                        ) : detail?.ingredients && detail.ingredients.length > 0 ? (
                            <>
                                <View style={s.ingHeader}>
                                    <Text style={[s.ingTitle, { color: colors.text }]}>
                                        {detail.ingredients.length} Ingredients
                                    </Text>
                                    <View style={[s.ingBadge, { backgroundColor: "rgba(54,181,106,0.10)" }]}>
                                        <Text style={{ color: "#36B56A", fontSize: 11, fontWeight: "700" }}>✅ Dosha-matched</Text>
                                    </View>
                                </View>

                                {detail.ingredients.map((ing, i) => {
                                    const hasName = !!ing.name?.trim();
                                    const hasQty = !!ing.quantity?.trim();
                                    const isQtyOnly = !hasName && hasQty;
                                    const displayName = isQtyOnly ? ing.quantity : ing.name || "Unknown Ingredient";
                                    const displayQty = isQtyOnly ? null : ing.quantity;

                                    return (
                                        <View key={i} style={[s.ingItem, { backgroundColor: colors.card, borderColor: colors.cardBorder || "transparent" }]}>
                                            <View style={s.ingNum}>
                                                <Text style={s.ingNumText}>{i + 1}</Text>
                                            </View>
                                            <View style={s.ingInfo}>
                                                <View style={s.ingNameRow}>
                                                    <Text style={s.ingEmoji}>{getIngredientEmoji(displayName, ing.emoji)}</Text>
                                                    <Text style={[s.ingName, { color: colors.text }]} numberOfLines={2}>{displayName}</Text>
                                                </View>
                                                {ing.ayurvedicNote ? (
                                                    <Text style={[s.ingNote, { color: colors.textMuted }]}>{ing.ayurvedicNote}</Text>
                                                ) : null}
                                            </View>
                                            {displayQty ? (
                                                <View style={s.ingQty}>
                                                    <Text style={s.ingQtyText} numberOfLines={2}>{displayQty}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                })}

                                {/* ─── Step-by-Step Instructions ─── */}
                                {detail.instructions && detail.instructions.length > 0 && (
                                    <>
                                        <View style={s.instrDivider} />
                                        <View style={s.instrHeader}>
                                            <Ionicons name="restaurant-outline" size={18} color={typeColor} />
                                            <Text style={[s.instrTitle, { color: colors.text }]}>  How to Prepare</Text>
                                        </View>
                                        <Text style={[s.instrSubtitle, { color: colors.textMuted }]}>
                                            {detail.instructions.length} easy steps to make this dish
                                        </Text>

                                        {detail.instructions.map((step, i) => {
                                            const cleanStep = step.replace(/^Step\s*\d+\s*[:.]\s*/i, "");
                                            const isLast = i === (detail.instructions?.length || 0) - 1;
                                            return (
                                                <View key={i} style={s.instrStep}>
                                                    {/* Timeline */}
                                                    <View style={s.instrTimeline}>
                                                        <View style={[s.instrDot, { backgroundColor: typeColor }]}>
                                                            <Text style={s.instrDotText}>{i + 1}</Text>
                                                        </View>
                                                        {!isLast && <View style={[s.instrLine, { backgroundColor: `${typeColor}30` }]} />}
                                                    </View>
                                                    {/* Content */}
                                                    <View style={[s.instrContent, { backgroundColor: colors.card, borderColor: colors.cardBorder || "transparent" }]}>
                                                        <Text style={[s.instrText, { color: colors.text }]}>{cleanStep}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </>
                                )}
                            </>
                        ) : (
                            <View style={[s.emptyCard, { backgroundColor: colors.card }]}>
                                <Text style={{ fontSize: 36, marginBottom: 10 }}>📋</Text>
                                <Text style={[s.emptyTitle, { color: colors.text }]}>No Ingredients Data</Text>
                                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                                    Could not load ingredient details. Please try again later.
                                </Text>
                            </View>
                        )}
                    </>
                ) : (
                    <>
                        {/* Videos Tab */}
                        {!doshaLoaded || loading ? (
                            <View style={s.loadingBox}>
                                <View style={[s.loadingPulse, { backgroundColor: `${typeColor}15` }]}>
                                    <ActivityIndicator color={typeColor} size="small" />
                                </View>
                                <Text style={[s.loadingText, { color: colors.textMuted }]}>
                                    {!doshaLoaded ? "Loading your dosha profile..." : "Loading recipe videos..."}
                                </Text>
                                <Text style={[s.loadingSubtext, { color: colors.textMuted }]}>This may take a few moments</Text>
                            </View>
                        ) : detail?.videos && detail.videos.length > 0 ? (
                            <>
                                <View style={s.vidHeader}>
                                    <Text style={[s.vidHeaderTitle, { color: colors.text }]}>🎬 Recipe Videos</Text>
                                    <View style={[s.vidHeaderBadge, { backgroundColor: "rgba(54,181,106,0.10)", borderColor: "rgba(54,181,106,0.20)" }]}>
                                        <Text style={{ color: "#36B56A", fontSize: 10, fontWeight: "700" }}>{detail.videos.length} videos · by match</Text>
                                    </View>
                                </View>

                                {detail.videos.slice(0, 1).map((vid, i) => {
                                    const mc = getMatchColor(vid.doshaMatch);
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[s.vidCard, { backgroundColor: colors.card, shadowColor: colors.shadow, borderColor: colors.cardBorder }]}
                                            activeOpacity={0.7}
                                            onPress={() => openYouTube(vid.searchQuery)}
                                        >
                                            {/* Thumbnail placeholder with play button */}
                                            <View style={[s.vidThumb, { backgroundColor: colors.surface }]}>
                                                <View style={s.vidPlayCircle}>
                                                    <Text style={s.vidPlayIcon}>▶</Text>
                                                </View>
                                                {/* Rank badge */}
                                                <View style={s.vidRank}>
                                                    <Text style={s.vidRankText}>{i + 1}</Text>
                                                </View>
                                                {/* Match score */}
                                                <View style={[s.vidScore, { backgroundColor: mc.bg }]}>
                                                    <Text style={[s.vidScoreText, { color: mc.text }]}>{vid.doshaMatch}%</Text>
                                                </View>
                                            </View>

                                            {/* Video info */}
                                            <View style={s.vidInfo}>
                                                <View style={s.vidRow1}>
                                                    <View style={[s.vidAvatar, { backgroundColor: colors.headerBg }]}>
                                                        <Text style={s.vidAvatarText}>{vid.channel?.charAt(0) || "?"}</Text>
                                                    </View>
                                                    <View style={s.vidMeta}>
                                                        <Text style={[s.vidTitle, { color: colors.text }]} numberOfLines={2}>{vid.title}</Text>
                                                        <Text style={[s.vidChannel, { color: colors.textMuted }]}>{vid.channel}</Text>
                                                    </View>
                                                </View>

                                                {/* Match bar */}
                                                <View style={s.vidBarRow}>
                                                    <View style={[s.vidBarTrack, { backgroundColor: colors.surface }]}>
                                                        <View style={[s.vidBarFill, { backgroundColor: mc.bar, width: `${vid.doshaMatch}%` }]} />
                                                    </View>
                                                    <Text style={[s.vidBarPct, { color: colors.textMuted }]}>{vid.doshaMatch}% match</Text>
                                                </View>

                                                {/* Reason */}
                                                <View style={[s.vidReason, { backgroundColor: colors.surface }]}>
                                                    <Text style={[s.vidReasonText, { color: colors.textMuted }]}>{vid.reason}</Text>
                                                </View>


                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        ) : (
                            <View style={[s.emptyCard, { backgroundColor: colors.card }]}>
                                <Text style={{ fontSize: 36, marginBottom: 10 }}>🎬</Text>
                                <Text style={[s.emptyTitle, { color: colors.text }]}>No Videos Found</Text>
                                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                                    Could not load recipe videos. Please try again later.
                                </Text>
                            </View>
                        )}
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1 },

    /* Hero */
    hero: { height: 280, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" },
    heroOverlay: { ...StyleSheet.absoluteFillObject },
    heroContent: { flex: 1, paddingTop: SAFE_TOP_PADDING, paddingBottom: 28, paddingHorizontal: 22, justifyContent: "space-between", position: "relative", zIndex: 2 },
    heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    heroTopRight: { flexDirection: "row", alignItems: "center", gap: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.20)", alignItems: "center", justifyContent: "center" },
    regenBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.20)", alignItems: "center", justifyContent: "center" },
    heroBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
    heroBadgeEmoji: { fontSize: 13 },
    heroBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
    heroBottom: { alignItems: "center" },
    heroName: { fontSize: 24, fontWeight: "900", textAlign: "center", lineHeight: 32, marginBottom: 8, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
    heroInfoRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" },
    heroTimePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
    heroTime: { color: "rgba(255,255,255,0.90)", fontSize: 12, fontWeight: "700" },
    doshaEffectBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(74,222,128,0.12)", borderWidth: 1, borderColor: "rgba(74,222,128,0.25)" },
    doshaEffectText: { fontSize: 12, fontWeight: "700" },

    /* Macro Pills */
    macroRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: -20, marginBottom: 8 },
    macroPill: { flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", borderTopWidth: 2.5, borderWidth: 1, borderColor: "rgba(0,0,0,0.04)", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    macroValue: { fontSize: 18, fontWeight: "900" },
    macroLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 1, marginTop: 3 },

    /* Tabs */
    tabBar: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 },
    tab: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2.5, borderBottomColor: "transparent" },
    tabText: { fontSize: 13, fontWeight: "600" },

    /* Body */
    body: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 80 },
    descCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, padding: 16, marginBottom: 18, borderWidth: 1 },
    descIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
    description: { flex: 1, fontSize: 14, lineHeight: 22, fontWeight: "500" },
    sectionLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 14, gap: 8 },
    sectionAccent: { width: 3, height: 12, borderRadius: 2 },
    sectionLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 2 },

    /* Loading */
    loadingBox: { alignItems: "center", justifyContent: "center", paddingVertical: 32 },
    loadingPulse: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    loadingText: { fontSize: 13, fontWeight: "600", marginTop: 4 },
    loadingSubtext: { fontSize: 11, fontWeight: "400", marginTop: 2, opacity: 0.6 },

    /* Nutrition */
    nutritionCard: { borderRadius: 18, padding: 16, marginBottom: 4, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    nutritionRow: { marginBottom: 12 },
    nutritionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
    nutritionName: { fontSize: 12, fontWeight: "700" },
    nutritionVal: { fontSize: 11 },
    barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
    barFill: { height: 6, borderRadius: 3 },

    /* Ayurvedic Profile */
    profileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
    profileCard: { width: "47%", borderRadius: 14, padding: 14, borderLeftWidth: 3 },
    profileIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 6 },
    profileLabel: { fontSize: 8, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
    profileValue: { fontSize: 13, fontWeight: "700", lineHeight: 18 },

    /* Rasa Tags */
    rasaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
    rasaTag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
    rasaText: { fontSize: 12, fontWeight: "700" },

    /* Prep Tip */
    prepCard: { flexDirection: "row", borderRadius: 16, padding: 14, borderWidth: 1, borderLeftWidth: 4, alignItems: "flex-start", gap: 10 },
    prepIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    prepIcon: { fontSize: 16 },
    prepText: { flex: 1, fontSize: 13, lineHeight: 21, fontWeight: "500" },

    /* Ingredients */
    ingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    ingTitle: { fontSize: 16, fontWeight: "800" },
    ingBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    ingItem: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1 },
    ingNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(54,181,106,0.10)", alignItems: "center", justifyContent: "center" },
    ingNumText: { color: "#36B56A", fontSize: 10, fontWeight: "800" },
    ingInfo: { flex: 1, minWidth: 0 },
    ingNameRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    ingEmoji: { fontSize: 16 },
    ingName: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
    ingNote: { fontSize: 10, marginTop: 4, marginLeft: 24, lineHeight: 14 },
    ingQty: { flexShrink: 1, maxWidth: "40%", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: "rgba(168,114,8,0.10)" },
    ingQtyText: { color: "#A87208", fontSize: 11, fontWeight: "800", textAlign: "right" },

    /* Videos */
    vidHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    vidHeaderTitle: { fontSize: 16, fontWeight: "800" },
    vidHeaderBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    vidCard: { borderRadius: 18, overflow: "hidden", marginBottom: 14, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, borderWidth: 1 },
    vidThumb: { height: 160, alignItems: "center", justifyContent: "center", position: "relative" },
    vidPlayCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(220,20,20,0.90)", alignItems: "center", justifyContent: "center" },
    vidPlayIcon: { color: "#fff", fontSize: 18, marginLeft: 3 },
    vidRank: { position: "absolute", top: 10, left: 10, width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
    vidRankText: { color: "#fff", fontSize: 10, fontWeight: "800" },
    vidScore: { position: "absolute", top: 10, right: 10, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
    vidScoreText: { fontSize: 10, fontWeight: "800" },
    vidInfo: { padding: 14 },
    vidRow1: { flexDirection: "row", gap: 10, marginBottom: 10 },
    vidAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    vidAvatarText: { color: "#fff", fontSize: 13, fontWeight: "800" },
    vidMeta: { flex: 1, minWidth: 0 },
    vidTitle: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
    vidChannel: { fontSize: 10, marginTop: 2 },
    vidBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    vidBarTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
    vidBarFill: { height: 5, borderRadius: 3 },
    vidBarPct: { fontSize: 10, fontWeight: "800" },
    vidReason: { borderRadius: 10, padding: 10, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: "rgba(54,181,106,0.20)" },
    vidReasonText: { fontSize: 11, lineHeight: 17, fontStyle: "italic" },
    vidBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
    vidBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

    /* Empty */
    emptyCard: { borderRadius: 20, padding: 30, alignItems: "center" },
    emptyTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
    emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 20 },

    /* Retry */
    retryBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 14 },
    retryBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

    /* Instructions */
    instrDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginVertical: 20 },
    instrHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    instrTitle: { fontSize: 16, fontWeight: "800" },
    instrSubtitle: { fontSize: 11, marginBottom: 16, marginLeft: 26 },
    instrStep: { flexDirection: "row", minHeight: 48 },
    instrTimeline: { width: 32, alignItems: "center" },
    instrDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", zIndex: 1 },
    instrDotText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    instrLine: { width: 2, flex: 1, marginTop: -1, marginBottom: -1 },
    instrContent: { flex: 1, marginLeft: 10, marginBottom: 10, borderRadius: 14, padding: 14, borderWidth: 1 },
    instrText: { fontSize: 13, lineHeight: 20, fontWeight: "500" },
});

