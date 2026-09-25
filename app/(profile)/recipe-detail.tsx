import { useTheme } from "@/context/ThemeContext";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/* Build a dynamic food image URL from AI's keyword */
const getFoodImageUrl = (keyword?: string, fallbackName?: string): string => {
    const term = keyword || fallbackName || "indian food";
    return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=400&h=300&c=7&rs=1&p=0`;
};

type Recipe = {
    name: string; emoji: string; description: string; calories: number;
    timeMinutes: number; servings: number;
    ingredients: { name: string; amount: string; emoji: string }[];
    instructions: string[]; doshaBalance: string; mealType: string;
};

export default function RecipeDetailScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ recipe: string }>();

    let recipe: Recipe;
    try {
        recipe = JSON.parse(params.recipe || "{}");
    } catch {
        recipe = { name: "Unknown", emoji: "🍽️", description: "", calories: 0, timeMinutes: 0, servings: 0, ingredients: [], instructions: [], doshaBalance: "", mealType: "" };
    }

    return (
        <View style={[s.screen, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.headerBg} />

            {/* Hero Header */}
            <View style={[s.hero, { backgroundColor: colors.headerBg }]}>
                <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.avatarBg }]}>
                    <Text style={[s.backText, { color: colors.textOnHeader }]}>←</Text>
                </TouchableOpacity>
                <View style={s.heroImgBox}>
                    <Image
                        source={{ uri: getFoodImageUrl(recipe.name) }}
                        style={s.heroImg}
                        resizeMode="cover"
                    />
                    <View style={[s.heroImgBadge, { backgroundColor: `rgba(0,0,0,0.6)` }]}>
                        <Text style={s.heroImgBadgeText}>{recipe.emoji}</Text>
                    </View>
                </View>
                <Text style={[s.heroName, { color: colors.textOnHeader }]}>{recipe.name}</Text>
                <Text style={[s.heroDesc, { color: colors.textOnHeaderSub }]}>{recipe.description}</Text>

                {/* Stats */}
                <View style={[s.statsRow, { backgroundColor: colors.headerOverlay }]}>
                    <View style={s.statBox}>
                        <View style={[s.statCircle, { backgroundColor: `${colors.gold}25` }]}>
                            <Text style={s.statIcon}>🔥</Text>
                        </View>
                        <Text style={[s.statLabel, { color: colors.textOnHeaderMuted }]}>Calories</Text>
                        <Text style={[s.statValue, { color: colors.gold }]}>{recipe.calories}</Text>
                    </View>
                    <View style={[s.statDivider, { backgroundColor: colors.headerBorder }]} />
                    <View style={s.statBox}>
                        <View style={[s.statCircle, { backgroundColor: `${colors.gold}25` }]}>
                            <Text style={s.statIcon}>⏱️</Text>
                        </View>
                        <Text style={[s.statLabel, { color: colors.textOnHeaderMuted }]}>Time</Text>
                        <Text style={[s.statValue, { color: colors.gold }]}>{recipe.timeMinutes} min</Text>
                    </View>
                    <View style={[s.statDivider, { backgroundColor: colors.headerBorder }]} />
                    <View style={s.statBox}>
                        <View style={[s.statCircle, { backgroundColor: `${colors.gold}25` }]}>
                            <Text style={s.statIcon}>🍽️</Text>
                        </View>
                        <Text style={[s.statLabel, { color: colors.textOnHeaderMuted }]}>Serves</Text>
                        <Text style={[s.statValue, { color: colors.gold }]}>{recipe.servings}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
                {recipe.doshaBalance ? (
                    <View style={[s.doshaCard, { backgroundColor: colors.tipBg, borderColor: colors.tipBorder }]}>
                        <Text style={[s.doshaTitle, { color: colors.tipText }]}>🌿 Dosha Balance</Text>
                        <Text style={[s.doshaText, { color: colors.tipLabel }]}>{recipe.doshaBalance}</Text>
                    </View>
                ) : null}

                {/* Ingredients */}
                <View style={[s.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <View style={s.sectionHead}>
                        <Text style={[s.sectionTitle, { color: colors.text }]}>Ingredients</Text>
                        <Text style={[s.sectionCount, { color: colors.textMuted }]}>{recipe.ingredients?.length || 0} Items</Text>
                    </View>
                    {(recipe.ingredients || []).map((ing, i) => (
                        <View key={i} style={[s.ingRow, { borderBottomColor: colors.ingBorder }]}>
                            <Text style={s.ingEmoji}>{ing.emoji}</Text>
                            <Text style={[s.ingName, { color: colors.text }]}>{ing.name}</Text>
                            <Text style={[s.ingAmount, { color: colors.textSecondary }]}>{ing.amount}</Text>
                        </View>
                    ))}
                </View>

                {/* Instructions */}
                <View style={[s.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}>Instructions</Text>
                    {(recipe.instructions || []).map((step, i) => (
                        <View key={i} style={s.stepRow}>
                            <View style={[s.stepNum, { backgroundColor: colors.green }]}>
                                <Text style={[s.stepNumText, { color: colors.gold }]}>{i + 1}</Text>
                            </View>
                            <Text style={[s.stepText, { color: colors.optionText }]}>{step}</Text>
                        </View>
                    ))}
                </View>

                <View style={[s.mealTag, { backgroundColor: colors.mealTagBg }]}>
                    <Text style={[s.mealTagText, { color: colors.mealTagText }]}>Best for: {recipe.mealType}</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1 },
    hero: { paddingTop: SAFE_TOP_PADDING, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, alignItems: "center" },
    backBtn: { position: "absolute", top: SAFE_TOP_PADDING, left: 20, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", zIndex: 10 },
    backText: { fontSize: 18, fontWeight: "700" },
    heroImgBox: {
        width: 120,
        height: 120,
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 16,
        marginTop: 10,
        position: "relative",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    heroImg: {
        width: "100%",
        height: "100%",
    },
    heroImgBadge: {
        position: "absolute",
        bottom: 8,
        right: 8,
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    heroImgBadgeText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    heroName: { fontSize: 24, fontWeight: "900", textAlign: "center", marginBottom: 8 },
    heroDesc: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24, paddingHorizontal: 16 },
    statsRow: { flexDirection: "row", borderRadius: 20, paddingVertical: 18, paddingHorizontal: 8, width: "100%" },
    statBox: { flex: 1, alignItems: "center" },
    statCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    statIcon: { fontSize: 18 },
    statLabel: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
    statValue: { fontSize: 16, fontWeight: "900" },
    statDivider: { width: 1, marginVertical: 8 },
    body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },
    doshaCard: { borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1 },
    doshaTitle: { fontSize: 14, fontWeight: "800", marginBottom: 8 },
    doshaText: { fontSize: 14, lineHeight: 22 },
    section: { borderRadius: 20, padding: 20, marginBottom: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 14 },
    sectionCount: { fontSize: 13, fontWeight: "600" },
    ingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
    ingEmoji: { fontSize: 18, marginRight: 14 },
    ingName: { flex: 1, fontSize: 15, fontWeight: "600" },
    ingAmount: { fontSize: 14, fontWeight: "500" },
    stepRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-start" },
    stepNum: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 14, marginTop: 2 },
    stepNumText: { fontSize: 13, fontWeight: "900" },
    stepText: { flex: 1, fontSize: 14, lineHeight: 22, fontWeight: "500" },
    mealTag: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, alignSelf: "center" },
    mealTagText: { fontSize: 13, fontWeight: "700" },
});
