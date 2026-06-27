import { Tabs } from "expo-router";
import { useThemeStore } from "@/store/useThemeStore";

export default function TabsLayout() {
  const colors = useThemeStore((s) => s.colors);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Keşfet" }} />
      <Tabs.Screen name="appointments" options={{ title: "Randevularım" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
