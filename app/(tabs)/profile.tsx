import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/services/firestoreService";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { getTodayIndex, getWeekStartDate } from "@/utils/weekUtils";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GOAL_LABELS: Record<string, string> = {
  weight: "Weight Management",
  energy: "Boost Energy",
  dosha: "Balance Doshas",
  sleep: "Better Sleep",
  immunity: "Immunity",
  digestion: "Better Digestion",
};

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

/* Build a dynamic food image URL from AI's keyword */
const getFoodImageUrl = (keyword?: string, fallbackName?: string): string => {
  const term = keyword || fallbackName || "indian food";
  return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=300&h=200&c=7&rs=1&p=0`;
};

export default function ProfileScreen() {
  const { user, signOut, resetPassword } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const uid = user?.uid || "";
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 768;

  const [goals, setGoals] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<{
    notifications: boolean;
    darkMode: boolean;
  } | null>(null);
  const [doshaType, setDoshaType] = useState<string | null>(null);
  const [dietitianId, setDietitianId] = useState<string | null>(null);
  const [dietitianName, setDietitianName] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});

  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  useEffect(() => {
    if (!uid) return;

    const profileData: any = {
      fullName: user?.displayName || "Guest",
      email: user?.email || "",
    };
    if (user?.photoURL) profileData.photoURL = user.photoURL;

    firestore
      .upsertProfile(uid, profileData)
      .catch(() => {});

    const unsubProfile = firestore.subscribeToProfile(uid, (d) => {
      if (d?.photoURL) setProfilePhoto(d.photoURL);
    });

    const unsubGoals = firestore.subscribeToGoals(uid, (d) => {
      setGoals(d?.selectedGoals || []);
    });

    const unsubPrefs = firestore.subscribeToPreferences(uid, (d) => {
      setPrefs(d || null);
    });

    const unsubDosha = firestore.subscribeToDoshaResult(uid, (d) => {
      setDoshaType(d?.doshaType || null);
    });

    const unsubOnboarding = firestore.subscribeToOnboarding(uid, (d) => {
      setHasActivePlan(!!d?.completed);
    });

    const unsubDietitian = firestore.subscribeToDietitianConnection(
      uid,
      async (d) => {
        if (d?.dietitianId) {
          setDietitianId(d.dietitianId);
          // Fetch the mock name
          const dietitians = await firestore.getAvailableDietitians();
          const found = dietitians.find((dt) => dt.id === d.dietitianId);
          if (found) setDietitianName(found.name);
        } else {
          setDietitianId(null);
          setDietitianName(null);
        }
      },
    );

    const unsubFavorites = firestore.subscribeToFavorites(uid, (favs) => {
      setFavorites(favs);
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
      unsubGoals();
      unsubPrefs();
      unsubDosha();
      unsubDietitian();
      unsubOnboarding();
      unsubFavorites();
      unsubMealPlan();
      unsubChecked();
      unsubProfile();
    };
  }, [uid]);

  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      await resetPassword(user.email);
      setResetMessage("Password reset email sent!");
    } catch (error: any) {
      setResetMessage("Failed to send reset email.");
    } finally {
      setResetLoading(false);
      setTimeout(() => setResetMessage(null), 3000);
    }
  };

  const handlePhotoPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPhotoOptions(true);
  };

  const handleCameraLaunch = async () => {
    setShowPhotoOptions(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera access to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        await uploadPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleLibraryLaunch = async () => {
    setShowPhotoOptions(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need library access to pick a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        await uploadPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRemovePhoto = async () => {
    setShowPhotoOptions(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsUploading(true);
    try {
      await firestore.upsertProfile(uid, {
        fullName: user?.displayName || "Guest",
        email: user?.email || "",
        photoURL: ""
      });
      setProfilePhoto(null);
      Alert.alert("Success", "Profile photo removed.");
    } catch (e) {
      console.warn(e);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadPhoto = async (base64: string) => {
    if (!user) return;
    setIsUploading(true);
    try {
      // 1. Update Firestore Profile (Primary source for large Base64)
      await firestore.upsertProfile(user.uid, {
        fullName: displayName,
        email: user.email || "",
        photoURL: base64
      });

      // NOTE: We no longer sync to updateProfile(user) because Base64 strings 
      // often exceed the 2048 character limit of Firebase Auth photoURL.
      // The UI will now use the profilePhoto state synced from Firestore.
      
      if (Platform.OS === 'web') {
        alert("Success: Profile photo updated!");
      } else {
        Alert.alert("Success", "Profile photo updated!");
      }
    } catch (error) {
      console.warn("Upload error:", error);
      if (Platform.OS === 'web') {
        alert("Upload Failed: Could not save your profile photo.");
      } else {
        Alert.alert("Upload Failed", "Could not save your profile photo.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const displayName = user?.displayName || "Guest";
  const email = user?.email || "Not available";
  const initials = displayName
    ? displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";
  const photoURL = profilePhoto || user?.photoURL;
  const createdAt = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const goalsCount = goals.length;
  const goalsDisplay =
    goalsCount > 0
      ? goals.map((g) => GOAL_LABELS[g] || g).join(", ")
      : "Not set";

  const notifDisplay = prefs
    ? prefs.notifications
      ? "Enabled"
      : "Disabled"
    : "Enabled";
  const themeDisplay = prefs ? (prefs.darkMode ? "Dark" : "Light") : "Light";

  const Row = ({ icon, label, value, arrow, last, onPress }: any) => (
    <TouchableOpacity
      style={[
        s.rowContainer,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.divider },
      ]}
      activeOpacity={arrow ? 0.6 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[s.rowIconBox, { backgroundColor: colors.iconBoxBg }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[s.rowValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {arrow && (
        <View style={[s.rowArrowBox, { backgroundColor: colors.arrowBg }]}>
          <Ionicons name="chevron-forward" size={16} color={colors.gold} />
        </View>
      )}
    </TouchableOpacity>
  );

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 10 && !isScrolled) setIsScrolled(true);
    if (offsetY <= 10 && isScrolled) setIsScrolled(false);
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0 }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBg}
      />

      {/* Modern Redesigned Header */}
      <LinearGradient
        colors={isDark ? [colors.card, colors.headerBg] : [colors.headerBg, '#2D6A4F']}
        style={[
          s.headerBlock,
          isScrolled && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 4,
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[s.headerContent, { opacity: fade }]}>
          <View style={s.headerTopRow}>
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={handlePhotoPress} 
              disabled={isUploading}
              style={s.avatarWrap}
            >
              {photoURL ? (
                <Image
                  source={{ uri: photoURL }}
                  style={[s.avatar, { borderColor: colors.gold }]}
                />
              ) : (
                <View
                  style={[
                    s.avatarFallback,
                    {
                      backgroundColor: `${colors.gold}25`,
                      borderColor: colors.gold,
                    },
                  ]}
                >
                  <Text style={[s.avatarText, { color: colors.textOnHeader }]}>
                    {initials}
                  </Text>
                </View>
              )}
              
              {/* Photo Overlay */}
              <View style={[s.photoOverlay, { backgroundColor: colors.gold }]}>
                {isUploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="camera" size={12} color="#FFF" />
                )}
              </View>

              <View style={[s.onlineDot, { borderColor: colors.headerBg }]} />
            </TouchableOpacity>

            <View style={s.headerTextCol}>
              <View>
                <Text
                  style={[
                    s.welcomeLabel,
                    {
                      color: isDark ? colors.textSecondary : colors.textOnHeaderMuted,
                    },
                  ]}
                >
                  {t('ayurvedic_profile')}
                </Text>
                <Text
                  style={[
                    s.userName,
                    { color: colors.textOnHeader },
                  ]}
                >
                  {displayName}
                </Text>
                <View
                  style={[
                    s.memberPill,
                    {
                      backgroundColor: isDark
                        ? colors.surface
                        : colors.headerOverlay,
                      borderColor: isDark
                        ? colors.cardBorder
                        : colors.headerBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.memberText,
                      {
                        color: isDark
                          ? colors.textSecondary
                          : colors.textOnHeaderSub,
                      },
                    ]}
                  >
                    🌿 {t('member_since')} {createdAt}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <Animated.View
        style={[
          { flex: 1 },
          { opacity: fade, transform: [{ translateY: slideUp }] },
        ]}
      >
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Ayurvedic Insights / Dosha Dashboard */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionLabel, { color: colors.text }]}>{t('ayurvedic_insights')}</Text>
          </View>
          
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              s.doshaCard,
              {
                backgroundColor: doshaType ? DOSHA_COLORS[doshaType] || colors.green : colors.card,
                borderColor: colors.cardBorder,
                borderWidth: isDark ? 1 : 0,
              }
            ]}
            onPress={() =>
              router.push({
                pathname: "/(profile)/dosha-assessment",
                params: doshaType ? { retake: "true" } : {},
              })
            }
          >
            <View style={s.doshaCardHeader}>
              <View style={[s.doshaIconContainer, !doshaType && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Text 
                  style={[s.doshaEmoji, doshaType?.includes("-") && { fontSize: 22 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {doshaType ? DOSHA_EMOJIS[doshaType] || "🧘" : "🔍"}
                </Text>
              </View>
              <View style={s.doshaInfo}>
                <Text style={[s.doshaLabel, !doshaType && { color: colors.textMuted }]}>{t('current_constitution')} {doshaType ? t('tap_to_retake') : t('tap_to_start')}</Text>
                <Text style={[s.doshaTypeMain, !doshaType && { color: colors.text }]}>
                  {doshaType || t('unknown_dosha')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={doshaType ? "#FFF" : colors.textMuted} style={doshaType ? { opacity: 0.6 } : {}} />
            </View>
            
            {!doshaType ? (
              <View style={s.doshaEmptyState}>
                <Text style={[s.doshaEmptyText, !isDark && { color: colors.textMuted }]}>{t('dosha_assessment_invite')}</Text>
                <View style={[s.doshaActionBtn, !isDark && { backgroundColor: colors.text }]}>
                  <Text style={[s.doshaActionBtnText, !isDark && { color: colors.card }]}>{t('start_assessment')}</Text>
                </View>
              </View>
            ) : (
              <View style={s.doshaStatsRow}>
                <View style={s.doshaStatItem}>
                  <Text style={s.doshaStatVal}>100%</Text>
                  <Text style={s.doshaStatLabel}>{t('balanced')}</Text>
                </View>
                <View style={[s.doshaStatDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                <View style={s.doshaStatItem}>
                   <Text style={s.doshaStatVal}>Active</Text>
                   <Text style={s.doshaStatLabel}>{t('progress')}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Group 1: Personal Details */}
          <Text style={[s.sectionLabel, { color: colors.text, marginTop: 12 }]}>{t('personal_details')}</Text>
          <View
            style={[
              s.card,
              {
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                borderWidth: isDark ? 1 : 0,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Row
              icon="👤"
              label={t('full_name_edit')}
              value={displayName}
              arrow
              onPress={() => router.push("/(profile)/edit")}
            />
            <Row icon="✉️" label={t('email')} value={email} />
            <Row
              icon="🔒"
              label={t('password')}
              value={resetLoading ? "Sending..." : t('update_password')}
              arrow
              last
              onPress={resetLoading ? undefined : handleResetPassword}
            />
          </View>

          {resetMessage && (
            <Animated.View
              style={[
                {
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                  alignItems: "center",
                  backgroundColor: resetMessage.includes("sent")
                    ? colors.successBg
                    : colors.errorBg,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: resetMessage.includes("sent")
                    ? colors.successText
                    : colors.errorText,
                }}
              >
                {resetMessage}
              </Text>
            </Animated.View>
          )}

          {/* Group 2: Wellness Journey */}
          <Text style={[s.sectionLabel, { color: colors.text }]}>{t('wellness_journey')}</Text>
          <View
            style={[
              s.card,
              {
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                borderWidth: isDark ? 1 : 0,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Row
              icon="🥗"
              label={t('active_diet_plan')}
              value={hasActivePlan ? "Standard Ayurvedic Plan" : "No active plan"}
              arrow
              onPress={() => router.push("/(tabs)/meal-plan")}
            />
            <Row
              icon="👨‍⚕️"
              label={t('your_dietitian')}
              value={dietitianName ? dietitianName : "Connect with an expert"}
              arrow
              onPress={() => router.push("/(tabs)/dietitian")}
            />
            <Row
              icon="⚖️"
              label={t('health_profile')}
              value="Diet, Region & Goals"
              arrow
              onPress={() =>
                router.push({
                  pathname: "/onboarding",
                  params: { retake: "true" },
                })
              }
            />
            <Row
              icon="📊"
              label={t('wellness_goals')}
              value={goalsDisplay}
              arrow
              last
              onPress={() => router.push("/(profile)/goals")}
            />
          </View>

          {/* Favorite Meals Section (Kept as requested) */}
          {favorites.filter(m => m && m.name).length > 0 && (
            <>
              <View style={[s.sectionHeader, { marginTop: 12 }]}>
                <Text style={[s.sectionLabel, { color: colors.text, marginBottom: 0 }]}>{t('favorite_recipes')}</Text>
                <TouchableOpacity onPress={() => router.push("/(profile)/favorites")}>
                   <Text style={[s.viewAll, { color: colors.gold }]}>{t('view_all')} ›</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={s.favScroll}
              >
                {favorites.map((meal, i) => {
                  if (!meal || typeof meal !== 'object' || !meal.name) return null;
                  
                  const todayIdx = getTodayIndex();
                  const isCompletedToday = todayMeals.some((tm, tmIdx) => 
                    tm.name === meal.name && checkedMeals[`${todayIdx}-${tmIdx}`]
                  );

                  return (
                    <TouchableOpacity 
                      key={i} 
                      style={[s.favCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                      onPress={() => {
                        if (meal.source === "recipe-generator") {
                          router.push({
                            pathname: "/(profile)/recipe-detail",
                            params: { recipe: JSON.stringify(meal) }
                          });
                        } else {
                          router.push({
                            pathname: "/(profile)/meal-detail",
                            params: { meal: JSON.stringify(meal) }
                          });
                        }
                      }}
                    >
                      <Image 
                        source={{ uri: getFoodImageUrl(meal.imageKeyword, meal.name) }} 
                        style={s.favImg} 
                      />
                      <View style={s.favTypeBadge}>
                        <Text style={s.favTypeText}>{meal.emoji || "🍽️"} {meal.type || "Meal"}</Text>
                      </View>
                      
                      {isCompletedToday && (
                        <View style={[s.favCheckBadge, { backgroundColor: colors.green }]}>
                          <Ionicons name="checkmark" size={10} color={colors.gold} />
                        </View>
                      )}

                      <View style={s.favContent}>
                        <Text style={[s.favName, { color: colors.text }]} numberOfLines={1}>{meal.name}</Text>
                        <View style={s.favStats}>
                          <Ionicons name="flame" size={10} color={colors.gold} />
                          <Text style={[s.favCal, { color: colors.textMuted }]}>{meal.calories || 0} kcal</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Group 3: App Preferences */}
          <Text style={[s.sectionLabel, { color: colors.text, marginTop: 12 }]}>{t('app_preferences')}</Text>
          <View
            style={[
              s.card,
              {
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                borderWidth: isDark ? 1 : 0,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Row
              icon="🌐"
              label={t('language')}
              value="English (Standard)"
              arrow
              onPress={() => router.push("/(profile)/preferences")}
            />
            <Row
              icon="🔔"
              label={t('push_notifs')}
              value={notifDisplay}
              arrow
              onPress={() => router.push("/(profile)/preferences")}
            />
            <Row
              icon="🎨"
              label={t('theme_mode')}
              value={themeDisplay}
              arrow
              last
              onPress={() => router.push("/(profile)/preferences")}
            />
          </View>

          {/* Footer Branding & Sign Out */}
          <View style={s.footer}>
            <View style={s.appInfo}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={s.footerLogo}
                resizeMode="contain"
              />
              <Text style={[s.appName, { color: colors.text }]}>AyurNutri</Text>
              <Text style={[s.appVersion, { color: colors.textMuted }]}>
                v1.0.0 · All Rights Reserved
              </Text>
            </View>

            <TouchableOpacity
              style={[
                s.signOutBtn,
                {
                  backgroundColor: isDark ? colors.surface : `${colors.errorBg}`,
                  borderColor: colors.errorBorder,
                },
              ]}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.errorText} style={{ marginRight: 8 }} />
              <Text style={[s.signOutText, { color: colors.errorText }]}>
                {t('sign_out')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* Photo Selection Bottom Sheet */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <Pressable 
          style={s.modalOverlay} 
          onPress={() => setShowPhotoOptions(false)}
        >
          <Animated.View 
            style={[
              s.bottomSheet, 
              { 
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'ios' ? 16 : 0)
              }
            ]}
          >
            <View style={[s.sheetHandle, { backgroundColor: colors.divider }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Profile Photo</Text>
            
            <View style={s.sheetOptions}>
              <TouchableOpacity 
                style={s.sheetOption} 
                onPress={handleCameraLaunch}
                activeOpacity={0.7}
              >
                <View style={[s.sheetIconBox, { backgroundColor: `${colors.gold}15` }]}>
                  <Ionicons name="camera" size={24} color={colors.gold} />
                </View>
                <Text style={[s.sheetOptionText, { color: colors.text }]}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={s.sheetOption} 
                onPress={handleLibraryLaunch}
                activeOpacity={0.7}
              >
                <View style={[s.sheetIconBox, { backgroundColor: `${colors.gold}15` }]}>
                  <Ionicons name="images" size={24} color={colors.gold} />
                </View>
                <Text style={[s.sheetOptionText, { color: colors.text }]}>Choose from Gallery</Text>
              </TouchableOpacity>

              {profilePhoto && (
                <TouchableOpacity 
                  style={s.sheetOption} 
                  onPress={handleRemovePhoto}
                  activeOpacity={0.7}
                >
                  <View style={[s.sheetIconBox, { backgroundColor: `${colors.errorBg}20` }]}>
                    <Ionicons name="trash" size={24} color={colors.errorText} />
                  </View>
                  <Text style={[s.sheetOptionText, { color: colors.errorText }]}>Remove Current Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={[s.sheetCancelBtn, { backgroundColor: isDark ? colors.surface : colors.background }]}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={[s.sheetCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  headerBlock: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    zIndex: 10,
  },
  headerContent: { 
    paddingTop: SAFE_TOP_PADDING + 10, 
    paddingBottom: 32, 
    paddingHorizontal: 28 
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextCol: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: "center",
  },
  welcomeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginBottom: 4,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  userName: { 
    fontSize: 28, 
    fontWeight: "900", 
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  avatarWrap: { 
    position: "relative",
  },
  avatar: { 
    width: 84, 
    height: 84, 
    borderRadius: 42, 
    borderWidth: 2.5 
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "900", letterSpacing: 1 },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    borderWidth: 2.5,
  },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  memberPill: {
    marginTop: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  memberText: { fontSize: 9, fontWeight: "700" },
  
  body: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 140, width: '100%', maxWidth: 900, alignSelf: 'center' },
  sectionHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 12, 
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  viewAll: { fontSize: 13, fontWeight: "700" },

  /* Dosha Card Dashboard */
  doshaCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 26,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    shadowColor: "#000",
  },
  doshaCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  doshaIconContainer: {
    minWidth: 52,
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  doshaEmoji: { fontSize: 26 },
  doshaInfo: { flex: 1 },
  doshaLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  doshaTypeMain: { color: '#FFF', fontSize: 22, fontWeight: "900" },
  
  doshaEmptyState: { marginTop: 16 },
  doshaEmptyText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  doshaActionBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  doshaActionBtnText: { color: '#000', fontWeight: "700", fontSize: 14 },

  doshaStatsRow: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    alignItems: "center",
  },
  doshaStatItem: { flex: 1, alignItems: "center" },
  doshaStatVal: { color: '#FFF', fontSize: 18, fontWeight: "800" },
  doshaStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: "600", marginTop: 2, textTransform: "uppercase" },
  doshaStatDivider: { width: 1, height: 24 },

  card: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  
  /* Footer & Signs */
  footer: { marginTop: 10, alignItems: "center" },
  appInfo: { alignItems: "center", marginBottom: 28 },
  footerLogo: { width: 44, height: 44, marginBottom: 12, opacity: 0.9 },
  appName: { fontSize: 16, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  appVersion: { fontSize: 11, marginTop: 4, fontWeight: "500", opacity: 0.5 },
  
  signOutBtn: {
    flexDirection: "row",
    borderRadius: 16,
    height: 54,
    width: '100%',
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  signOutText: { fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },

  /* Row */
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    opacity: 0.55,
  },
  rowValue: { fontSize: 15, fontWeight: "700", marginTop: 3 },
  rowArrowBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,
  },

  /* Favorites (Matching the existing scroll) */
  favScroll: { paddingLeft: 4, paddingBottom: 10 },
  favCard: { 
    width: 150, 
    borderRadius: 20, 
    marginRight: 14, 
    borderWidth: 1, 
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  favImg: { width: "100%", height: 90 },
  favCheckBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  favTypeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  favTypeText: { color: "#fff", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  favContent: { padding: 12 },
  favName: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  favStats: { flexDirection: "row", alignItems: "center", gap: 4 },
  favCal: { fontSize: 11, fontWeight: "700" },

  /* Bottom Sheet Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 20,
    opacity: 0.5,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 24,
  },
  sheetOptions: {
    gap: 12,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  sheetOptionText: {
    fontSize: 16,
    fontWeight: "700",
  },
  sheetCancelBtn: {
    marginTop: 20,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
