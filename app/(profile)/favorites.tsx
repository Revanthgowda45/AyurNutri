import { useAuth } from "@/context/AuthContext";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/services/firestoreService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getTodayIndex, getWeekStartDate } from "@/utils/weekUtils";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

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

export default function FavoritesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const uid = user?.uid || "";

    const [favorites, setFavorites] = useState<any[]>([]);
    const [todayMeals, setTodayMeals] = useState<any[]>([]);
    const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<"diet" | "recipe">("diet");

    useEffect(() => {
        if (!uid) {
            setLoading(false);
            return;
        }
        const unsub = firestore.subscribeToFavorites(uid, (favs) => {
            setFavorites(favs);
            setLoading(false);
        });

        const weekStart = getWeekStartDate();
        const unsubMealPlan = firestore.subscribeToMealPlanWeek(uid, weekStart, (data: any) => {
            if (data?.weekPlan?.days) {
                const todayIdx = getTodayIndex();
                const meals = data.weekPlan.days[todayIdx]?.meals || [];
                setTodayMeals(meals);
            } else {
                setTodayMeals([]);
            }
        });

        const unsubChecked = firestore.subscribeToCheckedMeals(uid, weekStart, (data) => {
            setCheckedMeals(data || {});
        });

        return () => {
            unsub();
            unsubMealPlan();
            unsubChecked();
        };
    }, [uid]);

    const toggleFavorite = (meal: any) => {
        if (!uid) return;
        const isFav = favorites.some((f: any) => f.name === meal.name);
        if (isFav) {
            const updated = favorites.filter((f: any) => f.name !== meal.name);
            firestore.saveFavoriteMeals(uid, updated);
        }
    };

    const renderEmptyState = () => (
        <View style={s.emptyContainer}>
            <View style={[s.emptyIconBox, { backgroundColor: colors.iconBoxBg }]}>
                <Ionicons name="heart-dislike-outline" size={48} color={colors.gold} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
            <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
                {activeTab === "diet" 
                    ? "Tap the heart on any meal in your plan to save it here for quick access."
                    : "Generate and heart recipes in the Neural Recipe Generator to save them here."}
            </Text>
            <TouchableOpacity
                style={[s.emptyBtn, { backgroundColor: colors.primaryBtn }]}
                onPress={() => router.push(activeTab === "diet" ? "/(tabs)/meal-plan" : "/(profile)/recipe-generator")}
            >
                <Text style={[s.emptyBtnText, { color: colors.primaryBtnText }]}>
                    {activeTab === "diet" ? "Go to Meal Plan" : "Go to Recipe Generator"}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderMealCard = (meal: any, i: number) => {
        const color = MEAL_COLORS[meal.type] || colors.gold;
        return (
            <TouchableOpacity
                key={i}
                style={[s.mealCard, { backgroundColor: colors.card, shadowColor: colors.shadow, borderColor: "transparent" }]}
                activeOpacity={0.7}
                onPress={() => router.push({
                    pathname: "/(profile)/meal-detail",
                    params: { meal: JSON.stringify(meal) }
                })}
            >
                <View style={s.mealTop}>
                    <View style={s.mealImgBox}>
                        <Image
                            source={{ uri: getFoodImageUrl(meal.imageKeyword, meal.name) }}
                            style={s.mealImg}
                            resizeMode="cover"
                        />
                        <View style={[s.mealImgBadge, { backgroundColor: `${color}E6` }]}>
                            <Text style={s.mealImgBadgeText}>{meal.emoji} {meal.type}</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={s.mealHeaderRow}>
                            <Text style={[s.mealTime, { color: colors.textMuted }]}>⏰ {meal.time || "Flexible"}</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                {(() => {
                                    const todayIdx = getTodayIndex();
                                    const isCompleted = todayMeals.some((tm, tmIdx) => 
                                        tm.name === meal.name && checkedMeals[`${todayIdx}-${tmIdx}`]
                                    );
                                    return isCompleted ? (
                                        <View style={[s.checkBadge, { backgroundColor: colors.green }]}>
                                            <Ionicons name="checkmark" size={10} color={colors.gold} />
                                        </View>
                                    ) : null;
                                })()}
                                <TouchableOpacity
                                    onPress={() => toggleFavorite(meal)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="heart" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={[s.mealName, { color: colors.text }]}>{meal.name}</Text>
                        <Text style={[s.mealDesc, { color: colors.textMuted }]} numberOfLines={2}>{meal.description}</Text>
                    </View>
                </View>
                <View style={s.macroRow}>
                    <View style={[s.macroPill, { backgroundColor: colors.surface }]}>
                        <Text style={s.macroIcon}>🔥</Text>
                        <Text style={[s.macroVal, { color: colors.text }]}>{meal.calories}</Text>
                        <Text style={[s.macroUnit, { color: colors.textMuted }]}>kcal</Text>
                    </View>
                    <View style={[s.macroPill, { backgroundColor: colors.surface }]}>
                        <Text style={s.macroIcon}>💪</Text>
                        <Text style={[s.macroVal, { color: colors.text }]}>{meal.protein}g</Text>
                        <Text style={[s.macroUnit, { color: colors.textMuted }]}>prot</Text>
                    </View>
                    <View style={[s.macroPill, { backgroundColor: colors.surface }]}>
                        <Text style={s.macroIcon}>🌾</Text>
                        <Text style={[s.macroVal, { color: colors.text }]}>{meal.carbs}g</Text>
                        <Text style={[s.macroUnit, { color: colors.textMuted }]}>carb</Text>
                    </View>
                    <View style={[s.macroPill, { backgroundColor: colors.surface }]}>
                        <Text style={s.macroIcon}>🥑</Text>
                        <Text style={[s.macroVal, { color: colors.text }]}>{meal.fat}g</Text>
                        <Text style={[s.macroUnit, { color: colors.textMuted }]}>fat</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderRecipeCard = (recipe: any, i: number) => {
        return (
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
            onPress={() => router.push({
              pathname: "/(profile)/recipe-detail",
              params: { recipe: JSON.stringify(recipe) },
            })}
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
                  <Ionicons name="heart" size={24} color="#EF4444" />
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
        );
    };

    const dietFavs = favorites.filter(f => f.source !== "recipe-generator");
    const recipeFavs = favorites.filter(f => f.source === "recipe-generator");

    const currentList = activeTab === "diet" ? dietFavs : recipeFavs;

    return (
        <View style={[s.screen, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            <View style={[s.header, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.card, shadowColor: colors.shadow, borderWidth: isDark ? 1 : 0, borderColor: colors.cardBorder }]}>
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: colors.text }]}>Favorite Meals</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={s.tabContainer}>
                <TouchableOpacity 
                    style={[s.tab, activeTab === "diet" && s.activeTab, activeTab === "diet" && { borderBottomColor: colors.gold }]}
                    onPress={() => setActiveTab("diet")}
                >
                    <Text style={[s.tabText, { color: activeTab === "diet" ? colors.gold : colors.textMuted }]}>AI Diet Plan</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[s.tab, activeTab === "recipe" && s.activeTab, activeTab === "recipe" && { borderBottomColor: colors.gold }]}
                    onPress={() => setActiveTab("recipe")}
                >
                    <Text style={[s.tabText, { color: activeTab === "recipe" ? colors.gold : colors.textMuted }]}>Recipe Generator</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={s.loadingBox}>
                    <ActivityIndicator size="large" color={colors.gold} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
                    {currentList.length === 0 ? (
                        renderEmptyState()
                    ) : (
                        <View style={s.list}>
                            {currentList.map((item, i) => {
                                if (!item || !item.name) return null;
                                return activeTab === "diet" 
                                    ? renderMealCard(item, i) 
                                    : renderRecipeCard(item, i);
                            })}
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: SAFE_TOP_PADDING, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
    backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    
    tabContainer: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    activeTab: {
        borderBottomWidth: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: "700",
    },

    loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80 },
    list: { gap: 12 },
    
    /* Meal Card (Replicated from meal-plan.tsx) */
    mealCard: {
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1.5,
    },
    mealTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
    mealImgBox: {
        width: 80,
        height: 80,
        borderRadius: 16,
        overflow: "hidden",
        marginRight: 12,
        position: "relative",
    },
    mealImg: { width: 80, height: 80, borderRadius: 16 },
    mealImgBadge: {
        position: "absolute",
        bottom: 4,
        left: 4,
        right: 4,
        borderRadius: 8,
        paddingVertical: 2,
        paddingHorizontal: 5,
        alignItems: "center",
    },
    mealImgBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
    mealHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    mealTime: { fontSize: 11, fontWeight: "600" },
    checkBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
    mealName: { fontSize: 16, fontWeight: "800", marginTop: 3, marginBottom: 2 },
    mealDesc: { fontSize: 12, lineHeight: 17 },
    
    macroRow: { flexDirection: "row", gap: 6 },
    macroPill: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 6,
        flex: 1,
    },
    macroIcon: { fontSize: 10, marginRight: 3 },
    macroVal: { fontSize: 12, fontWeight: "800", marginRight: 2 },
    macroUnit: { fontSize: 9, fontWeight: "600" },

    /* Recipe Card (Replicated from recipe-generator.tsx) */
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

    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 40 },
    emptyIconBox: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 24 },
    emptyTitle: { fontSize: 20, fontWeight: "800", marginBottom: 12 },
    emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 32 },
    emptyBtn: { paddingHorizontal: 24, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    emptyBtnText: { fontSize: 15, fontWeight: "700" },
});
