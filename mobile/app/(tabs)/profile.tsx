import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import MapView, { Marker, type LatLng } from "react-native-maps";
import { supabase } from "@/lib/supabase";
import { registerForPushNotificationsAsync } from "@/lib/pushNotifications";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import type { Barber } from "@/types/database";

const DEFAULT_REGION = { latitude: 41.0082, longitude: 28.9784 }; // İstanbul

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const colors = useThemeStore((s) => s.colors);
  const setMode = useThemeStore((s) => s.setMode);
  const mode = useThemeStore((s) => s.mode);

  const [barber, setBarber] = useState<Barber | null>(null);
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [position, setPosition] = useState<LatLng>(DEFAULT_REGION);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.id) registerForPushNotificationsAsync(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || user.role !== "barber") return;

    supabase
      .from("barbers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBarber(data as Barber);
        setAddress(data.address ?? "");
        setWhatsapp(data.whatsapp_phone ?? "");
        if (data.latitude && data.longitude) {
          setPosition({ latitude: data.latitude, longitude: data.longitude });
        }
      });
  }, [user?.id, user?.role]);

  async function handleSaveLocation() {
    if (!barber) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("barbers")
      .update({
        address: address.trim(),
        whatsapp_phone: whatsapp.trim(),
        latitude: position.latitude,
        longitude: position.longitude,
      })
      .eq("id", barber.id);
    setIsSaving(false);

    if (error) {
      Alert.alert("Kaydedilemedi", error.message);
      return;
    }
    Alert.alert("Kaydedildi", "Adres ve konum bilgin güncellendi.");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    signOut();
    router.replace("/(auth)/login" as never);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.name, { color: colors.text }]}>{user?.fullName ?? "Misafir"}</Text>
      <Text style={[styles.loyalty, { color: colors.textMuted }]}>Sadakat Puanı: {user?.loyaltyPoints ?? 0}</Text>

      <View style={styles.themeRow}>
        {(["light", "dark", "system"] as const).map((m) => (
          <Pressable
            key={m}
            style={[
              styles.themeOption,
              {
                backgroundColor: mode === m ? colors.primary : colors.surface,
                borderColor: mode === m ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setMode(m)}
          >
            <Text style={{ color: mode === m ? "#fff" : colors.text, fontWeight: "600" }}>
              {m === "light" ? "Açık" : m === "dark" ? "Karanlık" : "Sistem"}
            </Text>
          </Pressable>
        ))}
      </View>

      {user?.role === "barber" && barber && (
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Adres ve Konum</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            Haritada konumunu sürükleyerek ayarlayabilirsin. Müşteriler bu konumu görecek.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Adres"
            placeholderTextColor={colors.textMuted}
            value={address}
            onChangeText={setAddress}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="WhatsApp Numarası"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={whatsapp}
            onChangeText={setWhatsapp}
          />

          <MapView
            style={styles.map}
            initialRegion={{
              latitude: position.latitude,
              longitude: position.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={(e) => setPosition(e.nativeEvent.coordinate)}
          >
            <Marker
              coordinate={position}
              draggable
              onDragEnd={(e) => setPosition(e.nativeEvent.coordinate)}
            />
          </MapView>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveLocation}
            disabled={isSaving}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? "Kaydediliyor..." : "Konumu Kaydet"}</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={[styles.signOutButton, { borderColor: colors.border }]} onPress={handleSignOut}>
        <Text style={[styles.signOutText, { color: colors.text }]}>Çıkış Yap</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 16 },
  name: { fontSize: 22, fontWeight: "700" },
  loyalty: { marginTop: -8 },
  themeRow: { flexDirection: "row", gap: 8 },
  themeOption: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  section: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionHint: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  map: { width: "100%", height: 200, borderRadius: 12 },
  primaryButton: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  signOutButton: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  signOutText: { fontWeight: "500" },
});
