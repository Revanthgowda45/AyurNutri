import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as firestore from "@/services/firestoreService";

/* ─── TABS CONFIG ─── */
const TABS = [
    { key: "home",      label: "Home",       icon: "home-outline",       iconFocused: "home",       category: "main",    emoji: "🏠" },
    { key: "meal-plan", label: "Meal Plan",  icon: "restaurant-outline", iconFocused: "restaurant", category: "main",    emoji: "🥗" },
    { key: "scanner",   label: "Scanner",    icon: "scan-outline",       iconFocused: "scan",       category: "tools",   emoji: "📷" },
    { key: "dietitian", label: "Dietitian",  icon: "medkit-outline",     iconFocused: "medkit",     category: "tools",   emoji: "🏥" },
    { key: "profile",   label: "Profile",    icon: "person-outline",     iconFocused: "person",     category: "account", emoji: "👤" },
];

/* ─── Animated Mobile Tab Button ─── */
function TabButton({ iconName, iconNameFocused, focused, color, onPress, onLongPress, colors }: any) {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: focused ? 1.1 : 0.92,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
        }).start();
    }, [focused]);

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            style={st.tabBtn}
        >
            <Animated.View style={[st.tabInner, { transform: [{ scale }] }]}>
                {focused && (
                    <View style={[
                        st.activeGlow,
                        {
                            backgroundColor: `${colors.tabBarActive}18`,
                            borderWidth: 1,
                            borderColor: `${colors.tabBarActive}30`
                        }
                    ]} />
                )}
                <Ionicons
                    name={focused ? iconNameFocused : iconName}
                    size={24}
                    color={color}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

/* ─── Desktop Sidebar Item ─── */
function SidebarItem({ tab, isFocused, onPress, colors, isDark }: any) {
    const [isHovered, setIsHovered] = useState(false);
    const scale = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const bgOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: isHovered && !isFocused ? 1.01 : 1,
                friction: 8, tension: 120, useNativeDriver: true,
            }),
            Animated.spring(translateX, {
                toValue: isHovered && !isFocused ? 3 : 0,
                friction: 6, tension: 100, useNativeDriver: true,
            }),
            Animated.timing(bgOpacity, {
                toValue: isFocused ? 1 : isHovered ? 0.5 : 0,
                duration: 180, useNativeDriver: true,
            }),
        ]).start();
    }, [isHovered, isFocused]);

    return (
        <Pressable
            onPress={onPress}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            style={{ marginBottom: 2 }}
        >
            <Animated.View style={[
                st.sidebarItem,
                { transform: [{ scale }, { translateX }] }
            ]}>
                {/* Active/hover background */}
                <Animated.View
                    style={[
                        st.sidebarItemBg,
                        {
                            opacity: bgOpacity,
                            backgroundColor: isFocused
                                ? `${colors.tabBarActive}18`
                                : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                            borderColor: isFocused ? `${colors.tabBarActive}30` : "transparent",
                        }
                    ]}
                />

                {/* Active left bar */}
                {isFocused && (
                    <View style={[st.activeBar, { backgroundColor: colors.tabBarActive }]} />
                )}

                {/* Icon box */}
                <View style={[
                    st.sidebarIconBox,
                    {
                        backgroundColor: isFocused
                            ? `${colors.tabBarActive}20`
                            : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    }
                ]}>
                    <Ionicons
                        name={isFocused ? tab.iconFocused : tab.icon}
                        size={20}
                        color={isFocused ? colors.tabBarActive : colors.textSecondary}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={[
                        st.sidebarLabel,
                        {
                            color: isFocused ? colors.tabBarActive : colors.text,
                            fontWeight: isFocused ? "800" : "500",
                        }
                    ]}>
                        {tab.label}
                    </Text>
                </View>

                {isFocused && (
                    <View style={[st.activeDot, { backgroundColor: colors.tabBarActive }]} />
                )}
            </Animated.View>
        </Pressable>
    );
}

/* ─── Custom Tab Bar ─── */
function CustomTabBar({ state, descriptors, navigation, isDesktop }: any) {
    const { colors, isDark, toggleTheme, themeMode } = useTheme();
    const { user, signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const uid = user?.uid || "";
    const displayName = user?.displayName || "Guest";
    const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    useEffect(() => {
        if (!uid) return;
        const unsub = firestore.subscribeToProfile(uid, (d: any) => {
            if (d?.photoURL) setProfilePhoto(d.photoURL);
        });
        return unsub;
    }, [uid]);

    const photoURL = profilePhoto || user?.photoURL;

    const handleLogout = async () => {
        try {
            await signOut();
            router.replace("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    /* ──── DESKTOP SIDEBAR ──── */
    if (isDesktop) {
        const mainTabs = TABS.filter(t => t.category === "main");
        const toolsTabs = TABS.filter(t => t.category === "tools");

        return (
            <>
                <View style={[
                    st.desktopSidebar,
                    {
                        backgroundColor: isDark ? "#070D09" : "#FFFFFF",
                        borderRightColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
                    }
                ]}>
                    {/* Top gradient accent */}
                    <LinearGradient
                        colors={isDark ? ["rgba(16,185,129,0.08)", "transparent"] : ["rgba(27,67,50,0.04)", "transparent"]}
                        style={st.sidebarTopGlow}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        pointerEvents="none"
                    />

                    {/* ── Logo ── */}
                    <View style={st.logoWrap}>
                        <LinearGradient
                            colors={isDark ? ["#1B4332", "#0A1A10"] : ["#2D6A4F", "#1B4332"]}
                            style={st.logoIconBox}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Image
                                source={require('@/assets/images/logo.png')}
                                style={{ width: 24, height: 24 }}
                                resizeMode="contain"
                            />
                        </LinearGradient>
                        <View>
                            <Text style={[st.logoText, { color: colors.text }]}>AyurNutri</Text>
                            <Text style={[st.logoTagline, { color: colors.textMuted }]}>Ayurvedic AI</Text>
                        </View>
                    </View>

                    <View style={[st.logoDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]} />

                    {/* ── Nav ── */}
                    <View style={st.navScroll}>
                        {state.routes.map((route: any, index: number) => {
                            const tab = TABS[index];
                            if (!tab) return null;
                            const isFocused = state.index === index;
                            const onPress = () => {
                                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                            };
                            return (
                                <SidebarItem
                                    key={tab.key}
                                    tab={tab}
                                    isFocused={isFocused}
                                    onPress={onPress}
                                    colors={colors}
                                    isDark={isDark}
                                />
                            );
                        })}
                    </View>

                    {/* ── Bottom: User Card + Actions ── */}
                    <View style={[st.sidebarDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]} />
                    <View style={st.sidebarBottom}>
                        {/* User card → navigates to Profile */}
                        <TouchableOpacity
                            style={[st.userCard, {
                                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                            }]}
                            activeOpacity={0.75}
                            onPress={() => navigation.navigate("profile")}
                        >
                            <View style={[st.userAvatarSmall, { borderColor: colors.tabBarActive }]}>
                                {photoURL ? (
                                    <Image source={{ uri: photoURL }} style={st.userAvatarImg} />
                                ) : (
                                    <LinearGradient colors={["#2D6A4F", "#1B4332"]} style={[st.userAvatarImg, { alignItems: "center", justifyContent: "center" }]}>
                                        <Text style={st.userAvatarInitials}>{initials}</Text>
                                    </LinearGradient>
                                )}
                                <View style={[st.onlineBadge, { backgroundColor: "#10B981", borderColor: isDark ? "#070D09" : "#FFFFFF" }]} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[st.userName, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
                                <Text style={[st.userEmail, { color: colors.textMuted }]} numberOfLines={1}>{user?.email || ""}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </TouchableOpacity>

                        {/* Theme + Logout row */}
                        <View style={st.actionRow}>
                            <TouchableOpacity
                                style={[st.iconActionBtn, {
                                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
                                }]}
                                activeOpacity={0.7}
                                onPress={toggleTheme}
                            >
                                <Ionicons
                                    name={themeMode === 'system' ? (Platform.OS === 'web' || isDesktop ? "desktop-outline" : "phone-portrait-outline") : (themeMode === 'dark' ? "moon" : "sunny")}
                                    size={18}
                                    color={themeMode === 'system' ? colors.textMuted : (themeMode === 'dark' ? "#F0C040" : "#1B4332")}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[st.iconActionBtn, {
                                    backgroundColor: "rgba(239,68,68,0.06)",
                                    borderColor: "rgba(239,68,68,0.15)",
                                    flex: 1,
                                    marginLeft: 8,
                                    gap: 8,
                                }]}
                                activeOpacity={0.7}
                                onPress={handleLogout}
                            >
                                <Ionicons name="log-out-outline" size={18} color={colors.errorText || "#EF4444"} />
                                <Text style={[st.logoutText, { color: colors.errorText || "#EF4444" }]}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Floating AI Button */}
                <TouchableOpacity
                    style={[st.fab, { backgroundColor: colors.gold, bottom: 30, right: 30, shadowColor: colors.gold }]}
                    activeOpacity={0.8}
                    onPress={() => router.push("/chat")}
                >
                    <Ionicons name="sparkles" size={24} color={colors.green} />
                </TouchableOpacity>
            </>
        );
    }

    /* ──── MOBILE TAB BAR ──── */
    const bottomOffset = Math.max(insets.bottom, 10);

    return (
        <>
            <View style={[st.barOuter, { bottom: bottomOffset }]}>
                <View
                    style={[
                        st.barContainer,
                        {
                            backgroundColor: isDark ? colors.tabBarBg : "#FFFFFF",
                            shadowColor: isDark ? "#000" : "#1B4332",
                            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                        },
                    ]}
                >
                    {state.routes.map((route: any, index: number) => {
                        const tab = TABS[index];
                        if (!tab) return null;
                        const isFocused = state.index === index;
                        const onPress = () => {
                            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                        };
                        return (
                            <TabButton
                                key={tab.key}
                                iconName={tab.icon}
                                iconNameFocused={tab.iconFocused}
                                focused={isFocused}
                                color={isFocused ? colors.tabBarActive : colors.tabBarInactive}
                                onPress={onPress}
                                colors={colors}
                                isDark={isDark}
                            />
                        );
                    })}
                </View>
            </View>

            <TouchableOpacity
                style={[st.fab, { backgroundColor: colors.gold, bottom: bottomOffset + 76, shadowColor: colors.gold }]}
                activeOpacity={0.8}
                onPress={() => router.push("/chat")}
            >
                <Ionicons name="sparkles" size={24} color={colors.green} />
            </TouchableOpacity>
        </>
    );
}

/* ──── Tab Layout ──── */
export default function TabLayout() {
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} isDesktop={isDesktop} />}
            screenOptions={{
                headerShown: false,
                sceneStyle: { backgroundColor: "transparent" }
            }}
        >
            <Tabs.Screen name="home" />
            <Tabs.Screen name="meal-plan" />
            <Tabs.Screen name="scanner" />
            <Tabs.Screen name="dietitian" />
            <Tabs.Screen name="profile" />
        </Tabs>
    );
}

/* ──── Styles ──── */
const st = StyleSheet.create({
    /* ── Mobile ── */
    barOuter: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: 16,
    },
    barContainer: {
        flexDirection: "row",
        borderRadius: 28,
        paddingVertical: 8,
        paddingHorizontal: 6,
        width: "100%",
        maxWidth: 380,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 20,
    },
    tabBtn: { flex: 1, alignItems: "center", justifyContent: "center" },
    tabInner: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
        position: "relative",
    },
    activeGlow: {
        position: "absolute",
        top: -2, left: -6, right: -6, bottom: -2,
        borderRadius: 18,
    },

    /* ── Shared FAB ── */
    fab: {
        position: "absolute",
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
    },

    /* ── Desktop Sidebar ── */
    desktopSidebar: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: 260,
        borderRightWidth: 1,
        zIndex: 100,
        flexDirection: "column",
        paddingTop: 0,
    },
    sidebarTopGlow: {
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: 200,
        zIndex: 0,
    },

    /* Logo */
    logoWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 20,
        zIndex: 1,
    },
    logoIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    logoText: {
        fontSize: 20,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    logoTagline: {
        fontSize: 10,
        fontWeight: "600",
        letterSpacing: 0.5,
        marginTop: 1,
    },
    logoDivider: {
        height: 1,
        marginHorizontal: 20,
        marginBottom: 12,
    },

    /* Nav */
    navScroll: {
        flex: 1,
        paddingHorizontal: 12,
        zIndex: 1,
        paddingBottom: 8,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 1.5,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 6,
        textTransform: "uppercase",
    },
    sectionDivider: {
        height: 1,
        marginVertical: 8,
        marginHorizontal: 4,
    },

    /* Sidebar item */
    sidebarItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        position: "relative",
        gap: 12,
        overflow: "hidden",
    },
    sidebarItemBg: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 12,
        borderWidth: 1,
    },
    activeBar: {
        position: "absolute",
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        borderRadius: 2,
    },
    sidebarIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    sidebarLabel: {
        fontSize: 14,
        letterSpacing: -0.1,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    sidebarDivider: {
        height: 1,
        marginHorizontal: 0,
        marginBottom: 0,
    },

    /* Bottom user area */
    sidebarBottom: {
        paddingHorizontal: 12,
        paddingBottom: 20,
        paddingTop: 12,
        zIndex: 1,
        gap: 8,
    },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    userAvatarSmall: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2,
        overflow: "hidden",
        position: "relative",
    },
    userAvatarImg: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    userAvatarInitials: {
        fontSize: 14,
        fontWeight: "800",
        color: "#FDF8F0",
    },
    onlineBadge: {
        position: "absolute",
        bottom: 1,
        right: 1,
        width: 9,
        height: 9,
        borderRadius: 5,
        borderWidth: 1.5,
    },
    userName: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: -0.2,
    },
    userEmail: {
        fontSize: 11,
        marginTop: 1,
    },

    actionRow: {
        flexDirection: "row",
        gap: 8,
    },
    iconActionBtn: {
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        flexDirection: "row",
    },
    logoutText: {
        fontSize: 13,
        fontWeight: "700",
    },
});
