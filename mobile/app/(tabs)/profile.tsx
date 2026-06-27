import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { registerForPushNotificationsAsync } from "@/lib/pushNotifications";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    if (user?.id) registerForPushNotificationsAsync(user.id);
  }, [user?.id]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    signOut();
    router.replace("/(auth)/login" as never);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.fullName ?? "Misafir"}</Text>
      <Text style={styles.loyalty}>Sadakat Puanı: {user?.loyaltyPoints ?? 0}</Text>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  name: { fontSize: 22, fontWeight: "700" },
  loyalty: { color: "#666", marginTop: 4, marginBottom: 24 },
  signOutButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  signOutText: { fontWeight: "500" },
});
