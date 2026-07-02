import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "@/lib/supabase";
import { useThemeStore } from "@/store/useThemeStore";
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
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase
      .from("barbers")
      .select("*, user:users!barbers_user_id_fkey(full_name), salon:salons(name)")
      .not("latitude", "is", null)
      .then(({ data }) => {
        setBarbers((data ?? []) as unknown as BarberWithMeta[]);
        setIsLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return barbers;
    return barbers.filter((b) => {
      const haystack = `${b.user?.full_name ?? ""} ${b.salon?.name ?? ""} ${b.address ?? ""}`.toLocaleLowerCase("tr-TR");
      return haystack.includes(q);
    });
  }, [barbers, query]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingTop: 16, gap: 16 }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Yakınındaki berberleri keşfet, saniyeler içinde randevunu al.
            </Text>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Berber, salon veya adres ara"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable hitSlop={8} onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.headerRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "1A" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {initialsOf(item.user?.full_name)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{item.user?.full_name ?? "Berber"}</Text>
                {item.salon?.name && (
                  <Text style={[styles.salon, { color: colors.textMuted }]}>{item.salon.name}</Text>
                )}
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

            <Pressable
              style={[styles.bookButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/booking/${item.id}` as never)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primaryText} />
              <Text style={[styles.bookText, { color: colors.primaryText }]}>Randevu Al</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "14" }]}>
              <Ionicons name={query ? "search-outline" : "cut-outline"} size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {query ? "Sonuç bulunamadı" : "Henüz berber yok"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {query
                ? "Farklı bir arama terimi dene."
                : "Konum bilgisi paylaşan berberler burada görünecek."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listHeader: { gap: 14, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "700", fontSize: 16 },
  name: { fontSize: 17, fontWeight: "700" },
  salon: { fontSize: 13, marginTop: 2 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  address: { fontSize: 13, flex: 1 },
  map: { width: "100%", height: 140, borderRadius: 14, marginTop: 2 },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 2,
  },
  bookText: { fontSize: 14, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingTop: 72, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 4 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19, paddingHorizontal: 24 },
});
