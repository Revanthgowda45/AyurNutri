import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
    Text,
    Image,
    useWindowDimensions,
    Pressable
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ──── Animated Tab Button ──── */
function TabButton({ label, iconName, iconNameFocused, focused, color, onPress, onLongPress, colors, isDark, isDesktop }: any) {
    const scale = useRef(new Animated.Value(1)).current;
    const dotWidth = useRef(new Animated.Value(focused ? 5 : 0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: focused ? 1 : 0.92,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }),
            Animated.spring(dotWidth, {
                toValue: focused ? 5 : 0,
                friction: 6,
                tension: 80,
                useNativeDriver: false,
            }),
        ]).start();
    }, [focused]);

    const [isHovered, setIsHovered] = useState(false);
    const hoverScale = useRef(new Animated.Value(1)).current;
    const hoverX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(hoverScale, {
                toValue: isHovered && !focused ? 1.02 : 1,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.spring(hoverX, {
                toValue: isHovered && !focused ? 4 : 0,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isHovered, focused]);

    if (isDesktop) {
        return (
            <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                onHoverIn={() => setIsHovered(true)}
                onHoverOut={() => setIsHovered(false)}
            >
                <Animated.View
                    style={[
                        st.desktopTabBtn,
                        focused && { backgroundColor: `${colors.tabBarActive}15` },
                        !focused && isHovered && { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" },
                        { transform: [{ scale: hoverScale }, { translateX: hoverX }] }
                    ]}
                >
                    <Ionicons
                        name={focused ? iconNameFocused : iconName}
                        size={22}
                        color={color}
                        style={{ marginRight: 16 }}
                    />
                    <Text style={[st.desktopTabLabel, { color }, focused && { fontWeight: "700" }]}>
                        {label}
                    </Text>
                </Animated.View>
            </Pressable>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            style={st.tabBtn}
        >
            <Animated.View style={[st.tabInner, { transform: [{ scale }] }]}>
                {/* Glow behind active icon */}
                {focused && (
                    <View style={[
                        st.activeGlow,
                        {
                            backgroundColor: `${colors.tabBarActive}15`,
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

    /* ──── Custom Tab Bar ──── */
function CustomTabBar({ state, descriptors, navigation, isDesktop }: any) {
    const { colors, isDark, toggleTheme } = useTheme();
    const { signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const tabs = [
        { key: "home", label: "Home", icon: "home-outline", iconFocused: "home" },
        { key: "meal-plan", label: "Meal Plan", icon: "restaurant-outline", iconFocused: "restaurant" },
        { key: "scanner", label: "Scanner", icon: "scan-outline", iconFocused: "scan" },
        { key: "dietitian", label: "Dietitian", icon: "medkit-outline", iconFocused: "medkit" },
        { key: "profile", label: "Profile", icon: "person-outline", iconFocused: "person" },
    ];

    const handleLogout = async () => {
        try {
            await signOut();
            router.replace("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    if (isDesktop) {
        return (
            <>
                <View style={[
                    st.desktopSidebar, 
                    { 
                        backgroundColor: isDark ? colors.background : "#FFFFFF",
                        borderRightColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
                    }
                ]}>
                    <View style={st.desktopLogoContainer}>
                        <Image source={require('@/assets/images/logo.png')} style={{ width: 32, height: 32, marginRight: 12, borderRadius: 8 }} />
                        <Text style={[st.desktopLogoText, { color: colors.text }]}>AyurNutri</Text>
                    </View>
                    
                    <View style={st.desktopMenu}>
                        {state.routes.map((route: any, index: number) => {
                            const tab = tabs[index];
                            if (!tab) return null;

                            const isFocused = state.index === index;
                            const onPress = () => {
                                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                            };

                            return (
                                <TabButton
                                    key={tab.key}
                                    label={tab.label}
                                    iconName={tab.icon}
                                    iconNameFocused={tab.iconFocused}
                                    focused={isFocused}
                                    color={isFocused ? colors.tabBarActive : colors.text}
                                    onPress={onPress}
                                    colors={colors}
                                    isDark={isDark}
                                    isDesktop={true}
                                />
                            );
                        })}
                    </View>

                    <View style={st.desktopBottomActions}>
                        {/* Theme Toggle */}
                        <TouchableOpacity
                            style={[st.desktopActionBtn, { marginBottom: 4 }]}
                            activeOpacity={0.7}
                            onPress={toggleTheme}
                        >
                            <Ionicons 
                                name={isDark ? "sunny-outline" : "moon-outline"} 
                                size={22} 
                                color={colors.text} 
                                style={{ marginRight: 16 }}
                            />
                            <Text style={[st.desktopActionText, { color: colors.text }]}>
                                {isDark ? "Light Mode" : "Dark Mode"}
                            </Text>
                        </TouchableOpacity>

                        {/* Desktop Logout Button */}
                        <TouchableOpacity
                            style={st.desktopActionBtn}
                            activeOpacity={0.7}
                            onPress={handleLogout}
                        >
                            <Ionicons name="log-out-outline" size={22} color={colors.errorText || "#FF3B30"} style={{ marginRight: 16 }} />
                            <Text style={[st.desktopActionText, { color: colors.errorText || "#FF3B30" }]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Floating Desktop AI Assistant Button */}
                <TouchableOpacity
                    style={[st.fab, { backgroundColor: colors.gold, bottom: 30, right: 30 }]}
                    activeOpacity={0.8}
                    onPress={() => router.push("/chat")}
                >
                    <Ionicons name="sparkles" size={24} color={colors.green} />
                </TouchableOpacity>
            </>
        );
    }

    const bottomOffset = Math.max(insets.bottom, 10);

    return (
        <>
            <View style={[st.barOuter, { bottom: bottomOffset, paddingBottom: 0 }]}>
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
                        const tab = tabs[index];
                        if (!tab) return null;
                        const isFocused = state.index === index;
                        const onPress = () => {
                            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                        };
                        return (
                            <TabButton
                                key={tab.key}
                                label={tab.label}
                                iconName={tab.icon}
                                iconNameFocused={tab.iconFocused}
                                focused={isFocused}
                                color={isFocused ? colors.tabBarActive : colors.tabBarInactive}
                                onPress={onPress}
                                colors={colors}
                                isDark={isDark}
                                isDesktop={false}
                            />
                        );
                    })}
                </View>
            </View>
            
            <TouchableOpacity
                style={[st.fab, { backgroundColor: colors.gold, bottom: bottomOffset + 76 }]}
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
    const isDesktop = width > 768; // standard desktop breakpoint

    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} isDesktop={isDesktop} />}
            screenOptions={{ 
                headerShown: false,
                sceneStyle: { backgroundColor: 'transparent' }
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
    /* Mobile Styles */
    barOuter: {
        position: "absolute",
        bottom: 10,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 4,
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
    tabInner: { alignItems: "center", justifyContent: "center", paddingVertical: 6, paddingHorizontal: 8, position: "relative" },
    activeGlow: { position: "absolute", top: -2, left: -6, right: -6, bottom: -2, borderRadius: 18 },
    fab: {
        position: "absolute",
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    
    /* Desktop Styles */
    desktopSidebar: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: 260,
        borderRightWidth: 1,
        paddingTop: 40,
        paddingHorizontal: 20,
        zIndex: 100,
    },
    desktopLogoContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    desktopLogoText: {
        fontSize: 28,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    desktopMenu: {
        flex: 1,
        gap: 8,
    },
    desktopTabBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    desktopTabLabel: {
        fontSize: 16,
        fontWeight: "500",
    },
    desktopBottomActions: {
        marginTop: "auto",
        paddingBottom: 20,
    },
    desktopActionBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        opacity: 0.8,
    },
    desktopActionText: {
        fontSize: 16,
        fontWeight: "600",
    }
});
