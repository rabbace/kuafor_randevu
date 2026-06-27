import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "@/lib/supabase";
import { useThemeStore } from "@/store/useThemeStore";
import { ContactButtons } from "@/components/contact/ContactButtons";
import type { Barber } from "@/types/database";

type BarberWithMeta = Barber & {
  user: { full_name: string | null } | null;
  salon: { name: string } | null;
};

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
      <Text style={[styles.title, { color: colors.text }]}>Yakınındaki Berberler</Text>
      <FlatList
        data={barbers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.name, { color: colors.text }]}>{item.user?.full_name ?? "Berber"}</Text>
            <Text style={[styles.salon, { color: colors.textMuted }]}>{item.salon?.name}</Text>
            <Text style={[styles.address, { color: colors.textMuted }]}>{item.address}</Text>

            {item.latitude && item.longitude && (
              <MapView
                style={styles.map}
                scrollEnabled={false}
                zoomEnabled={false}
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
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Henüz konum bilgisi paylaşan berber yok.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", padding: 24, paddingBottom: 0 },
  subtitle: { padding: 24 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  name: { fontSize: 16, fontWeight: "700" },
  salon: { fontSize: 13 },
  address: { fontSize: 13, marginBottom: 4 },
  map: { width: "100%", height: 140, borderRadius: 12 },
});
