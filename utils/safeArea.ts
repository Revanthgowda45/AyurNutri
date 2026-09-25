import { Platform, StatusBar } from "react-native";

/**
 * Safe top padding that accounts for the Android status bar.
 * On Android, uses StatusBar.currentHeight + extra padding.
 * On iOS, uses a fixed value (safe area is handled differently).
 */
export const SAFE_TOP_PADDING =
  Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 16 : 58;
