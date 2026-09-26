import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const FEATURES = [
  { icon: "scan-outline" as const, title: "Smart Food Scanner", desc: "Point your camera at any food. Our AI instantly analyzes its nutritional value and Dosha compatibility.", color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  { icon: "calendar-outline" as const, title: "AI Meal Plans", desc: "Get personalized meal recommendations tailored to your unique Dosha and health goals.", color: "#D4A24E", bg: "rgba(212,162,78,0.1)" },
  { icon: "water-outline" as const, title: "Dosha Analysis", desc: "Take our comprehensive assessment to discover your Vata, Pitta, and Kapha constitution.", color: "#818CF8", bg: "rgba(129,140,248,0.1)" },
  { icon: "leaf-outline" as const, title: "Ayurvedic Recipes", desc: "Browse delicious, healthy recipes specifically suited to balance your body's natural state.", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  { icon: "medkit-outline" as const, title: "Expert Dietitians", desc: "Connect directly with verified BAMS practitioners for personalized Ayurvedic guidance.", color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  { icon: "sparkles-outline" as const, title: "AI Assistant", desc: "Chat with our intelligent assistant for instant Ayurvedic insights and lifestyle recommendations.", color: "#F472B6", bg: "rgba(244,114,182,0.1)" },
];

const CREAM = "#FDF8F0";
const GOLD = "#D4A24E";
const GREEN = "#1B4332";
const MUTED = "rgba(253,248,240,0.55)";
const BORDER = "rgba(255,255,255,0.08)";

function FeatureCard({ feature, isDesktop }: { feature: typeof FEATURES[0]; isDesktop: boolean }) {
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: hovered ? 1.04 : 1, friction: 7, tension: 80, useNativeDriver: true }).start();
  }, [hovered]);

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={isDesktop ? s.featureCardDesktop : s.featureCardMobile}
    >
      <Animated.View style={[s.featureCard, { transform: [{ scale }] }, hovered && { borderColor: feature.color + "40" }]}>
        <View style={[s.featureIconBox, { backgroundColor: feature.bg }]}>
          <Ionicons name={feature.icon} size={28} color={feature.color} />
        </View>
        <Text style={s.featureTitle}>{feature.title}</Text>
        <Text style={s.featureDesc}>{feature.desc}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { user, loading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width > 900;
  const isWide = width > 1200;

  const navAnim = useRef(new Animated.Value(0)).current;
  const heroTextAnim = useRef(new Animated.Value(0)).current;
  const heroImgAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && user) router.replace("/(tabs)/home");
  }, [user, loading]);

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(navAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(heroTextAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(heroImgAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(featuresAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const slideIn = (anim: Animated.Value, dist = 28) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dist, 0] }) }],
  });

  const floatStyle = {
    transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }],
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#D4A24E" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient
        colors={["#050E07", "#0A1A10", "#050E07"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[s.glow, { top: -150, left: "15%" as any, width: "50%" as any, backgroundColor: "#D4A24E" }]} />
      <View style={[s.glow, { top: "40%" as any, right: "-5%" as any, width: "35%" as any, backgroundColor: "#10B981", opacity: 0.08 }]} />
      <View style={[s.glow, { bottom: "10%" as any, left: "-5%" as any, width: "40%" as any, backgroundColor: "#818CF8", opacity: 0.06 }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* NAVBAR */}
        <Animated.View style={[s.nav, isDesktop && s.navDesktop, slideIn(navAnim, -16)]}>
          {isDesktop && <View style={s.navGlass} />}
          <View style={s.navInner}>
            <View style={s.navBrand}>
              <Image source={require("../assets/images/logo.png")} style={s.navLogo} resizeMode="contain" />
              <Text style={s.navBrandText}>AyurNutri</Text>
            </View>
            {isDesktop && (
              <View style={s.navLinks}>
                <Text style={s.navLink}>Features</Text>
              </View>
            )}
            <View style={s.navActions}>
              {isDesktop && (
                <TouchableOpacity style={s.navGhostBtn} onPress={() => router.push("/login")} activeOpacity={0.7}>
                  <Text style={s.navGhostText}>Log in</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.navCta} onPress={() => router.push("/signup")} activeOpacity={0.85}>
                <Text style={s.navCtaText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* HERO */}
        <View style={[s.hero, isDesktop && s.heroDesktop, isWide && s.heroWide]}>
          <Animated.View style={[s.heroText, isDesktop && s.heroTextDesktop, slideIn(heroTextAnim)]}>
            <View style={s.badge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeLabel}>Discover Your Ayurvedic Balance</Text>
            </View>
            <Text style={[s.heroTitle, isDesktop && s.heroTitleDesktop]}>
              {"Your Body's\nWisdom,\n"}
              <Text style={s.heroTitleAccent}>Decoded by AI.</Text>
            </Text>
            <Text style={[s.heroSub, isDesktop && s.heroSubDesktop]}>
              AyurNutri merges ancient Ayurvedic wisdom with modern AI to provide hyper-personalized nutrition and wellness guidance.
            </Text>
            <View style={[s.heroBtns, !isDesktop && s.heroBtnsMobile]}>
              <TouchableOpacity style={s.primaryBtn} onPress={() => router.push("/signup")} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>Start Free Trial</Text>
                <Ionicons name="arrow-forward" size={16} color="#1B4332" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => router.push("/login")} activeOpacity={0.8}>
                <Ionicons name="play-circle-outline" size={18} color="#FDF8F0" style={{ marginRight: 6 }} />
                <Text style={s.ghostBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
            <View style={s.trustRow}>
              <Ionicons name="leaf" size={14} color="#10B981" />
              <Text style={s.trustText}>Personalized Nutrition</Text>
              <Text style={s.trustSep}>�</Text>
              <Ionicons name="medkit" size={14} color="#10B981" />
              <Text style={s.trustText}>Verified Experts</Text>
              <Text style={s.trustSep}>�</Text>
              <Ionicons name="sparkles" size={14} color="#10B981" />
              <Text style={s.trustText}>AI Assistant</Text>
            </View>
          </Animated.View>

          <Animated.View style={[s.heroVisual, isDesktop && s.heroVisualDesktop, slideIn(heroImgAnim, 40)]}>
            <Animated.View style={[s.heroImgWrap, floatStyle]}>
              <View style={s.heroGlowRing} />
              <Image source={require("../assets/images/logo.png")} style={[s.heroImg, isDesktop && s.heroImgDesktop as any]} resizeMode="contain" />
              <View style={[s.floatCard, s.floatCardTopLeft]}>
                <Ionicons name="leaf" size={18} color="#10B981" />
                <Text style={s.floatCardText}>Vata Balanced</Text>
              </View>
              <View style={[s.floatCard, s.floatCardBottomRight]}>
                <Ionicons name="restaurant" size={18} color="#F59E0B" />
                <Text style={s.floatCardText}>2,100 kcal / day</Text>
              </View>
              <View style={[s.floatCard, s.floatCardTopRight]}>
                <Ionicons name="flame" size={18} color="#F472B6" />
                <Text style={s.floatCardText}>Pitta: 42%</Text>
              </View>
            </Animated.View>
          </Animated.View>
        </View>

        {/* FEATURES */}
        <Animated.View style={[s.section, slideIn(featuresAnim)]}>
          <View style={s.sectionHead}>
            <Text style={s.sectionEyebrow}>WHY AYURNUTRI</Text>
            <Text style={[s.sectionTitle, isDesktop && s.sectionTitleDesktop]}>{"Everything You Need to\nThrive from Within"}</Text>
            <Text style={s.sectionSub}>Built for people who believe health is personal • not one-size-fits-all.</Text>
          </View>
          <View style={[s.featuresGrid, isDesktop && s.featuresGridDesktop]}>
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} feature={f} isDesktop={isDesktop} />
            ))}
          </View>
        </Animated.View>

        {/* CTA BANNER */}
        <View style={[s.ctaBanner, isDesktop && s.ctaBannerDesktop]}>
          <LinearGradient
            colors={["rgba(212,162,78,0.15)", "rgba(16,185,129,0.10)"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={[s.ctaTitle, isDesktop && s.ctaTitleDesktop]}>Ready to Know Your Body?</Text>
          <Text style={s.ctaSub}>Join AyurNutri and start your personalized wellness journey today.</Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => router.push("/signup")} activeOpacity={0.85}>
            <Text style={s.ctaBtnText}>Create Free Account</Text>
            <Ionicons name="arrow-forward" size={16} color="#1B4332" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={[s.footer, isDesktop && s.footerDesktop]}>
          <View style={s.footerBrand}>
            <Image source={require("../assets/images/logo.png")} style={s.footerLogo} resizeMode="contain" />
            <Text style={s.footerBrandText}>AyurNutri</Text>
          </View>
          <Text style={s.footerCopy}>© 2026 AyurNutri. All rights reserved.</Text>
          {isDesktop && (
            <View style={s.footerLinks}>
              {["Privacy", "Terms", "Contact"].map((l) => (
                <Text key={l} style={s.footerLink}>{l}</Text>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050E07", overflow: "hidden" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050E07" },
  scroll: { paddingBottom: 0, backgroundColor: "#050E07", overflow: "hidden" },

  glow: { position: "absolute", height: 400, opacity: 0.12, borderRadius: 999, filter: "blur(100px)" as any },

  nav: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, zIndex: 100 },
  navDesktop: { paddingHorizontal: 0, paddingTop: 20, position: "sticky" as any, top: 0 },
  navGlass: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,14,7,0.8)", backdropFilter: "blur(20px)" as any, borderBottomWidth: 1, borderBottomColor: BORDER },
  navInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", maxWidth: 1200, alignSelf: "center", width: "100%", paddingHorizontal: 40, paddingVertical: 14 },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  navLogo: { width: 36, height: 36 },
  navBrandText: { fontSize: 22, fontWeight: "800", color: CREAM, letterSpacing: 0.5 },
  navLinks: { flexDirection: "row", gap: 36 },
  navLink: { color: MUTED, fontSize: 15, fontWeight: "600", cursor: "pointer" as any },
  navActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  navGhostBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  navGhostText: { color: CREAM, fontSize: 14, fontWeight: "600" },
  navCta: { backgroundColor: GOLD, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 20 },
  navCtaText: { color: GREEN, fontSize: 14, fontWeight: "800" },

  hero: { flexDirection: "column", paddingHorizontal: 24, paddingTop: 48, paddingBottom: 64, width: "100%", maxWidth: 1200, alignSelf: "center" },
  heroDesktop: { flexDirection: "row", alignItems: "center", paddingTop: 100, paddingBottom: 80, paddingHorizontal: 40, gap: 60 },
  heroWide: { paddingTop: 120 },
  heroText: { alignItems: "center" },
  heroTextDesktop: { flex: 1, alignItems: "flex-start" },

  badge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(212,162,78,0.12)", borderWidth: 1, borderColor: "rgba(212,162,78,0.3)", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, marginBottom: 28, alignSelf: "flex-start" },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },
  badgeLabel: { color: GOLD, fontSize: 13, fontWeight: "700" },

  heroTitle: { fontSize: 42, fontWeight: "900", color: CREAM, lineHeight: 52, textAlign: "center", letterSpacing: -1 },
  heroTitleDesktop: { fontSize: 68, lineHeight: 78, textAlign: "left" },
  heroTitleAccent: { color: GOLD },
  heroSub: { fontSize: 16, color: MUTED, marginTop: 20, lineHeight: 27, textAlign: "center", maxWidth: 520 },
  heroSubDesktop: { fontSize: 17, lineHeight: 28, textAlign: "left", marginTop: 24 },

  heroBtns: { flexDirection: "row", gap: 14, marginTop: 36, flexWrap: "wrap", justifyContent: "center" },
  heroBtnsMobile: { justifyContent: "center" },
  primaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: GOLD, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 32, shadowColor: GOLD, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 10 },
  primaryBtnText: { color: GREEN, fontSize: 16, fontWeight: "800" },
  ghostBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 28, borderRadius: 32, borderWidth: 1, borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.04)" },
  ghostBtnText: { color: CREAM, fontSize: 16, fontWeight: "600" },

  trustRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 24, flexWrap: "wrap" },
  trustText: { color: MUTED, fontSize: 12, fontWeight: "500" },
  trustSep: { color: "rgba(255,255,255,0.2)", fontSize: 12, marginHorizontal: 4 },

  heroVisual: { alignItems: "center", justifyContent: "center", marginTop: 64 },
  heroVisualDesktop: { flex: 1, marginTop: 0 },
  heroImgWrap: { position: "relative", width: 320, height: 320, alignItems: "center", justifyContent: "center" },
  heroImgDesktop: { width: 380, height: 380 },
  heroGlowRing: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(212,162,78,0.12)", filter: "blur(40px)" as any },
  heroImg: { width: "100%", height: "100%" },

  floatCard: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(10,26,18,0.9)", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER },
  floatCardText: { color: CREAM, fontSize: 13, fontWeight: "700" },
  floatCardTopLeft: { top: 10, left: -50 },
  floatCardTopRight: { top: 10, right: -50 },
  floatCardBottomRight: { bottom: 30, right: -40 },


  section: { width: "100%", maxWidth: 1200, alignSelf: "center", paddingHorizontal: 24, paddingVertical: 60 },
  sectionHead: { alignItems: "center", marginBottom: 56 },
  sectionEyebrow: { color: GOLD, fontSize: 12, fontWeight: "800", letterSpacing: 2, marginBottom: 12 },
  sectionTitle: { fontSize: 30, fontWeight: "900", color: CREAM, textAlign: "center", lineHeight: 40, letterSpacing: -0.5 },
  sectionTitleDesktop: { fontSize: 42, lineHeight: 52 },
  sectionSub: { fontSize: 16, color: MUTED, marginTop: 16, textAlign: "center", maxWidth: 600, lineHeight: 26 },

  featuresGrid: { flexDirection: "column", gap: 16 },
  featuresGridDesktop: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 20 },
  featureCardMobile: { width: "100%" },
  featureCardDesktop: { width: "31%" },
  featureCard: { backgroundColor: "rgba(255,255,255,0.025)", borderWidth: 1, borderColor: BORDER, borderRadius: 24, padding: 28 },
  featureIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  featureTitle: { fontSize: 18, fontWeight: "700", color: CREAM, marginBottom: 10 },
  featureDesc: { fontSize: 14, color: MUTED, lineHeight: 22 },

  ctaBanner: { margin: 24, borderRadius: 28, padding: 48, alignItems: "center", overflow: "hidden", borderWidth: 1, borderColor: "rgba(212,162,78,0.2)" },
  ctaBannerDesktop: { marginHorizontal: 40, padding: 72 },
  ctaTitle: { fontSize: 28, fontWeight: "900", color: CREAM, textAlign: "center", marginBottom: 12, letterSpacing: -0.5 },
  ctaTitleDesktop: { fontSize: 44 },
  ctaSub: { fontSize: 16, color: MUTED, textAlign: "center", marginBottom: 36, maxWidth: 480, lineHeight: 26 },
  ctaBtn: { flexDirection: "row", alignItems: "center", backgroundColor: GOLD, paddingVertical: 16, paddingHorizontal: 36, borderRadius: 32, shadowColor: GOLD, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  ctaBtnText: { color: GREEN, fontSize: 16, fontWeight: "800" },

  footer: { paddingVertical: 36, paddingHorizontal: 24, paddingBottom: 60, borderTopWidth: 1, borderTopColor: BORDER, alignItems: "center", gap: 12, backgroundColor: "#050E07" },
  footerDesktop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", maxWidth: 1200, alignSelf: "center", width: "100%", paddingHorizontal: 40 },
  footerBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerLogo: { width: 24, height: 24 },
  footerBrandText: { fontSize: 16, fontWeight: "800", color: CREAM },
  footerCopy: { color: "rgba(253,248,240,0.35)", fontSize: 13 },
  footerLinks: { flexDirection: "row", gap: 24 },
  footerLink: { color: MUTED, fontSize: 13, fontWeight: "600" },
});


