import { useAuth } from "@/context/AuthContext";
import { SAFE_TOP_PADDING } from "@/utils/safeArea";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage, Language } from "@/context/LanguageContext";
import * as firestore from "@/services/firestoreService";
import { openAppNotificationSettings } from "@/utils/notifications";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
    Modal,
    Platform,
    Pressable,
} from "react-native";


export default function PreferencesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { colors, isDark, setDark, setThemeMode } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const uid = user?.uid || "";

    const [notifications, setNotifications] = useState(true);
    const [dailyReminders, setDailyReminders] = useState(true);
    const [themeMode, setThemeModeLocal] = useState<'light' | 'dark' | 'system'>(isDark ? 'dark' : 'light');
    const [showLangModal, setShowLangModal] = useState(false);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Listen to saved preferences from Firestore
    useEffect(() => {
        if (!uid) return;
        const unsub = firestore.subscribeToPreferences(uid, (d) => {
            if (d) {
                setNotifications(d.notifications);
                setDailyReminders(d.dailyReminders);

                const mode = d.themeMode || (d.darkMode ? 'dark' : 'light');
                setThemeModeLocal(mode);
                if (d.language) {
                    const langMap: any = { English: 'en', Hindi: 'hi', Spanish: 'es', French: 'fr' };
                    // Local language state is managed by useLanguage() which is synced globally
                }
            }
        });

        return () => unsub();
    }, [uid]);

    const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setThemeModeLocal(mode);
        setThemeMode(mode); // Apply theme immediately
    };

    const handleToggleNotifs = async (val: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (val) {
            // Open device settings so user can enable notifications
            await openAppNotificationSettings();
            setNotifications(true);
        } else {
            setNotifications(false);
        }
    };

    const handleToggleReminders = (val: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDailyReminders(val);
    };

    const handleSave = async () => {
        if (!uid) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            const langNameMap: any = { en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French' };
            await firestore.savePreferences(uid, {
                notifications,
                dailyReminders,
                themeMode,
                darkMode: themeMode === 'dark', // Keep for backward compatibility
                language: langNameMap[language] || "English",
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSuccess(true);
            setTimeout(() => router.back(), 1500);
        } catch (e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error("Failed to save preferences:", e);
        } finally {
            setLoading(false);
        }
    };

    const SettingRow = ({ icon, title, description, value, onValueChange, last }: any) => (
        <View style={[st.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
            <View style={[st.iconBox, { backgroundColor: colors.iconBoxBg }]}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>
            <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[st.rowTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[st.rowDesc, { color: colors.textMuted }]}>{description}</Text>
            </View>
            <Switch
                trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
                thumbColor={value ? colors.green : "#FFFFFF"}
                ios_backgroundColor={colors.switchTrackOff}
                onValueChange={onValueChange}
                value={value}
            />
        </View>
    );

    const LangOption = ({ label, code }: { label: string, code: Language }) => (
        <TouchableOpacity 
            style={[st.langOption, { borderBottomColor: colors.divider }]}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLanguage(code);
                setShowLangModal(false);
            }}
        >
            <Text style={[st.rowTitle, { color: colors.text }]}>{label}</Text>
            {language === code && <Ionicons name="checkmark-circle" size={24} color={colors.green} />}
        </TouchableOpacity>
    );

    return (
        <View style={[st.screen, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            <View style={[st.header, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
                <TouchableOpacity 
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }} 
                    style={[st.backBtn, { backgroundColor: colors.card, shadowColor: colors.shadow, borderWidth: isDark ? 1 : 0, borderColor: colors.cardBorder }]}
                >
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[st.headerTitle, { color: colors.text }]}>{t('preferences')}</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
                {success && (
                    <View style={[st.successBox, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
                        <Text style={[st.successText, { color: colors.successText }]}>Preferences saved successfully!</Text>
                    </View>
                )}

                <Text style={[st.sectionLabel, { color: colors.text }]}>{t('notifications')}</Text>
                <View style={[st.card, { backgroundColor: colors.card, shadowColor: colors.shadow, borderWidth: isDark ? 1 : 0, borderColor: colors.cardBorder }]}>
                    <SettingRow 
                        icon="🔔" 
                        title={t('push_notifs')} 
                        description={t('notif_desc')} 
                        value={notifications} 
                        onValueChange={handleToggleNotifs} 
                    />
                    <SettingRow 
                        icon="⏰" 
                        title={t('daily_reminders')} 
                        description={t('reminder_desc')} 
                        value={dailyReminders} 
                        onValueChange={handleToggleReminders} 
                        last 
                    />
                </View>

                <Text style={[st.sectionLabel, { color: colors.text }]}>{t('appearance')}</Text>
                <View style={[st.card, { backgroundColor: colors.card, shadowColor: colors.shadow, borderWidth: isDark ? 1 : 0, borderColor: colors.cardBorder, paddingVertical: 14 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                        <View style={[st.iconBox, { backgroundColor: colors.iconBoxBg }]}>
                            <Text style={{ fontSize: 20 }}>🎨</Text>
                        </View>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={[st.rowTitle, { color: colors.text }]}>{t('theme_mode')}</Text>
                            <Text style={[st.rowDesc, { color: colors.textMuted }]}>Choose your app appearance</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                        {(['light', 'dark', 'system'] as const).map((mode) => {
                            const active = themeMode === mode;
                            return (
                                <TouchableOpacity
                                    key={mode}
                                    onPress={() => handleThemeChange(mode)}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 10,
                                        alignItems: "center",
                                        borderRadius: 12,
                                        backgroundColor: active ? colors.green : "transparent",
                                        borderWidth: 1,
                                        borderColor: active ? colors.green : colors.divider,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: active ? (isDark ? colors.gold : colors.cream) : colors.text,
                                            fontSize: 13,
                                            fontWeight: active ? "700" : "500",
                                            textTransform: "capitalize",
                                        }}
                                    >
                                        {mode}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <Text style={[st.sectionLabel, { color: colors.text }]}>{t('language')}</Text>
                <TouchableOpacity 
                    style={[st.languageCard, { backgroundColor: colors.card, shadowColor: colors.shadow, borderWidth: isDark ? 1 : 0, borderColor: colors.cardBorder }]} 
                    activeOpacity={0.7}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowLangModal(true);
                    }}
                >
                    <View style={[st.iconBox, { backgroundColor: colors.iconBoxBg }]}><Text style={{ fontSize: 20 }}>🌐</Text></View>
                    <View style={{ flex: 1 }}>
                        <Text style={[st.rowTitle, { color: colors.text }]}>{t('app_language')}</Text>
                        <Text style={[st.rowDesc, { color: colors.textMuted }]}>
                            {language === 'en' ? 'English (US)' : language === 'hi' ? 'Hindi (हिन्दी)' : language === 'es' ? 'Spanish (Español)' : 'French (Français)'}
                        </Text>
                    </View>
                    <Text style={[st.arrow, { color: colors.gold }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[st.primaryBtn, { backgroundColor: colors.primaryBtn, shadowColor: colors.primaryBtn }, loading && st.disabled]}
                    activeOpacity={0.8}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.gold} />
                    ) : (
                        <Text style={[st.primaryBtnText, { color: colors.primaryBtnText }]}>{t('save_prefs')}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={showLangModal} transparent animationType="slide">
                <Pressable style={st.modalOverlay} onPress={() => setShowLangModal(false)}>
                    <View style={[st.modalContent, { backgroundColor: colors.card }]}>
                        <View style={st.modalHeader}>
                            <Text style={[st.modalTitle, { color: colors.text }]}>Select Language</Text>
                            <TouchableOpacity onPress={() => setShowLangModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <LangOption label="English" code="en" />
                        <LangOption label="Hindi (हिन्दी)" code="hi" />
                        <LangOption label="Spanish (Español)" code="es" />
                        <LangOption label="French (Français)" code="fr" />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}


const st = StyleSheet.create({
    screen: { flex: 1 },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingTop: SAFE_TOP_PADDING, paddingBottom: 16, paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    backIcon: { fontSize: 20, fontWeight: "600" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },
    successBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20 },
    successText: { fontSize: 13, textAlign: "center", fontWeight: "600" },
    sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 10, marginLeft: 4 },
    card: { borderRadius: 20, marginBottom: 24, paddingHorizontal: 16, paddingVertical: 8, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
    iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
    rowTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
    rowDesc: { fontSize: 12 },
    languageCard: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 32, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    arrow: { fontSize: 22, fontWeight: "600", paddingHorizontal: 8 },
    primaryBtn: { borderRadius: 16, height: 56, justifyContent: "center", alignItems: "center", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    primaryBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: 1 },
    disabled: { opacity: 0.5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    langOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
});

