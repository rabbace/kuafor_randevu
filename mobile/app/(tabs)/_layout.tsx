import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#6D28D9" }}>
      <Tabs.Screen name="index" options={{ title: "Keşfet" }} />
      <Tabs.Screen name="appointments" options={{ title: "Randevularım" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
