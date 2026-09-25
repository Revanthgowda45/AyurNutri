import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/services/firestoreService";
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

export default function ConnectDietitianScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 768;

  const [dietitians, setDietitians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [currentDietitianId, setCurrentDietitianId] = useState<string | null>(
    null,
  );
  const [isScrolled, setIsScrolled] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

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
      // Removed router.back() since it's now a root tab
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
      // In a real app we might delete the doc or set to null,
      // for this mock we will just let connectDietitian handle a null-like empty string
      await firestore.connectDietitian(user.uid, "");
      setCurrentDietitianId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setConnectingId(null);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          s.screen,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
            marginLeft: isDesktop ? 260 : 0,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={{ color: colors.textMuted, marginTop: 16 }}>
          Loading practitioners...
        </Text>
      </View>
    );
  }

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 10);
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background, marginLeft: isDesktop ? 260 : 0 }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBg}
      />
      <View
        style={[
          s.headerBlock,
          { backgroundColor: isDark ? colors.card : colors.headerBg },
          isScrolled && {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 4,
          },
        ]}
      >
        <Animated.View style={[s.headerContent, { opacity: fade }]}>
          <Text style={[s.headerTitle, { color: colors.textOnHeader }]}>
            Ayurvedic Experts
          </Text>
          <Text style={[s.headerSub, { color: colors.textOnHeaderSub }]}>
            Connect with a verified BAMS practitioner
          </Text>
        </Animated.View>
      </View>

      <ScrollView
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={isDesktop ? s.gridRow : null}>
          {dietitians.map((doc, idx) => (
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
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function DietitianCard({ doc, idx, isDesktop, isConnected, isProcessing, connectingId, colors, isDark, fade, handleConnect, handleDisconnect }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isHovered ? 1.02 : 1,
      friction: 7,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isHovered]);

  return (
    <Pressable
      style={isDesktop ? s.cardDesktop : null}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      <Animated.View
        style={[
          s.card,
          {
            backgroundColor: colors.card,
            shadowColor: colors.shadow,
            borderWidth: isDark || isConnected ? 1 : 0,
            borderColor: isConnected ? colors.gold : colors.cardBorder,
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={s.cardHeader}>
          <View style={[s.avatar, { backgroundColor: colors.iconBoxBg }]}>
            <Text style={s.avatarEmoji}>👨‍⚕️</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={[s.name, { color: colors.text }]}>
              {doc.name}
            </Text>
            <Text style={[s.clinic, { color: colors.textMuted }]}>
              {doc.clinic}
            </Text>
            <View style={[s.badgeRow, { marginTop: 6 }]}>
              <View
                style={[s.badge, { backgroundColor: colors.background }]}
              >
                <Text style={[s.badgeText, { color: colors.textMuted }]}>
                  {doc.bamsNumber}
                </Text>
              </View>
              <View
                style={[s.badge, { backgroundColor: colors.background }]}
              >
                <Text style={[s.badgeText, { color: colors.textMuted }]}>
                  {doc.experience} Exp
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[s.cardFooter, { borderTopColor: colors.divider }]}>
          {isConnected ? (
            <>
              <Text style={[s.statusText, { color: colors.successText }]}>
                ✓ connected
              </Text>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.errorBg }]}
                onPress={handleDisconnect}
                disabled={connectingId !== null}
              >
                {connectingId === "disconnecting" ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.errorText}
                  />
                ) : (
                  <Text
                    style={[s.actionText, { color: colors.errorText }]}
                  >
                    Disconnect
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[s.statusText, { color: colors.textMuted }]}>
                Available
              </Text>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.gold }]}
                onPress={() => handleConnect(doc.id)}
                disabled={connectingId !== null}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[s.actionText, { color: colors.textOnHeader }]}>
                    Connect
                  </Text>
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
  headerBlock: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    paddingBottom: 20,
  },
  headerContent: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 4,
  },
  headerSub: { fontSize: 13, marginTop: 6, opacity: 0.9 },

  listContent: { padding: 20, paddingBottom: 120, width: '100%', maxWidth: 900, alignSelf: 'center' },
  gridRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardDesktop: {
    width: "48%",
  },
  cardHeader: { flexDirection: "row", padding: 20 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarEmoji: { fontSize: 28 },
  infoBlock: { flex: 1, justifyContent: "center" },
  name: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  clinic: { fontSize: 13, fontWeight: "500", opacity: 0.8 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 110,
    alignItems: "center",
  },
  actionText: { fontSize: 14, fontWeight: "700" },
});
