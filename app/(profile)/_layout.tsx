import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "slide_from_bottom" }}
    >
      <Stack.Screen name="edit" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="dosha-assessment" />
      <Stack.Screen name="recipe-generator" />
      <Stack.Screen name="recipe-detail" />
      <Stack.Screen name="meal-detail" />
      <Stack.Screen name="chat-bot" />
      <Stack.Screen name="dinacharya" />
      <Stack.Screen name="hydration" />
      <Stack.Screen name="agni-monitor" />
      <Stack.Screen name="vikruti-assessment" />
    </Stack>
  );
}

