import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useHomeScreenData } from "@/hooks/useHomeScreenData";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { getTodayIndex } from "@/utils/weekUtils";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  useWindowDimensions,
} from "react-native";
import {
  hasPromptedForNotifications,
  markPromptedForNotifications,
  openAppNotificationSettings,
} from "@/utils/notifications";

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const {
    user,
    stats,
    todayMeals,
    checkedMeals,
    favorites,
    consumedCals,
    totalCals,
    progressPercent,
    goalMacros,
    consumedMacros,
    profilePhoto,
    toggleMealCheck,
    toggleFavorite,
  } = useHomeScreenData();

  const displayName = user?.displayName || "Guest";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const photoURL = profilePhoto || user?.photoURL;

  // Time-based greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('good_morning');
    if (h < 17) return t('good_afternoon');
    return t('good_evening');
  };

  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMealIndex, setActiveMealIndex] = useState(0);
  const [showNotifModal, setShowNotifModal] = useState(false);

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

  // Show notification prompt once after login
  useEffect(() => {
    if (!user) return;
    (async () => {
      const alreadyAsked = await hasPromptedForNotifications();
      if (!alreadyAsked) {
        setTimeout(() => setShowNotifModal(true), 1500);
      }
    })();
  }, [user]);

  const isDoshaCompleted = stats.dosha !== "Discover";

  const actions = [
    {
      icon: "🧘",
      title: t('dosha_assessment'),
      desc: t('dosha_desc'),
      bg: colors.actionDoshaBg,
      border: colors.actionDoshaBorder,
      route: "/(profile)/dosha-assessment",
    },
    {
      icon: "🥗",
      title: t('ai_diet_plan'),
      desc: t('diet_desc'),
      bg: colors.actionDietBg,
      border: colors.actionDietBorder,
      route: "/(tabs)/meal-plan",
      disabled: !isDoshaCompleted,
    },
    {
      icon: "👨‍🍳",
      title: t('recipe_gen'),
      desc: t('recipe_desc'),
      bg: colors.actionRecipeBg,
      border: colors.actionRecipeBorder,
      route: "/(profile)/recipe-generator",
    },
    {
      icon: "📷",
      title: t('food_scanner'),
      desc: t('scanner_desc'),
      bg: colors.actionScanBg,
      border: colors.actionScanBorder,
      route: "/(tabs)/scanner",
    },
    {
      icon: "💬",
      title: t('chat_bot') || 'Ask Vaidya AI',
      desc: t('chat_bot_desc') || 'Your personal Ayurvedic guide',
      bg: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
      border: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
      route: "/(profile)/chat-bot",
    },
    {
      icon: "🕉️",
      title: t('dinacharya') || 'Daily Routine',
      desc: t('dinacharya_desc') || 'Ayurvedic Dinacharya rituals',
      bg: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFF7ED',
      border: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFEDD5',
      route: "/(profile)/dinacharya",
    },
    {
      icon: "💧",
      title: t('hydration') || 'Hydration',
      desc: t('hydration_desc') || 'Ayurvedic water tracker',
      bg: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF',
      border: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
      route: "/(profile)/hydration",
    },
    {
      icon: "🔥",
      title: t('agni_monitor') || 'Agni Monitor',
      desc: t('agni_monitor_desc') || 'Track Digestive Fire',
      bg: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
      border: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FECACA',
      route: "/(profile)/agni-monitor",
    },
    {
      icon: "⚖️",
      title: t('vikruti_assessment') || 'Current Imbalance',
      desc: t('vikruti_desc') || 'Prakruti vs Vikruti check',
      bg: isDark ? 'rgba(139, 92, 246, 0.08)' : '#F5F3FF',
      border: isDark ? 'rgba(139, 92, 246, 0.15)' : '#EDE9FE',
      route: "/(profile)/vikruti-assessment",
    },
  ];


  /* ── helper for meal images ── */
  const getFoodImageUrl = (keyword?: string, fallbackName?: string, mealType?: string): string => {
    const MEAL_DEFAULT_IMAGES: any = {
      "Early Morning": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80",
      Breakfast: "https://images.unsplash.com/photo-1645177628172-a94c1f96debb?w=800&q=80",
      Lunch: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
      Snack: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80",
      Dinner: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80",
    };

    const term = keyword || fallbackName;
    if (term) {
      return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=800&h=400&c=7&rs=1&p=0`;
    }
    return MEAL_DEFAULT_IMAGES[mealType || "Lunch"];
  };

  const toggleFavoriteMeal = (meal: any) => {
    toggleFavorite(meal);
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 10);
  };

  const handleMealScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (280 + 12)); // card width + margin
    setActiveMealIndex(index);
  };

  const renderStatsRow = (isInHeader: boolean) => (
    <View style={s.statsRow}>
      {[
        { icon: "leaf", label: t('dosha'), value: stats.dosha, tint: 'rgba(16,185,129,0.12)' },
        { icon: "restaurant", label: t('plans'), value: stats.plans, tint: 'rgba(245,158,11,0.12)' },
        { icon: "flame", label: t('streak'), value: stats.streak, tint: 'rgba(239,68,68,0.12)' },
      ].map((item, i) => (
        <View
          key={i}
          style={[
            s.statCard,
            {
              backgroundColor: isInHeader
                ? (isDark ? colors.surface : 'rgba(255,255,255,0.10)')
                : (isDark ? colors.surface : colors.card),
              borderColor: isInHeader 
                ? (isDark ? colors.cardBorder : 'rgba(255,255,255,0.15)')
                : colors.cardBorder,
            },
            i === 2 && { marginRight: 0 }
          ]}
        >
          <View style={[s.statIconWrap, { backgroundColor: item.tint }]}>
            <Ionicons
              name={item.icon as any}
              size={18}
              color={colors.gold}
            />
          </View>
          <Text
            style={[
              s.statValue,
              { color: isInHeader ? colors.textOnHeader : colors.text },
            ]}
          >
            {item.value}
          </Text>
          <Text
            style={[
              s.statLabel,
              {
                color: isInHeader
                  ? (isDark ? colors.textSecondary : 'rgba(255,255,255,0.5)')
                  : colors.textMuted,
              },
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0 }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBg}
      />

      {/* ─── Premium Header ─── */}
      <View
        style={[
          s.headerBlock,
          {
            backgroundColor: isDark ? colors.card : colors.headerBg,
          },
          isScrolled && {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 6,
          }
        ]}
      >
        <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center' }}>
          <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                s.greeting,
                {
                  color: isDark ? colors.textSecondary : colors.textOnHeaderSub,
                },
              ]}
            >
              {getGreeting()}
            </Text>
            <Text
              style={[s.name, { color: colors.textOnHeader }]}
            >
              {firstName} 🙏
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
            style={s.avatarWrap}
          >
            <View style={[s.avatarGlow, { borderColor: `${colors.gold}50` }]}>
              {photoURL ? (
                <Image
                  source={{ uri: photoURL }}
                  style={s.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    s.avatarFallback,
                    {
                      backgroundColor: `${colors.gold}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.avatarFallbackText,
                      { color: colors.textOnHeader },
                    ]}
                  >
                    {initials}
                  </Text>
                </View>
              )}
            </View>
            {/* Online dot */}
            <View style={[s.onlineDot, { backgroundColor: '#10B981', borderColor: isDark ? colors.card : colors.headerBg }]} />
          </TouchableOpacity>
        </View>

        {/* Gold accent line */}
        <View style={[s.headerGoldLine, { backgroundColor: colors.gold }]} />

        {/* Stats on Mobile */}
        {!isDesktop && renderStatsRow(true)}
        </View>
      </View>

      {/* ─── Body ─── */}
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

          {/* Stats on Desktop moved to body so they scroll away */}
          {isDesktop && (
            <View style={{ marginBottom: 24 }}>
              {renderStatsRow(false)}
            </View>
          )}

          {todayMeals.length > 0 && (
            <View style={s.mealPlanSection}>
              <View style={s.sectionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>
                    {t('todays_journey')}
                  </Text>
                  <View style={s.compactCalories}>
                    <Text style={[s.nutriValTiny, { color: colors.gold }]}>{consumedCals}</Text>
                    <Text style={[s.nutriLabelTiny, { color: colors.textMuted }]}> / {totalCals} kcal</Text>
                    <View style={[s.progressRingMini, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                      <View style={[s.progressRingFillMini, {
                        borderColor: colors.gold,
                        borderTopColor: progressPercent > 0 ? colors.gold : 'transparent',
                        borderRightColor: progressPercent > 0.25 ? colors.gold : 'transparent',
                        borderBottomColor: progressPercent > 0.5 ? colors.gold : 'transparent',
                        borderLeftColor: progressPercent > 0.75 ? colors.gold : 'transparent',
                        transform: [{ rotate: '-45deg' }],
                      }]} />
                      <Text style={[s.progressRingText, { color: colors.gold }]}>{Math.round(progressPercent * 100)}%</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={[s.viewAllBtn, { backgroundColor: isDark ? 'rgba(253,224,71,0.08)' : 'rgba(245,158,11,0.06)', borderColor: isDark ? 'rgba(253,224,71,0.20)' : 'rgba(245,158,11,0.15)' }]} onPress={() => router.push("/(tabs)/meal-plan")}>
                  <Text style={[s.viewAll, { color: colors.gold }]}>{t('view_week')}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.gold} />
                </TouchableOpacity>
              </View>

              {/* Macro Pills Row */}
              <View style={s.macroCompactRow}>
                {[
                  { label: t('protein'), consumed: consumedMacros?.p || 0, target: goalMacros.p, color: '#EF4444', icon: '💪' },
                  { label: t('carbs'), consumed: consumedMacros?.c || 0, target: goalMacros.c, color: '#F59E0B', icon: '🌾' },
                  { label: t('fat'), consumed: consumedMacros?.f || 0, target: goalMacros.f, color: '#10B981', icon: '🥑' },
                ].map((macro, mi) => (
                  <View key={mi} style={[s.macroPillSmall, { backgroundColor: `${macro.color}08`, borderColor: `${macro.color}20` }]}>
                    <Text style={{ fontSize: 11 }}>{macro.icon}</Text>
                    <Text style={[s.macroTextTiny, { color: colors.text }]}>
                      {macro.consumed} <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '400' }}>/ {macro.target}g</Text>
                    </Text>
                  </View>
                ))}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.mealScroll}
                snapToInterval={280 + 12} // card width + margin
                decelerationRate="fast"
                onScroll={handleMealScroll}
                scrollEventThrottle={16}
              >
                {todayMeals.map((meal, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.mealCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    activeOpacity={0.9}
                    onPress={() => router.push({
                      pathname: "/(profile)/meal-detail",
                      params: { meal: JSON.stringify(meal) }
                    })}
                  >
                    <View style={s.mealBadgeRow}>
                      <View style={[s.mealTypeBadgeOut, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(245,158,11,0.08)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(245,158,11,0.2)" }]}>
                        <Text style={s.mealEmojiSmall}>{meal.emoji}</Text>
                        <Text style={[s.mealTypeOut, { color: colors.gold }]}>{meal.type}</Text>
                      </View>

                      <View style={s.mealActionRow}>
                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: colors.surface }]}
                          onPress={() => toggleFavorite(meal)}
                        >
                          <Ionicons
                            name={favorites.some((f: any) => f.name === meal.name) ? "heart" : "heart-outline"}
                            size={18}
                            color={favorites.some((f: any) => f.name === meal.name) ? "#EF4444" : colors.textMuted}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            s.iconActionBtn,
                            {
                              backgroundColor: checkedMeals[`${getTodayIndex()}-${i}`] ? colors.green : colors.surface,
                              borderColor: colors.divider
                            }
                          ]}
                          onPress={() => toggleMealCheck(i)}
                        >
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={checkedMeals[`${getTodayIndex()}-${i}`] ? "#fff" : colors.text}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <ImageBackground
                      source={{ uri: getFoodImageUrl(meal.imageKeyword, meal.name, meal.type) }}
                      style={s.mealImgBg}
                      imageStyle={{ borderRadius: 18 }}
                    >
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.8)"]}
                        style={s.mealGradient}
                      >
                        <View style={s.mealContent}>
                          <View style={s.mealBottomInfo}>
                            <Text style={s.mealNameHero} numberOfLines={1}>{meal.name}</Text>
                            <View style={s.mealStatsHero}>
                              <View style={s.mealStatPillHero}>
                                <Ionicons name="flame" size={10} color={colors.gold} />
                                <Text style={s.mealCalHero}>{meal.calories}</Text>
                              </View>
                              <View style={s.mealStatPillHero}>
                                <Text style={s.mealStatIconHero}>💪</Text>
                                <Text style={s.mealCalHero}>{meal.protein}g</Text>
                              </View>
                              <View style={s.mealStatPillHero}>
                                <Text style={s.mealStatIconHero}>🌾</Text>
                                <Text style={s.mealCalHero}>{meal.carbs}g</Text>
                              </View>
                              <View style={s.mealStatPillHero}>
                                <Text style={s.mealStatIconHero}>🥑</Text>
                                <Text style={s.mealCalHero}>{meal.fat}g</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Pagination Dots */}
              {todayMeals.length > 1 && (
                <View style={s.dotsRow}>
                  {todayMeals.map((_, dotIdx) => (
                    <View
                      key={dotIdx}
                      style={[
                        s.dot,
                        { backgroundColor: activeMealIndex === dotIdx ? colors.gold : colors.divider },
                        activeMealIndex === dotIdx && s.activeDot
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={s.actionSection}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{t('quick_actions')}</Text>
          </View>
          <View style={s.actionGrid}>
            {actions.map((a: any, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.gridCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                  a.disabled && { opacity: 0.55 }
                ]}
                activeOpacity={a.disabled ? 1 : 0.7}
                onPress={() => {
                  if (a.disabled) return;
                  if (a.route) router.push(a.route as any);
                }}
              >
                <View style={s.gridTopRow}>
                  <View style={[s.gridIconBox, { backgroundColor: a.disabled ? colors.divider : a.bg }]}>
                    <Text style={{ fontSize: 22, opacity: a.disabled ? 0.3 : 1 }}>{a.icon}</Text>
                    {a.disabled && (
                      <View style={s.lockIconWrap}>
                        <Ionicons name="lock-closed" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  {!a.disabled && (
                    <View style={[s.gridArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </View>
                  )}
                </View>
                <Text style={[s.gridTitle, { color: a.disabled ? colors.textMuted : colors.text }]} numberOfLines={1}>
                  {a.title}
                </Text>
                <Text style={[s.gridDesc, { color: colors.textMuted }]} numberOfLines={2}>
                  {a.disabled ? "Complete Dosha assessment first" : a.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tip Card */}
          <View
            style={[
              s.tipCard,
              { backgroundColor: colors.tipBg, borderColor: colors.tipBorder },
            ]}
          >
            <View style={s.tipHeader}>
              <View style={[s.tipIconWrap, { backgroundColor: isDark ? 'rgba(253,224,71,0.08)' : 'rgba(245,158,11,0.06)' }]}>
                <Text style={{ fontSize: 16 }}>💡</Text>
              </View>
              <Text style={[s.tipLabel, { color: colors.tipLabel }]}>
                {t('ayurvedic_tip')}
              </Text>
            </View>
            <Text style={[s.tipBody, { color: colors.tipText }]}>
              Start your day with warm water and lemon to balance your digestive
              fire (Agni) and boost metabolism naturally.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* ─── NOTIFICATION PROMPT MODAL ─── */}
      <Modal visible={showNotifModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '100%', shadowColor: colors.shadow, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 20, alignSelf: 'center' }}>
              <Ionicons name="notifications" size={32} color="#10B981" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 12 }}>
              Enable Reminders
            </Text>
            <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              Stay on track with personalized Ayurvedic reminders for meals, hydration, and your daily routine (Dinacharya).
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: colors.primaryBtn, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
              activeOpacity={0.8}
              onPress={async () => {
                setShowNotifModal(false);
                await markPromptedForNotifications();
                await openAppNotificationSettings();
              }}
            >
              <Text style={{ color: colors.primaryBtnText, fontSize: 16, fontWeight: '800' }}>Enable Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ paddingVertical: 12, alignItems: 'center' }}
              onPress={async () => {
                setShowNotifModal(false);
                await markPromptedForNotifications();
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>Not right now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  /* ─── Header ─── */
  headerBlock: {
    paddingTop: SAFE_TOP_PADDING,
    paddingHorizontal: 22,
    paddingBottom: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  greeting: { fontSize: 13, fontWeight: "600", letterSpacing: 0.3 },
  name: { fontSize: 28, fontWeight: "900", marginTop: 2, letterSpacing: -0.5 },
  headerGoldLine: { height: 3, borderRadius: 2, marginBottom: 16, opacity: 0.3 },

  /* Avatar */
  avatarWrap: { position: "relative" },
  avatarGlow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },

  /* Stats */
  statsRow: { flexDirection: "row" },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    marginRight: 8,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center" as any,
    justifyContent: "center" as any,
    marginBottom: 6,
  },
  statValue: { fontSize: 17, fontWeight: "900", marginTop: 2 },
  statLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2, marginTop: 3 },

  /* ─── Body ─── */
  body: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 160 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginBottom: 4,
  },

  /* Journey / Nutrition Progress */
  compactCalories: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
  nutriValTiny: { fontSize: 18, fontWeight: "900" },
  nutriLabelTiny: { fontSize: 13, fontWeight: "600", opacity: 0.6 },
  progressRingMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: "center" as any,
    justifyContent: "center" as any,
    position: "relative" as any,
  },
  progressRingFillMini: {
    position: "absolute" as any,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
  },
  progressRingText: { fontSize: 8, fontWeight: "900" },

  macroCompactRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  macroPillSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  macroTextTiny: { fontSize: 13, fontWeight: "800" },

  /* Action Grid */
  actionSection: { marginTop: 8, marginBottom: 12 },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    justifyContent: "flex-start",
    marginBottom: 14,
  },
  gridCard: {
    width: "47%",
    margin: "1.5%",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  gridTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  gridIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gridArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center" as any,
    justifyContent: "center" as any,
  },
  lockIconWrap: {
    position: "absolute",
    right: -4,
    top: -4,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  gridTitle: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  gridDesc: { fontSize: 11, lineHeight: 16 },

  /* Meal Plan Dashboard */
  mealPlanSection: { marginBottom: 24, marginTop: 6 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  viewAll: { fontSize: 12, fontWeight: "700" },
  mealScroll: { paddingBottom: 10, paddingLeft: 2 },
  mealCard: {
    width: 280,
    height: 300,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    elevation: 4,
    padding: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  mealBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  mealActionRow: { flexDirection: "row", alignItems: "center" },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealTypeBadgeOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  mealTypeOut: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
  mealImgBg: { flex: 1, width: "100%", borderRadius: 18, overflow: "hidden" },
  mealGradient: { flex: 1, justifyContent: "flex-end", padding: 14, borderRadius: 18 },
  mealContent: { width: "100%" },
  mealBottomInfo: { width: "100%" },
  mealNameHero: { fontSize: 18, fontWeight: "800", color: "#fff", marginBottom: 8 },
  mealStatsHero: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  mealStatPillHero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 4,
    marginBottom: 4,
  },
  mealStatIconHero: { fontSize: 13, marginRight: 4 },
  mealCalHero: { fontSize: 13, fontWeight: "800", color: "#fff" },
  mealEmojiSmall: { fontSize: 16 },

  /* Pagination Dots */
  dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  activeDot: { width: 18 },

  /* Tip */
  tipCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
  },
  tipHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  tipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center" as any,
    justifyContent: "center" as any,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  tipBody: { fontSize: 14, lineHeight: 22, fontWeight: "500" },
});
