import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestoreDB from "@/services/firestoreService";
import { extractAndParseJSON } from "@/utils/parseJSON";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

type Recipe = {
  name: string;
  emoji: string;
  description: string;
  calories: number;
  timeMinutes: number;
  servings: number;
  ingredients: { name: string; amount: string; emoji: string }[];
  instructions: string[];
  doshaBalance: string;
  mealType: string;
};

/* Build a dynamic food image URL from AI's keyword */
const getFoodImageUrl = (keyword?: string, fallbackName?: string): string => {
    const term = keyword || fallbackName || "indian food";
    return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=400&h=300&c=7&rs=1&p=0`;
};

const QUICK_PROMPTS = [
  {
    label: "🌅 Breakfast ideas",
    value: "Suggest healthy Ayurvedic breakfast options",
  },
  { label: "🥗 Light lunch", value: "Light and easy Ayurvedic lunch recipes" },
  { label: "🌙 Dinner", value: "Warm and comforting Ayurvedic dinner recipes" },
  {
    label: "🍵 Detox drinks",
    value: "Ayurvedic detox drink and smoothie recipes",
  },
  {
    label: "🌿 Immunity boosters",
    value: "Immunity boosting Ayurvedic recipes with turmeric and herbs",
  },
  {
    label: "⚡ High protein",
    value: "High protein vegetarian Ayurvedic meals",
  },
];

/* ═══════════════════════════════════════════
   IN-MEMORY RECIPE GENERATION TRACKING
   Preserves loading state and result when
   navigating away and back to this page.
   ═══════════════════════════════════════════ */
let pendingRecipeGeneration: { promise: Promise<Recipe[]>; inputKey: string } | null = null;
let lastRecipeState: { input: string; recipes: Recipe[] } | null = null;

export default function RecipeGeneratorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const uid = user?.uid || "";

  const [doshaType, setDoshaType] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState("");

  // Favorites state
  const [favorites, setFavorites] = useState<any[]>([]);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [maxTime, setMaxTime] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubDosha = firestoreDB.subscribeToDoshaResult(uid, (d) => {
      setDoshaType(d?.doshaType || null);
    });
    const unsubFavs = firestoreDB.subscribeToFavorites(uid, (favs) => {
      setFavorites(favs);
    });
    return () => {
      unsubDosha();
      unsubFavs();
    };
  }, [uid]);

  // Load the most recent generated recipe cache when the screen opens
  useEffect(() => {
    if (!uid) return;

    // If we have an in-memory cached result, use it (faster than Firestore)
    if (lastRecipeState && lastRecipeState.recipes.length > 0 && !pendingRecipeGeneration) {
      console.log("[RecipeGen] ✅ Restoring last result from memory");
      setInput(lastRecipeState.input);
      setRecipes(lastRecipeState.recipes);
      return;
    }

    async function loadRecent() {
      const recent = await firestoreDB.getRecentRecipeCache(uid);
      if (recent && recent.recipes.length > 0) {
        console.log(
          "[RecipeCache] Restored most recent cache for:",
          recent.input,
        );
        setInput(recent.input);
        setRecipes(recent.recipes);
        lastRecipeState = { input: recent.input, recipes: recent.recipes };
      }
    }
    loadRecent();
  }, [uid]);

  // On mount: check if a generation is in-flight
  useEffect(() => {
    if (pendingRecipeGeneration) {
      console.log("[RecipeGen] ⏳ Resuming pending recipe generation");
      setLoading(true);
      if (pendingRecipeGeneration.inputKey) {
        setInput(pendingRecipeGeneration.inputKey);
      }
      pendingRecipeGeneration.promise
        .then((parsed) => {
          if (parsed && parsed.length > 0) {
            setRecipes(parsed);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const toggleFavorite = (recipe: Recipe) => {
    if (!uid) return;
    const isFav = favorites.some((f: any) => f.name === recipe.name && f.source === "recipe-generator");
    let updated;
    if (isFav) {
      updated = favorites.filter((f: any) => !(f.name === recipe.name && f.source === "recipe-generator"));
    } else {
      updated = [...favorites, { ...recipe, source: "recipe-generator" }];
    }
    firestoreDB.saveFavoriteMeals(uid, updated);
  };

  const handleGenerate = async (
    customInput?: string,
    forceRegenerate = false,
  ) => {
    const text = customInput || input;
    if (!text.trim()) return;

    // Don't start if already generating (unless force regenerate)
    if (pendingRecipeGeneration && !forceRegenerate) {
      console.log("[RecipeGen] ⚠️ Generation already in progress");
      return;
    }

    // Clear pending if force regenerating
    if (forceRegenerate) {
      pendingRecipeGeneration = null;
    }

    setLoading(true);
    setError("");
    setRecipes([]);

    const generationPromise = (async (): Promise<Recipe[]> => {
      try {
        if (!forceRegenerate) {
          const cached = await firestoreDB.getRecipeCache(
            text.trim(),
            doshaType,
          );
          if (cached && cached.length > 0) {
            console.log(
              "[RecipeCache] ✅ Found in Global cache:",
              text.trim(),
              "| Dosha:",
              doshaType || "General"
            );
            lastRecipeState = { input: text, recipes: cached };
            return cached;
          } else {
            console.log("[RecipeCache] ❌ Not in cache, calling AI...");
          }
        }

        console.log(`[RecipeGen] 🤖 AI generating recipes for: ${text.trim()}`);
        const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
        const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || defaultUrl;
        
        const res = await fetch(`${API_URL}/api/generate-recipes/`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true'
            },
            body: JSON.stringify({
                query: text.trim(),
                dosha_type: doshaType || null
            })
        });

        if (!res.ok) {
            throw new Error(`Backend error: ${res.status}`);
        }

        const data = await res.json();
        if (data.status !== 'success') {
            throw new Error(data.message || 'Failed to generate recipes');
        }

        const parsed = extractAndParseJSON<Recipe[]>(data.response);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("Parsed data is not a valid recipe array.");
        }

        if (uid) {
          console.log("[RecipeCache] Attempting to save to Firebase...");
          await firestoreDB.saveRecipeCache(uid, text.trim(), doshaType, parsed);
          console.log(
            "[RecipeCache] 💾 Successfully saved global cache for:",
            text.trim(),
          );
        }

        lastRecipeState = { input: text, recipes: parsed };
        return parsed;
      } catch (e: any) {
        console.error("Recipe generation failed:", e);
        throw e;
      } finally {
        pendingRecipeGeneration = null;
      }
    })();

    pendingRecipeGeneration = { promise: generationPromise, inputKey: text };

    try {
      const parsed = await generationPromise;
      setRecipes(parsed);
    } catch (e: any) {
      if (
        e instanceof SyntaxError &&
        e.message.includes("Unterminated string")
      ) {
        setError(
          "The recipe was too long and got cut off by the AI. Please try asking for fewer recipes.",
        );
      } else {
        setError("Failed to parse recipe data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: "/(profile)/recipe-detail",
      params: { recipe: JSON.stringify(recipe) },
    });
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBg}
      />

      <View style={[s.header, { backgroundColor: colors.headerBg }]}>
        <View style={s.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[s.backBtn, { backgroundColor: colors.avatarBg }]}
          >
            <Text style={[s.backText, { color: colors.textOnHeader }]}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[s.headerTitle, { color: colors.textOnHeader }]}>
              Neural Recipe Generator
            </Text>
            <Text style={[s.headerSub, { color: colors.textOnHeaderSub }]}>
              Generate personalized Ayurvedic recipes
            </Text>
          </View>
          {doshaType && (
            <View
              style={[s.doshaBadge, { backgroundColor: `${colors.gold}33` }]}
            >
              <Text style={[s.doshaText, { color: colors.gold }]}>
                {doshaType}
              </Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              s.inputCard,
              { backgroundColor: colors.card, shadowColor: colors.shadow },
            ]}
          >
            <Text style={[s.inputLabel, { color: colors.text }]}>
              WHAT DO YOU WANT TO COOK?
            </Text>
            <TextInput
              style={[
                s.textInput,
                { backgroundColor: colors.inputBg, color: colors.text },
              ]}
              placeholder="e.g., Something light with lentils and spices..."
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={input}
              onChangeText={setInput}
            />
          </View>

          <Text style={[s.sectionLabel, { color: colors.text }]}>
            QUICK IDEAS
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.promptScroll}
          >
            {QUICK_PROMPTS.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.promptChip,
                  { backgroundColor: colors.card, shadowColor: colors.shadow },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setInput(p.value);
                  handleGenerate(p.value);
                }}
              >
                <Text style={[s.promptText, { color: colors.text }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              s.generateBtn,
              {
                backgroundColor: colors.primaryBtn,
                shadowColor: colors.primaryBtn,
              },
              (!input.trim() || loading) && s.generateDisabled,
            ]}
            activeOpacity={0.8}
            onPress={() => handleGenerate()}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <View style={s.loadingRow}>
                <ActivityIndicator color={colors.gold} size="small" />
                <Text
                  style={[s.generateText, { color: colors.primaryBtnText }]}
                >
                  {" "}
                  AI is cooking...
                </Text>
              </View>
            ) : (
              <Text style={[s.generateText, { color: colors.primaryBtnText }]}>
                Generate Recipes →
              </Text>
            )}
          </TouchableOpacity>

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

          {recipes.length > 0 && (
            <>
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>
                  🌿 Suggestions
                </Text>
                <TouchableOpacity
                  style={[s.regenerateBtn, { backgroundColor: colors.surface }]}
                  onPress={() => handleGenerate(undefined, true)}
                  disabled={loading}
                >
                  <Text style={[s.regenerateText, { color: colors.gold }]}>
                    Regenerate 🔄
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Filtering Controls */}
              <View style={[s.filterContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                 <TextInput
                   style={[s.searchInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                   placeholder="Search recipes (e.g., Mung Dal)"
                   placeholderTextColor={colors.inputPlaceholder}
                   value={searchQuery}
                   onChangeText={setSearchQuery}
                 />
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeFilterScroll}>
                   {[null, 15, 30, 45].map((timeOption) => {
                     const isSelected = maxTime === timeOption;
                     return (
                       <TouchableOpacity
                         key={timeOption || 'any'}
                         style={[
                           s.timeFilterChip,
                           { backgroundColor: colors.surface },
                           isSelected && { backgroundColor: colors.gold, borderColor: colors.gold }
                         ]}
                         onPress={() => setMaxTime(timeOption)}
                       >
                         <Text style={[
                           s.timeFilterText,
                           { color: colors.textSecondary },
                           isSelected && { color: "#FFF", fontWeight: "700" }
                         ]}>
                           {timeOption ? `Under ${timeOption}m` : "Any Time"}
                         </Text>
                       </TouchableOpacity>
                     );
                   })}
                 </ScrollView>
              </View>

              {recipes
                .filter(recipe => {
                  const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesTime = maxTime ? recipe.timeMinutes <= maxTime : true;
                  return matchesSearch && matchesTime;
                })
                .map((recipe, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.recipeCard,
                    {
                      backgroundColor: colors.card,
                      shadowColor: colors.shadow,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleRecipePress(recipe)}
                >
                  <View style={s.recipeTop}>
                    <View style={s.recipeImgBox}>
                        <Image
                            source={{ uri: getFoodImageUrl(recipe.name) }}
                            style={s.recipeImg}
                            resizeMode="cover"
                        />
                        <View style={[s.recipeImgBadge, { backgroundColor: `rgba(0,0,0,0.6)` }]}>
                            <Text style={s.recipeImgBadgeText}>{recipe.emoji}</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.recipeName, { color: colors.text }]}>
                        {recipe.name}
                      </Text>
                      <Text
                        style={[s.recipeDesc, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {recipe.description}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFavorite(recipe);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons 
                          name={favorites.some((f: any) => f.name === recipe.name && f.source === "recipe-generator") ? "heart" : "heart-outline"}
                          size={24} 
                          color={favorites.some((f: any) => f.name === recipe.name && f.source === "recipe-generator") ? "#EF4444" : colors.textMuted}
                        />
                      </TouchableOpacity>
                      <View
                        style={[
                          s.recipeArrow,
                          { backgroundColor: colors.surface },
                        ]}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 16,
                            fontWeight: "800",
                          }}
                        >
                          ›
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={s.statsRow}>
                    <View
                      style={[s.statPill, { backgroundColor: colors.surface }]}
                    >
                      <Text style={s.statIcon}>🔥</Text>
                      <Text style={[s.statVal, { color: colors.text }]}>
                        {recipe.calories}
                      </Text>
                      <Text style={[s.statUnit, { color: colors.textMuted }]}>
                        kcal
                      </Text>
                    </View>
                    <View
                      style={[s.statPill, { backgroundColor: colors.surface }]}
                    >
                      <Text style={s.statIcon}>⏱️</Text>
                      <Text style={[s.statVal, { color: colors.text }]}>
                        {recipe.timeMinutes}
                      </Text>
                      <Text style={[s.statUnit, { color: colors.textMuted }]}>
                        min
                      </Text>
                    </View>
                    <View
                      style={[s.statPill, { backgroundColor: colors.surface }]}
                    >
                      <Text style={s.statIcon}>🍽️</Text>
                      <Text style={[s.statVal, { color: colors.text }]}>
                        {recipe.servings}
                      </Text>
                      <Text style={[s.statUnit, { color: colors.textMuted }]}>
                        serve
                      </Text>
                    </View>
                    <View
                      style={[
                        s.mealBadge,
                        { backgroundColor: colors.mealTagBg },
                      ]}
                    >
                      <Text
                        style={[s.mealBadgeText, { color: colors.mealTagText }]}
                      >
                        {recipe.mealType}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[s.doshaNote, { backgroundColor: colors.tipBg }]}
                  >
                    <Text style={s.doshaIcon}>🌿</Text>
                    <Text
                      style={[s.doshaAdvice, { color: colors.tipText }]}
                      numberOfLines={2}
                    >
                      {recipe.doshaBalance}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              
              {recipes.filter(recipe => {
                  const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesTime = maxTime ? recipe.timeMinutes <= maxTime : true;
                  return matchesSearch && matchesTime;
              }).length === 0 && (
                 <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 14 }}>No recipes match your filters.</Text>
                 </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingTop: SAFE_TOP_PADDING,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 18, fontWeight: "700" },
  headerTitle: { fontSize: 20, fontWeight: "900" },
  headerSub: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  doshaBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  doshaText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },
  inputCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  textInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    minHeight: 80,
    fontWeight: "500",
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
    marginLeft: 4,
  },
  promptScroll: { marginBottom: 20 },
  promptChip: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  promptText: { fontSize: 13, fontWeight: "600" },
  generateBtn: {
    borderRadius: 18,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  generateDisabled: { opacity: 0.45 },
  generateText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  loadingRow: { flexDirection: "row", alignItems: "center" },
  errBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  errText: { fontSize: 13, textAlign: "center", fontWeight: "500" },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  regenerateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  regenerateText: { fontSize: 12, fontWeight: "800" },
  filterContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  timeFilterScroll: {
    flexDirection: "row",
  },
  timeFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  timeFilterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  recipeCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  recipeTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  recipeImgBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: "hidden",
    marginRight: 14,
    position: "relative",
  },
  recipeImg: {
    width: "100%",
    height: "100%",
  },
  recipeImgBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  recipeImgBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  recipeName: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  recipeDesc: { fontSize: 13, lineHeight: 19 },
  recipeArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statIcon: { fontSize: 12, marginRight: 4 },
  statVal: { fontSize: 14, fontWeight: "800", marginRight: 2 },
  statUnit: { fontSize: 10, fontWeight: "600" },
  mealBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: "auto",
  },
  mealBadgeText: { fontSize: 11, fontWeight: "700" },
  doshaNote: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 12,
    alignItems: "flex-start",
  },
  doshaIcon: { fontSize: 14, marginRight: 8, marginTop: 1 },
  doshaAdvice: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "500" },
});

