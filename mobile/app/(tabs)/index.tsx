import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "@/lib/supabase";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";
import { ContactButtons } from "@/components/contact/ContactButtons";
import type { Barber } from "@/types/database";

type BarberWithMeta = Barber & {
  user: { full_name: string | null } | null;
  salon: { name: string } | null;
};

function initialsOf(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DiscoverScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [barbers, setBarbers] = useState<BarberWithMeta[]>([]);

  useEffect(() => {
    supabase
      .from("barbers")
      .select("*, user:users!barbers_user_id_fkey(full_name), salon:salons(name)")
      .not("latitude", "is", null)
      .then(({ data }) => setBarbers((data ?? []) as unknown as BarberWithMeta[]));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={barbers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 16 }}
        ListHeaderComponent={
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Yakınındaki berberleri keşfedin ve doğrudan iletişime geçin.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }, cardShadow]}
            onPress={() => router.push(`/booking/${item.id}` as never)}
          >
            <View style={styles.headerRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "1A" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {initialsOf(item.user?.full_name)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{item.user?.full_name ?? "Berber"}</Text>
                <Text style={[styles.salon, { color: colors.textMuted }]}>{item.salon?.name}</Text>
              </View>
            </View>

            {item.address && (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                <Text style={[styles.address, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            )}

            {item.latitude && item.longitude && (
              <MapView
                style={styles.map}
                scrollEnabled={false}
                zoomEnabled={false}
                pointerEvents="none"
                initialRegion={{
                  latitude: item.latitude,
                  longitude: item.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
              >
                <Marker coordinate={{ latitude: item.latitude, longitude: item.longitude }} />
              </MapView>
            )}

            <ContactButtons phone={item.whatsapp_phone} />

            <View style={styles.bookRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.primary} />
              <Text style={[styles.bookText, { color: colors.primary }]}>Randevu almak için dokun</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.primary} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cut-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz berber yok</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Konum bilgisi paylaşan berberler burada görünecek.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  subtitle: { fontSize: 14, marginBottom: 4, paddingHorizontal: 4 },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "700", fontSize: 16 },
  name: { fontSize: 17, fontWeight: "700" },
  salon: { fontSize: 13, marginTop: 2 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  address: { fontSize: 13, flex: 1 },
  map: { width: "100%", height: 140, borderRadius: 14, marginTop: 2 },
  bookRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 2 },
  bookText: { fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center" },
});
