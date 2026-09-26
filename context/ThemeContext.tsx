import React, { ReactNode, createContext, useContext, useState } from "react";

/* ───────── Color Palettes ───────── */
export const LightColors = {
    // Core brand
    green: "#1B4332",
    gold: "#D4A24E",
    cream: "#FDF8F0",

    // Backgrounds
    background: "#F5F0E8",
    surface: "#F5F0E8",
    card: "#FFFFFF",
    headerBg: "#1B4332",

    // Text
    text: "#1B4332",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    textOnHeader: "#FDF8F0",
    textOnHeaderSub: "rgba(253,248,240,0.45)",
    textOnHeaderMuted: "rgba(253,248,240,0.35)",

    // Input
    inputBg: "#F5F0E8",
    inputText: "#1F2937",
    inputBorder: "rgba(0,0,0,0.04)",
    inputPlaceholder: "#B8B0A4",

    // Cards & borders
    cardBorder: "rgba(0,0,0,0.08)",
    divider: "rgba(0,0,0,0.04)",
    dividerText: "#B8B0A4",

    // Buttons
    primaryBtn: "#1B4332",
    primaryBtnText: "#D4A24E",
    googleBtn: "#111827",
    googleBtnText: "#FFFFFF",

    // Status bar
    statusBarStyle: "light-content" as const,
    statusBarBg: "#1B4332",

    // Tab bar
    tabBarBg: "#FFFFFF",
    tabBarActive: "#D4A24E",
    tabBarInactive: "#B8B0A4",

    // Navigation bar (Android)
    navBarBg: "transparent",
    navBarStyle: "light-content" as BarStyle,

    // Accent surfaces
    tipBg: "#FFFBEB",
    tipBorder: "#FEF3C7",
    tipText: "#92400E",
    tipLabel: "#B45309",

    successBg: "#ECFDF5",
    successBorder: "#A7F3D0",
    successText: "#059669",

    errorBg: "#FEF2F2",
    errorBorder: "#FECACA",
    errorText: "#DC2626",

    // Misc
    shadow: "#000",
    overlay: "rgba(0,0,0,0.06)",
    headerOverlay: "rgba(255,255,255,0.08)",
    headerBorder: "rgba(255,255,255,0.05)",
    avatarBg: "rgba(255,255,255,0.12)",
    avatarBorder: "rgba(212,162,78,0.30)",
    iconBoxBg: "#F5F0E8",
    arrowBg: "#F5F0E8",
    switchTrackOff: "#E5E7EB",
    switchTrackOn: "#86EFAC",

    // Action card icons (light mode - pastel backgrounds)
    actionDoshaBg: "#ECFDF5",
    actionDoshaBorder: "#D1FAE5",
    actionDietBg: "#FFFBEB",
    actionDietBorder: "#FEF3C7",
    actionRecipeBg: "#FFF7ED",
    actionRecipeBorder: "#FFEDD5",
    actionScanBg: "#EFF6FF",
    actionScanBorder: "#DBEAFE",

    // Dosha result
    optionBg: "#FFFFFF",
    optionSelectedBg: "#FEFCE8",
    optionSelectedBorder: "#D4A24E",
    optionLetterBg: "#F5F0E8",
    optionText: "#4B5563",
    barTrackBg: "#F5F0E8",

    // Step/feature cards
    stepDoneBg: "#F0FDF4",
    stepDoneBorder: "#D1FAE5",

    doshaNoteText: "#065F46",
    featureItemText: "#4B5563",

    // Meal plan
    calCardBg: "#FFFFFF",
    calDividerColor: "#F3F4F6",
    mealCheckedBg: "#F0FDF4",
    mealCheckedBorder: "#D1FAE5",

    // Goals
    goalSelectedBg: "#FEFCE8",
    goalSelectedBorder: "#D4A24E",

    // Recipe detail
    ingBorder: "#F3F4F6",
    doshaNoteBg: "#ECFDF5",
    doshaNoteBorder: "#D1FAE5",

    mealTagBg: "#ECFDF5",
    mealTagText: "#059669",
};

export const DarkColors: typeof LightColors = {
    // Core brand
    green: "#34D399", // Brighter, glowing emerald for accents
    gold: "#F0C040",  // Warm premium gold (less neon)
    cream: "#F1F5F9",

    // Backgrounds — Deep, OLED-friendly green-tinted black
    background: "#070D09",
    surface: "#0F1A12",     // Elevated card
    card: "#14201A",        // Slightly higher elevation
    headerBg: "#0A1310",    // Like background but distinct

    // Text — High contrast for readability
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    textOnHeader: "#F8FAFC",
    textOnHeaderSub: "rgba(248,250,252,0.6)",
    textOnHeaderMuted: "rgba(248,250,252,0.4)",

    // Input
    inputBg: "#111A14",
    inputText: "#F8FAFC",
    inputBorder: "rgba(255,255,255,0.08)",
    inputPlaceholder: "#475569",

    // Cards & borders — Subtle visible borders for depth
    cardBorder: "rgba(255,255,255,0.08)",
    divider: "rgba(255,255,255,0.06)",
    dividerText: "#475569",

    // Buttons
    primaryBtn: "#10B981",    // Strong, vibrant green
    primaryBtnText: "#022C22",// Very dark text for contrast on bright button
    googleBtn: "#1E293B",
    googleBtnText: "#F8FAFC",

    // Status bar
    statusBarStyle: "light-content" as const,
    statusBarBg: "#090E0B",

    // Tab bar — Elevated look, OLED friendly
    tabBarBg: "#0A1310",
    tabBarActive: "#F0C040",
    tabBarInactive: "rgba(255,255,255,0.45)",

    // Navigation bar (Android)
    navBarBg: "transparent",
    navBarStyle: "light-content" as BarStyle,

    // Accent surfaces (Translucent approach)
    tipBg: "rgba(240, 192, 64, 0.08)",   // Warm gold tint
    tipBorder: "rgba(240, 192, 64, 0.18)",
    tipText: "#F0C040",
    tipLabel: "#F5D27A",

    successBg: "rgba(16, 185, 129, 0.08)", // Emerald tint
    successBorder: "rgba(16, 185, 129, 0.15)",
    successText: "#34D399",

    errorBg: "rgba(239, 68, 68, 0.08)",    // Red tint
    errorBorder: "rgba(239, 68, 68, 0.15)",
    errorText: "#F87171",

    // Misc
    shadow: "#000",
    overlay: "rgba(0,0,0,0.65)",
    headerOverlay: "rgba(255,255,255,0.04)",
    headerBorder: "rgba(255,255,255,0.06)",
    avatarBg: "rgba(255,255,255,0.08)",
    avatarBorder: "rgba(240,192,64,0.35)",
    iconBoxBg: "#0F1A12",
    arrowBg: "#0F1A12",
    switchTrackOff: "#1E2D24",
    switchTrackOn: "#10B981",

    // Action card icons (Premium dark mode translucent)
    actionDoshaBg: "rgba(16, 185, 129, 0.08)",
    actionDoshaBorder: "rgba(16, 185, 129, 0.15)",
    actionDietBg: "rgba(245, 158, 11, 0.08)",
    actionDietBorder: "rgba(245, 158, 11, 0.15)",
    actionRecipeBg: "rgba(249, 115, 22, 0.08)",
    actionRecipeBorder: "rgba(249, 115, 22, 0.15)",
    actionScanBg: "rgba(59, 130, 246, 0.08)",
    actionScanBorder: "rgba(59, 130, 246, 0.15)",

    // Dosha result
    optionBg: "#16221A",
    optionSelectedBg: "rgba(253, 224, 71, 0.1)",
    optionSelectedBorder: "#FDE047",
    optionLetterBg: "#1E293B",
    optionText: "#CBD5E1",
    barTrackBg: "#111A14",

    // Step/feature cards
    stepDoneBg: "rgba(16, 185, 129, 0.08)",
    stepDoneBorder: "rgba(16, 185, 129, 0.15)",

    doshaNoteText: "#6EE7B7",
    featureItemText: "#CBD5E1",

    // Meal plan
    calCardBg: "#16221A",
    calDividerColor: "rgba(255,255,255,0.08)",
    mealCheckedBg: "rgba(16, 185, 129, 0.08)",
    mealCheckedBorder: "rgba(16, 185, 129, 0.15)",

    // Goals
    goalSelectedBg: "rgba(253, 224, 71, 0.1)",
    goalSelectedBorder: "#FDE047",

    // Recipe detail
    ingBorder: "rgba(255,255,255,0.08)",
    doshaNoteBg: "rgba(16, 185, 129, 0.08)",
    doshaNoteBorder: "rgba(16, 185, 129, 0.15)",

    mealTagBg: "rgba(16, 185, 129, 0.1)",
    mealTagText: "#6EE7B7",
};

/* ───────── Context ───────── */
export type ThemeColors = typeof LightColors;
export type ThemeMode = 'light' | 'dark' | 'system';
export type BarStyle = 'light-content' | 'dark-content';

interface ThemeContextType {
    colors: ThemeColors;
    isDark: boolean;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
    setDark: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* ───────── Provider ───────── */
import { useColorScheme } from "react-native";

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState<ThemeMode>('system');

    // If system, use system color scheme. Otherwise use strictly the elected mode.
    const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

    const colors = isDark ? DarkColors : LightColors;

    const toggleTheme = () => setThemeMode((prev) => {
        if (prev === 'system') return 'light';
        if (prev === 'light') return 'dark';
        return 'system';
    });
    const setDark = (value: boolean) => setThemeMode(value ? 'dark' : 'light');

    return (
        <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode, toggleTheme, setDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

/* ───────── Hook ───────── */
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
    return ctx;
}
