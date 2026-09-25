import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import * as firestore from "@/services/firestoreService";
import { Stack } from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { Platform } from "react-native";

// Force Android navigation bar to be opaque early before React mounts
if (Platform.OS === "android") {
  NavigationBar.setPositionAsync("relative");
}

function ThemeSync() {
  const { colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync(colors.navBarBg);
      NavigationBar.setButtonStyleAsync(
        colors.navBarStyle === "dark-content" ? "dark" : "light"
      );
    }
  }, [colors.navBarBg, colors.navBarStyle]);

  return null;
}

/**
 * Global component to sync preferences (Theme, Language) from Firestore
 * so they persist across the entire app session.
 */
function PreferenceSync() {
  const { user } = useAuth();
  const { setThemeMode, setDark } = useTheme();
  const { setLanguage } = useLanguage();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;

    const unsub = firestore.subscribeToPreferences(uid, (d) => {
      if (d) {
        // Sync Theme
        if (d.themeMode) {
          setThemeMode(d.themeMode);
        } else {
          setDark(!!d.darkMode);
        }

        // Sync Language
        if (d.language) {
          const langMap: any = { English: 'en', Hindi: 'hi', Spanish: 'es', French: 'fr' };
          if (langMap[d.language]) setLanguage(langMap[d.language]);
        }

        // Notifications are now handled via Linking.openSettings()
        // when the user enables them from the Home screen modal.
      }
    });

    return () => unsub();
  }, [uid]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <ThemeSync />
          <PreferenceSync />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(profile)" options={{ presentation: "modal" }} />
            <Stack.Screen 
              name="chat" 
              options={{ 
                presentation: Platform.OS === 'web' ? 'transparentModal' : (Platform.OS === 'ios' ? 'modal' : 'card'),
                animation: "slide_from_bottom" 
              }} 
            />
          </Stack>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}


