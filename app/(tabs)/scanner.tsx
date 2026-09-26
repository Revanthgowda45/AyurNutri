import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestoreDB from "@/services/firestoreService";
import { callAIVision } from "@/utils/aiApi";
import { buildFoodScannerPrompt } from "@/utils/prompts";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

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

const { width } = Dimensions.get("window");

/* ═══════════════════════════════════════════
   IN-MEMORY SCAN ANALYSIS TRACKING
   Preserves loading state and result when
   navigating away and back to the scanner page.
   No database storage — purely in-memory.
   ═══════════════════════════════════════════ */
let pendingScanAnalysis: Promise<any> | null = null;
let lastScanResult: { result: any; imageUri: string | null } | null = null;

export default function ScannerScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const uid = user?.uid || "";
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 768;

  const [doshaData, setDoshaData] = useState<{
    doshaType?: string;
    aiAnalysis?: string;
  } | null>(null);
  const [onboardingData, setOnboardingData] = useState<{
    diet?: string;
    goal?: string;
    weight?: number;
    height?: number;
  } | null>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);


  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasDosha = !!doshaData?.doshaType;
  const hasOnboarding = !!onboardingData?.diet || !!onboardingData?.goal;

  useEffect(() => {
    if (!uid) return;
    const unsubDosha = firestoreDB.subscribeToDoshaResult(uid, (d) => {
      setDoshaData(d || null);
    });
    const unsubOnboarding = firestoreDB.subscribeToOnboarding(uid, (d) => {
      setOnboardingData(d || null);
    });

    return () => {
      unsubDosha();
      unsubOnboarding();
    };
  }, [uid]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // On mount: restore pending analysis or last completed result
  useEffect(() => {
    // If there's a completed result from a previous mount, restore it
    if (lastScanResult && !pendingScanAnalysis) {
      console.log("[Scanner] ✅ Restoring last scan result from memory");
      setResult(lastScanResult.result);
      setImageUri(lastScanResult.imageUri);
      return;
    }

    // If there's a pending analysis, wait for it
    if (pendingScanAnalysis) {
      console.log("[Scanner] ⏳ Resuming pending scan analysis");
      setLoading(true);
      pendingScanAnalysis
        .then((parsed) => {
          if (parsed) {
            setResult(parsed);
            if (lastScanResult?.imageUri) {
              setImageUri(lastScanResult.imageUri);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Please allow camera access to scan food.",
      );
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
      setImageBase64(res.assets[0].base64 || null);
      setTextInput("");
      setResult(null);
      lastScanResult = null;
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Please allow gallery access to upload food images.",
      );
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
      setImageBase64(res.assets[0].base64 || null);
      setTextInput("");
      setResult(null);
      lastScanResult = null;
    }
  };

  const handleClear = () => {
    setImageUri(null);
    setImageBase64(null);
    setTextInput("");
    setResult(null);
    setError("");
    lastScanResult = null;
    pendingScanAnalysis = null;
  };

  const handleAnalyze = async () => {
    if (!imageBase64 && !textInput.trim()) {
      setError("Please upload an image or type a food name.");
      return;
    }

    // Don't start if already analyzing
    if (pendingScanAnalysis) {
      console.log("[Scanner] ⚠️ Analysis already in progress");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    // Store the image URI for restoration on remount
    lastScanResult = { result: null, imageUri };

    const analysisPromise = (async () => {
      try {
        const prompt = buildFoodScannerPrompt(
          doshaData?.doshaType,
          onboardingData?.diet,
        );
        let rawResult = "";

        if (imageBase64) {
          const finalPrompt = textInput.trim()
            ? `User context: "${textInput}".\n\n${prompt}`
            : prompt;
          rawResult = await callAIVision(
            finalPrompt,
            imageBase64,
            "image/jpeg",
          );
        } else {
          const blankGif =
            "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
          const finalPrompt = `Analyze this food specifically described as: "${textInput.trim()}".\n\n${prompt}`;
          rawResult = await callAIVision(finalPrompt, blankGif, "image/gif");
        }

        const parsed = JSON.parse(rawResult);
        console.log("[Scanner] ✅ Analysis complete");

        // Cache the result in memory
        lastScanResult = { result: parsed, imageUri };

        return parsed;
      } catch (e: any) {
        console.error("Food scanning failed:", e);
        throw e;
      } finally {
        pendingScanAnalysis = null;
      }
    })();

    pendingScanAnalysis = analysisPromise;

    try {
      const parsed = await analysisPromise;
      setResult(parsed);
    } catch (e: any) {
      setError(e?.message || "Failed to analyze food. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCompatibilityColor = (comp: string) => {
    if (comp === "Good") return "#10B981";
    if (comp === "Neutral") return "#F59E0B";
    if (comp === "Avoid") return "#EF4444";
    return colors.gold;
  };

  const getDoshaImpactColor = (impact: string) => {
    if (impact === "Increases") return "#EF4444";
    if (impact === "Decreases") return "#10B981";
    return "#6B7280";
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 10);
  };

  const renderHeader = () => (
    <LinearGradient
      colors={isDark ? [colors.card, colors.headerBg] : [colors.headerBg, '#2D6A4F']}
      style={[
        s.header,
        isScrolled && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 4,
        },
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <View style={[{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 18 }}>🔍</Text>
            </View>
            <Text style={[s.headerTitle, { color: colors.textOnHeader }]}>
              Food Scanner
            </Text>
          </View>
          <Text style={[s.headerSub, { color: colors.textOnHeaderSub }]}>
            AI-powered Dosha compatibility analysis
          </Text>
        </View>
        {result && (
          <TouchableOpacity
            style={[s.regenBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
            activeOpacity={0.7}
            onPress={handleClear}
            disabled={loading}
          >
            <Ionicons name="refresh" size={20} color={colors.textOnHeader} />
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );

  const renderActiveProfileBanner = () => {
    if (!hasDosha && !hasOnboarding) {
      return (
        <TouchableOpacity
          style={[s.profileBanner, { backgroundColor: colors.surface }]}
          onPress={() => router.push("/(profile)/dosha-assessment")}
        >
          <Ionicons name="information-circle" size={20} color={colors.gold} />
          <Text style={[s.profileBannerText, { color: colors.textSecondary }]}>
            Tap to complete your profile for highly personalized results.
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.gold} />
        </TouchableOpacity>
      );
    }

    const activeDosha: string = hasDosha && doshaData?.doshaType ? doshaData.doshaType : "";
    const doshaColor = activeDosha && DOSHA_COLORS[activeDosha] ? DOSHA_COLORS[activeDosha] : colors.gold;
    const doshaEmoji = activeDosha && DOSHA_EMOJIS[activeDosha] ? DOSHA_EMOJIS[activeDosha] : "👤";

    return (
      <View style={[s.profileBanner, { backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : `${doshaColor}15`, borderWidth: 1.5 }]}>


        <View style={s.profileBannerContent}>
          <View style={s.bannerLabelRow}>
            <View style={[s.activeIndicator, { backgroundColor: '#34D399' }]} />
            <Text style={[s.profileBannerTitle, { color: colors.textSecondary }]}>
              ACTIVE PROFILE
            </Text>
          </View>
          
          <View style={s.contextChips}>
            <View style={[s.contextChip, { backgroundColor: isDark ? `${doshaColor}20` : `${doshaColor}10` }]}>
              <Text style={s.chipEmoji}>{doshaEmoji}</Text>
              <Text style={[s.chipText, { color: isDark ? '#FFF' : doshaColor }]}>
                {activeDosha || "Discovery"}
              </Text>
            </View>

            <View style={[s.contextChip, { backgroundColor: colors.surface }]}>
              <Ionicons name="restaurant-outline" size={12} color={colors.textSecondary} />
              <Text style={[s.chipText, { color: colors.text }]}>
                {hasOnboarding ? onboardingData.diet || "Any" : "Setup"}
              </Text>
            </View>

            <View style={[s.contextChip, { backgroundColor: colors.surface }]}>
              <Ionicons name="flag-outline" size={12} color={colors.textSecondary} />
              <Text style={[s.chipText, { color: colors.text }]}>
                {hasOnboarding ? onboardingData.goal || "Goal" : "Goal"}
              </Text>
            </View>
          </View>
        </View>

        {(!hasDosha || !hasOnboarding) && (
          <TouchableOpacity
            style={[s.profileEditBtn, { backgroundColor: doshaColor }]}
            onPress={() => router.push(hasDosha ? "/onboarding" : "/(profile)/dosha-assessment")}
          >
            <Text style={[s.profileEditTxt, { color: "#FFF" }]}>
              Complete
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View style={[s.body, { opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {renderActiveProfileBanner()}

        <View style={[s.heroSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {!imageUri ? (
            <>
              <TouchableOpacity
                style={[s.dropzone, { borderColor: `${colors.gold}30`, backgroundColor: isDark ? colors.surface : '#FAFAFA' }]}
                onPress={handleCamera}
                activeOpacity={0.8}
              >
                {/* Animated glow ring */}
                <LinearGradient
                  colors={isDark ? ['rgba(212,162,78,0.15)', 'rgba(212,162,78,0.05)'] : ['rgba(212,162,78,0.12)', 'rgba(212,162,78,0.03)']}
                  style={s.iconRing}
                >
                  <Ionicons name="scan" size={38} color={colors.gold} />
                </LinearGradient>
                <Text style={[s.dropzoneTitle, { color: colors.text }]}>
                  Tap to Scan Food
                </Text>
                <Text style={[s.dropzoneSub, { color: colors.textSecondary }]}>
                  AI identifies ingredients & Dosha compatibility
                </Text>

                <View style={s.heroActions}>
                  <TouchableOpacity
                    style={[s.heroActionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
                    onPress={handleCamera}
                  >
                    <Ionicons name="camera" size={20} color={colors.gold} />
                    <Text style={[s.heroActionTxt, { color: colors.text }]}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.heroActionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
                    onPress={handleGallery}
                  >
                    <Ionicons name="images" size={20} color={colors.gold} />
                    <Text style={[s.heroActionTxt, { color: colors.text }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              <View style={s.dividerRow}>
                <View style={[s.line, { backgroundColor: colors.divider }]} />
                <Text style={[s.orTxt, { color: colors.textMuted }]}>OR TYPE</Text>
                <View style={[s.line, { backgroundColor: colors.divider }]} />
              </View>

              <TextInput
                style={[
                  s.textInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.inputBorder,
                  },
                ]}
                placeholder="E.g., Masala Dosa, Quinoa Salad..."
                placeholderTextColor={colors.inputPlaceholder}
                value={textInput}
                onChangeText={(t) => {
                  setTextInput(t);
                  setError("");
                }}
                returnKeyType="search"
                onSubmitEditing={handleAnalyze}
              />
            </>
          ) : (
            <View style={s.previewWrapper}>
              <Image source={{ uri: imageUri }} style={s.previewImage} />
              <TouchableOpacity style={s.clearImageBtn} onPress={handleClear}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={[
                  s.textInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.inputBorder,
                    marginTop: 16,
                  },
                ]}
                placeholder="Add details (e.g. 'It's very spicy')"
                placeholderTextColor={colors.inputPlaceholder}
                value={textInput}
                onChangeText={setTextInput}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              s.generateBtn,
              { backgroundColor: colors.primaryBtn },
              loading && { opacity: 0.7 },
            ]}
            activeOpacity={0.8}
            onPress={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <View style={s.loadRow}>
                <ActivityIndicator color={colors.gold} size="small" />
                <Text style={[s.genText, { color: colors.primaryBtnText }]}>
                  {" "}Analyzing...
                </Text>
              </View>
            ) : (
              <Text style={[s.genText, { color: colors.primaryBtnText }]}>
                Analyze Food
              </Text>
            )}
          </TouchableOpacity>

          {error ? (
            <Animated.View
              style={[
                s.errBox,
                { backgroundColor: colors.errorBg, borderColor: colors.errorBorder },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={colors.errorText} />
              <Text style={[s.errText, { color: colors.errorText }]}>{error}</Text>
            </Animated.View>
          ) : null}
        </View>

        <View style={[s.featuresContainer, { backgroundColor: colors.card }]}>
          <Text style={[s.featuresHeading, { color: colors.text }]}>
            AI Analysis Includes:
          </Text>
          <View style={s.featuresGrid}>
            {[
              { icon: "scan-outline", label: "Recognition" },
              { icon: "leaf-outline", label: "Dosha Rating" },
              { icon: "flame-outline", label: "Properties" },
              { icon: "fitness-outline", label: "Nutrition" },
            ].map((f, i) => (
              <View key={i} style={[s.featureItemChip, { backgroundColor: colors.surface }]}>
                <Ionicons name={f.icon as any} size={16} color={colors.gold} />
                <Text style={[s.featureItemTxt, { color: colors.textSecondary }]}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderResultState = () => (
    <Animated.View style={[s.body, { opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150, paddingTop: 20, width: '100%', maxWidth: 900, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={[
          s.resultCard,
          {
            backgroundColor: colors.card,
            shadowColor: colors.shadow,
            borderColor: colors.cardBorder,
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          {imageUri && (
             <View style={s.resultImageWrapper}>
              <Image source={{ uri: imageUri }} style={s.resultImage} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={s.resultImageGradient}
              >
                <View style={s.resultHeaderOverlay}>
                   <View style={{ flex: 1 }}>
                     <Text style={s.resultNameOverlay}>{result.name}</Text>
                     <Text style={s.resultCalsOverlay}>~{result.calories} kcal / {result.servingSize}</Text>
                   </View>
                   <View style={[s.compBadge, { backgroundColor: getCompatibilityColor(result.compatibility) }]}>
                      <Text style={s.compTxtOverlay}>{result.compatibility}</Text>
                   </View>
                </View>
              </LinearGradient>
             </View>
          )}

          {!imageUri && (
            <View style={[s.resultHeader, { marginBottom: 20 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.resultName, { color: colors.text }]}>{result.name}</Text>
                <Text style={[s.resultCals, { color: colors.textSecondary }]}>
                  ~{result.calories} kcal / {result.servingSize}
                </Text>
              </View>
              <View
                style={[
                  s.compBadgeObj,
                  {
                    backgroundColor: getCompatibilityColor(result.compatibility) + "15",
                    borderColor: getCompatibilityColor(result.compatibility),
                  },
                ]}
              >
                <Text style={[s.compTxtObj, { color: getCompatibilityColor(result.compatibility) }]}>
                  {result.compatibility}
                </Text>
              </View>
            </View>
          )}

          <View style={[s.recBox, { backgroundColor: colors.surface }]}>
             <Ionicons name="sparkles" size={20} color={colors.gold} style={{ marginBottom: 8 }} />
             <Text style={[s.recTxt, { color: colors.text }]}>{result.recommendation}</Text>
          </View>

          {result.dietaryWarning && (
            <View style={[s.warningBox, { backgroundColor: "#EF444415", borderColor: "#EF444430" }]}>
              <Ionicons name="warning" size={20} color="#EF4444" style={{ marginRight: 12 }} />
              <Text style={[s.warningTxt, { color: "#EF4444" }]}>{result.dietaryWarning}</Text>
            </View>
          )}

          <Text style={[s.sectionTitle, { color: colors.text }]}>Dosha Impact</Text>
          <View style={s.impactRowResult}>
            {[
              { name: "Vata", val: result.doshaImpact?.vata },
              { name: "Pitta", val: result.doshaImpact?.pitta },
              { name: "Kapha", val: result.doshaImpact?.kapha },
            ].map((d, i) => (
              <View key={i} style={[s.impactColResult, { backgroundColor: colors.surface }]}>
                <Text style={[s.impactDoshaResult, { color: colors.textSecondary }]}>{d.name}</Text>
                <View style={s.impactBadgeWrapper}>
                  <View style={[s.impactDot, { backgroundColor: getDoshaImpactColor(d.val) }]} />
                  <Text style={[s.impactValResult, { color: colors.text }]}>{d.val}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={[s.sectionTitle, { color: colors.text }]}>Ayurvedic Profile</Text>
          <View style={s.propsGridResult}>
            {[
              { label: "Rasa", val: result.ayurvedicProperties?.rasa },
              { label: "Guna", val: result.ayurvedicProperties?.guna },
              { label: "Virya", val: result.ayurvedicProperties?.virya },
              { label: "Vipaka", val: result.ayurvedicProperties?.vipaka },
            ].map((p, i) => (
              <View key={i} style={[s.propBlockResult, { backgroundColor: colors.surface }]}>
                <Text style={[s.propLabelResult, { color: colors.textMuted }]}>{p.label}</Text>
                <Text style={[s.propValResult, { color: colors.text }]}>{p.val}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[s.scanAnotherBtn, { backgroundColor: colors.primaryBtn }]}
            onPress={handleClear}
          >
            <Ionicons name="scan" size={20} color={colors.primaryBtnText} style={{ marginRight: 8 }} />
            <Text style={[s.scanAnotherTxt, { color: colors.primaryBtnText }]}>Scan Another Item</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  return (
    <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0 }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.headerBg} />
      {renderHeader()}
      {!result ? renderEmptyState() : renderResultState()}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingTop: SAFE_TOP_PADDING,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  headerSub: { fontSize: 14, fontWeight: "500", marginTop: 4 },
  regenBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  scrollContent: { 
      paddingHorizontal: 18, 
      paddingTop: 16, 
      paddingBottom: 160,
      width: '100%',
      maxWidth: 900,
      alignSelf: 'center'
  },

  // Profile Banner
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 2,
  },
  avatarImgSmall: {
    width: "100%",
    height: "100%",
  },
  profileAvatarText: { fontSize: 20, fontWeight: "900" },
  profileBannerContent: { flex: 1, justifyContent: "center" },
  bannerLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  activeIndicator: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  profileBannerTitle: { 
    fontSize: 10, 
    fontWeight: "800", 
    letterSpacing: 1.5,
    opacity: 0.8
  },
  contextChips: { flexDirection: "row", gap: 8 },
  contextChip: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10,
    gap: 4
  },
  chipEmoji: { fontSize: 12 },
  chipText: { fontSize: 13, fontWeight: "700" },
  profileEditBtn: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12,
    marginLeft: 8
  },
  profileEditTxt: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  profileBannerText: { flex: 1, fontSize: 13, marginLeft: 10, marginRight: 8, lineHeight: 18 },

  // Hero Section
  heroSection: {
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  dropzone: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    marginBottom: 20,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dropzoneTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  dropzoneSub: { fontSize: 13, textAlign: "center", marginBottom: 20, opacity: 0.8 },
  heroActions: { flexDirection: "row", gap: 10, width: "100%" },
  heroActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
  },
  heroActionTxt: { fontSize: 13, fontWeight: "700", marginLeft: 8 },

  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  line: { flex: 1, height: 1 },
  orTxt: { marginHorizontal: 16, fontSize: 12, fontWeight: "700", letterSpacing: 1 },

  textInput: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: "500",
  },

  previewWrapper: { borderRadius: 24, overflow: "hidden", marginBottom: 20 },
  previewImage: { width: "100%", height: 260, borderRadius: 24 },
  clearImageBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  generateBtn: {
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  genText: { fontSize: 16, fontWeight: "700" },
  loadRow: { flexDirection: "row", alignItems: "center" },

  errBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  errText: { flex: 1, fontSize: 13, fontWeight: "600", marginLeft: 8 },

  featuresContainer: {
    padding: 24,
    borderRadius: 24,
  },
  featuresHeading: { fontSize: 15, fontWeight: "700", marginBottom: 16 },
  featuresGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    justifyContent: "space-between",
    rowGap: 12 
  },
  featureItemChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    width: "48%",
  },
  featureItemTxt: { fontSize: 12, fontWeight: "600", marginLeft: 8 },

  // Results Styles
  resultCard: { borderRadius: 28, padding: 22, marginBottom: 20, elevation: 4, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14 },
  resultImageWrapper: { marginHorizontal: -22, marginTop: -22, marginBottom: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", height: 260 },
  resultImage: { width: "100%", height: "100%" },
  resultImageGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 120, justifyContent: "flex-end", padding: 22 },
  resultHeaderOverlay: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  resultNameOverlay: { fontSize: 22, fontWeight: "900", color: "#fff", marginBottom: 4, letterSpacing: -0.5 },
  resultCalsOverlay: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  compTxtOverlay: { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },

  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  resultName: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  resultCals: { fontSize: 14, fontWeight: "500" },
  compBadgeObj: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  compBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  compTxtObj: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },

  recBox: { padding: 20, borderRadius: 24, marginBottom: 20 },
  recTxt: { fontSize: 15, lineHeight: 24, fontWeight: "500" },

  warningBox: { flexDirection: "row", alignItems: "flex-start", padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  warningTxt: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600" },

  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 14, marginTop: 8 },
  impactRowResult: { flexDirection: "row", gap: 10, marginBottom: 24 },
  impactColResult: { flex: 1, padding: 14, borderRadius: 16, alignItems: "center" },
  impactDoshaResult: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase", opacity: 0.7 },
  impactBadgeWrapper: { flexDirection: "row", alignItems: "center" },
  impactDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  impactValResult: { fontSize: 13, fontWeight: "800" },

  propsGridResult: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32 },
  propBlockResult: { width: "48%", padding: 14, borderRadius: 16 },
  propLabelResult: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase", opacity: 0.6 },
  propValResult: { fontSize: 14, fontWeight: "700" },

  scanAnotherBtn: { flexDirection: "row", padding: 16, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  scanAnotherTxt: { fontSize: 15, fontWeight: "800" },
});

