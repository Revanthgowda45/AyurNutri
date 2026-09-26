import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/services/firestoreService";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Pressable,
} from "react-native";

/* ── Mock specialties & ratings for richer UI ── */
const SPECIALTIES = [
  ["Gut Health", "Panchakarma", "Stress"],
  ["Women's Health", "Diabetes", "Weight"],
  ["Skin & Hair", "Joint Care", "Sleep"],
  ["Immunity", "Ayurveda", "Detox"],
];
const RATINGS = [4.9, 4.8, 4.7, 4.9, 4.8, 4.7];
const REVIEWS = [312, 187, 264, 421, 156, 298];
const EMOJI_LIST = ["👨‍⚕️", "👩‍⚕️", "🧑‍⚕️", "👨‍⚕️", "👩‍⚕️", "🧑‍⚕️"];

function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.floor(rating) ? "star" : s - 0.5 <= rating ? "star-half" : "star-outline"}
          size={11}
          color={color}
        />
      ))}
    </View>
  );
}

export default function ConnectDietitianScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 768;

  const [dietitians, setDietitians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [currentDietitianId, setCurrentDietitianId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [filterActive, setFilterActive] = useState("All");

  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  const filters = ["All", "Available", "Connected", "Top Rated"];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    const fetchData = async () => {
      if (user?.uid) {
        const conn = await firestore.getDietitianConnection(user.uid);
        setCurrentDietitianId(conn?.dietitianId || null);
      }
      const data = await firestore.getAvailableDietitians();
      setDietitians(data);
      setLoading(false);
    };
    fetchData();
  }, [user?.uid]);

  const handleConnect = async (dietitianId: string) => {
    if (!user?.uid) return;
    setConnectingId(dietitianId);
    try {
      await firestore.connectDietitian(user.uid, dietitianId);
      setCurrentDietitianId(dietitianId);
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.uid) return;
    setConnectingId("disconnecting");
    try {
      await firestore.connectDietitian(user.uid, "");
      setCurrentDietitianId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setConnectingId(null);
    }
  };

  const handleScroll = (event: any) => {
    setIsScrolled(event.nativeEvent.contentOffset.y > 10);
  };

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0, justifyContent: "center", alignItems: "center" }]}>
        <View style={[s.loadingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>Finding practitioners...</Text>
        </View>
      </View>
    );
  }

  const filteredDietitians = dietitians.filter((doc) => {
    if (filterActive === "All") return true;
    if (filterActive === "Connected") return currentDietitianId === doc.id;
    if (filterActive === "Available") return currentDietitianId !== doc.id;
    if (filterActive === "Top Rated") return true; // all are top-rated in mock
    return true;
  });

  return (
    <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0 }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.headerBg} />

      {/* ─── Header ─── */}
      <LinearGradient
        colors={isDark ? [colors.card, colors.headerBg] : [colors.headerBg, '#2D6A4F']}
        style={[
          s.headerBlock,
          isScrolled && { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[s.headerContent, { opacity: fade }]}>
          <Text style={s.headerTitle}>Ayurvedic Experts</Text>
          <Text style={s.headerSub}>Connect with a verified BAMS practitioner</Text>
        </Animated.View>
      </LinearGradient>

      {/* ─── Filter Pills ─── */}
      <Animated.View style={{ opacity: fade }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                s.filterPill,
                {
                  backgroundColor: filterActive === f
                    ? colors.gold
                    : isDark ? colors.surface : "#F5F0E8",
                  borderColor: filterActive === f ? colors.gold : colors.cardBorder,
                },
              ]}
              onPress={() => setFilterActive(f)}
            >
              <Text style={[s.filterText, { color: filterActive === f ? (isDark ? "#0A1A10" : "#1B4332") : colors.textMuted }]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ─── List ─── */}
      <ScrollView
        contentContainerStyle={[s.listContent, isDesktop && { alignItems: "flex-start" }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {filteredDietitians.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>🔍</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No practitioners found</Text>
            <Text style={[s.emptySub, { color: colors.textMuted }]}>Try a different filter or check back later.</Text>
          </View>
        ) : (
          <View style={[isDesktop && s.gridRow]}>
            {filteredDietitians.map((doc, idx) => (
              <DietitianCard
                key={doc.id}
                doc={doc}
                idx={idx}
                isDesktop={isDesktop}
                isConnected={currentDietitianId === doc.id}
                isProcessing={connectingId === doc.id}
                connectingId={connectingId}
                colors={colors}
                isDark={isDark}
                fade={fade}
                handleConnect={handleConnect}
                handleDisconnect={handleDisconnect}
                specialties={SPECIALTIES[idx % SPECIALTIES.length]}
                rating={RATINGS[idx % RATINGS.length]}
                reviews={REVIEWS[idx % REVIEWS.length]}
                emoji={EMOJI_LIST[idx % EMOJI_LIST.length]}
              />
            ))}
          </View>
        )}

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function DietitianCard({ doc, idx, isDesktop, isConnected, isProcessing, connectingId, colors, isDark, fade, handleConnect, handleDisconnect, specialties, rating, reviews, emoji }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isHovered ? 1.015 : 1,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [isHovered]);

  return (
    <Pressable
      style={isDesktop ? s.cardDesktop : { width: "100%" }}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      <Animated.View
        style={[
          s.card,
          {
            backgroundColor: colors.card,
            shadowColor: isConnected ? colors.gold : "#000",
            borderWidth: 1.5,
            borderColor: isConnected
              ? colors.gold
              : isHovered
              ? `${colors.gold}30`
              : colors.cardBorder,
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Connected badge */}
        {isConnected && (
          <View style={[s.connectedBanner, { backgroundColor: `${colors.gold}18`, borderBottomColor: `${colors.gold}30` }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
            <Text style={[s.connectedBannerText, { color: colors.gold }]}>Currently Connected</Text>
          </View>
        )}

        {/* Card Body */}
        <View style={s.cardHeader}>
          {/* Avatar */}
          <View style={s.avatarWrap}>
            <LinearGradient
              colors={isDark ? ["#1B4332", "#0A1A10"] : ["#2D6A4F", "#1B4332"]}
              style={s.avatar}
            >
              <Text style={s.avatarEmoji}>{emoji}</Text>
            </LinearGradient>
            {/* Online indicator */}
            <View style={[s.onlineDot, { backgroundColor: "#10B981", borderColor: colors.card }]} />
          </View>

          {/* Info */}
          <View style={s.infoBlock}>
            <Text style={[s.nameText, { color: colors.text }]} numberOfLines={1}>{doc.name}</Text>
            <Text style={[s.clinicText, { color: colors.textSecondary }]} numberOfLines={1}>{doc.clinic}</Text>

            {/* Rating row */}
            <View style={s.ratingRow}>
              <StarRating rating={rating} color={colors.gold} />
              <Text style={[s.ratingNum, { color: colors.gold }]}>{rating}</Text>
              <Text style={[s.reviewCount, { color: colors.textMuted }]}>({reviews} reviews)</Text>
            </View>
          </View>
        </View>

        {/* Specialty tags */}
        <View style={s.tagsRow}>
          {specialties.map((sp: string, ti: number) => (
            <View
              key={ti}
              style={[s.tag, { backgroundColor: isDark ? "rgba(16,185,129,0.1)" : "#ECFDF5", borderColor: isDark ? "rgba(16,185,129,0.2)" : "#D1FAE5" }]}
            >
              <Text style={[s.tagText, { color: isDark ? "#6EE7B7" : "#059669" }]}>{sp}</Text>
            </View>
          ))}
        </View>

        {/* Credentials row */}
        <View style={[s.credRow, { borderTopColor: colors.divider, borderBottomColor: colors.divider }]}>
          <View style={s.credItem}>
            <Ionicons name="ribbon-outline" size={13} color={colors.gold} />
            <Text style={[s.credText, { color: colors.textSecondary }]}>{doc.bamsNumber}</Text>
          </View>
          <View style={[s.credDivider, { backgroundColor: colors.divider }]} />
          <View style={s.credItem}>
            <Ionicons name="time-outline" size={13} color={colors.gold} />
            <Text style={[s.credText, { color: colors.textSecondary }]}>{doc.experience} Exp.</Text>
          </View>
          <View style={[s.credDivider, { backgroundColor: colors.divider }]} />
          <View style={s.credItem}>
            <Ionicons name="cash-outline" size={13} color={colors.gold} />
            <Text style={[s.credText, { color: colors.textSecondary }]}>₹499/session</Text>
          </View>
        </View>

        {/* Action footer */}
        <View style={s.cardFooter}>
          {isConnected ? (
            <>
              <TouchableOpacity
                style={[s.secondaryBtn, { borderColor: colors.cardBorder }]}
                onPress={() => {}} // could navigate to chat
              >
                <Ionicons name="chatbubble-outline" size={14} color={colors.text} />
                <Text style={[s.secondaryBtnText, { color: colors.text }]}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.disconnectBtn, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}
                onPress={handleDisconnect}
                disabled={connectingId !== null}
              >
                {connectingId === "disconnecting" ? (
                  <ActivityIndicator size="small" color={colors.errorText} />
                ) : (
                  <Text style={[s.actionText, { color: colors.errorText }]}>Disconnect</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.availDot}>
                <View style={[s.availDotInner, { backgroundColor: "#10B981" }]} />
                <Text style={[s.availText, { color: colors.textMuted }]}>Available now</Text>
              </View>
              <TouchableOpacity
                style={[s.connectBtn, { backgroundColor: colors.gold, shadowColor: colors.gold }]}
                onPress={() => handleConnect(doc.id)}
                disabled={connectingId !== null}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#1B4332" />
                ) : (
                  <>
                    <Text style={s.connectBtnText}>Connect</Text>
                    <Ionicons name="arrow-forward" size={14} color="#1B4332" style={{ marginLeft: 4 }} />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  /* Loading */
  loadingCard: { borderRadius: 20, padding: 32, alignItems: "center", gap: 16, borderWidth: 1 },
  loadingText: { fontSize: 14, fontWeight: "500" },

  /* Header */
  headerBlock: {
    paddingTop: SAFE_TOP_PADDING,
    paddingBottom: 28,
    overflow: "hidden",
  },
  heroBubble: { position: "absolute", borderRadius: 999 },
  headerContent: { alignItems: "center", paddingHorizontal: 24 },
  headerIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12, marginTop: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#FDF8F0", letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: "rgba(253,248,240,0.6)", marginTop: 4, marginBottom: 14 },
  trustRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  trustBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  trustLabel: { fontSize: 10, fontWeight: "700", color: "rgba(253,248,240,0.8)", letterSpacing: 0.5 },

  /* Filters */
  filterScroll: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "700" },

  /* List */
  listContent: { padding: 16, paddingBottom: 40, width: "100%", maxWidth: 960, alignSelf: "center" },
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },

  /* Empty */
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 22 },

  /* Card */
  card: {
    borderRadius: 20,
    marginBottom: 14,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardDesktop: { width: "calc(50% - 7px)" as any },

  /* Connected banner */
  connectedBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  connectedBannerText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },

  /* Card header */
  cardHeader: { flexDirection: "row", padding: 16, alignItems: "center" },
  avatarWrap: { position: "relative", marginRight: 14 },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
  },
  avatarEmoji: { fontSize: 28 },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6, borderWidth: 2,
  },
  infoBlock: { flex: 1 },
  nameText: { fontSize: 17, fontWeight: "800", marginBottom: 2, letterSpacing: -0.3 },
  clinicText: { fontSize: 13, marginBottom: 6 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  ratingNum: { fontSize: 12, fontWeight: "800" },
  reviewCount: { fontSize: 11 },

  /* Tags */
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: "700" },

  /* Credentials */
  credRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10 },
  credItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "center" },
  credText: { fontSize: 11, fontWeight: "600" },
  credDivider: { width: 1, height: 16 },

  /* Footer */
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  availDot: { flexDirection: "row", alignItems: "center", gap: 6 },
  availDotInner: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 12, fontWeight: "600" },

  connectBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  connectBtnText: { fontSize: 14, fontWeight: "800", color: "#1B4332" },

  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "700" },

  disconnectBtn: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1,
  },
  actionText: { fontSize: 13, fontWeight: "700" },
});
