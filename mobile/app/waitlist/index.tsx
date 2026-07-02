import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

const STATUS_LABELS: Record<string, string> = {
  waiting: "Bekliyor",
  notified: "Bildirim Gönderildi",
  converted: "Randevuya Dönüştü",
  expired: "Süresi Doldu",
};

interface WaitlistEntry {
  id: string;
  customer_id: string;
  desired_date: string;
  desired_start_time: string | null;
  status: string;
  salon: { name: string } | null;
  service: { name: string } | null;
  barber: { user: { full_name: string | null } | null } | null;
  customer: { full_name: string | null } | null;
}

export default function WaitlistScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);
  const isBarber = user?.role === "barber" || user?.role === "salon_owner";

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;

    const baseSelect =
      "id, customer_id, desired_date, desired_start_time, status, " +
      "salon:salons(name), service:services(name), " +
      "barber:barbers(user:users!barbers_user_id_fkey(full_name)), " +
      "customer:users!waitlist_customer_id_fkey(full_name)";

    if (isBarber) {
      // RLS zaten salon sahibinin/berberin salonuna göre süzüyor;
      // müşteri satırları da customer_id ile geleceği için kendi kayıtlarını hariç tutmaya gerek yok.
      const { data } = await supabase
        .from("waitlist")
        .select(baseSelect)
        .order("desired_date", { ascending: true });
      setEntries((data as unknown as WaitlistEntry[]) ?? []);
    } else {
      const { data } = await supabase
        .from("waitlist")
        .select(baseSelect)
        .eq("customer_id", user.id)
        .order("desired_date", { ascending: true });
      setEntries((data as unknown as WaitlistEntry[]) ?? []);
    }
    setIsLoading(false);
  }, [user?.id, isBarber]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function handleLeave(entryId: string) {
    Alert.alert("Listeden Çık", "Bekleme listesinden çıkmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Listeden Çık",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("waitlist").delete().eq("id", entryId);
          if (error) {
            Alert.alert("Silinemedi", "Bekleme listesi kaydı silinirken bir hata oluştu.");
            return;
          }
          load();
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Bekleme Listesi" }} />

      {!isBarber && (
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/waitlist/add" as never)}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Bekleme Listesine Gir</Text>
        </Pressable>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.salonName, { color: colors.text }]}>{item.salon?.name ?? "Salon"}</Text>
              <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </View>
            </View>

            {isBarber && (
              <View style={styles.row}>
                <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.rowText, { color: colors.text }]}>
                  {item.customer?.full_name ?? "Müşteri"}
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <Ionicons name="cut-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.rowText, { color: colors.textMuted }]}>
                {item.service?.name ?? "Hizmet"}
                {item.barber?.user?.full_name ? ` · ${item.barber.user.full_name}` : ""}
              </Text>
            </View>

            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.rowText, { color: colors.textMuted }]}>
                {new Date(item.desired_date + "T00:00:00").toLocaleDateString("tr-TR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
                {item.desired_start_time ? ` · ${String(item.desired_start_time).slice(0, 5)}` : ""}
              </Text>
            </View>

            {!isBarber && item.customer_id === user?.id && (
              <Pressable
                style={[styles.leaveButton, { borderColor: colors.danger }]}
                onPress={() => handleLeave(item.id)}
              >
                <Ionicons name="exit-outline" size={15} color={colors.danger} />
                <Text style={[styles.leaveText, { color: colors.danger }]}>Listeden Çık</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="hourglass-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {isBarber ? "Bekleyen müşteri yok" : "Bekleme listeniz boş"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isBarber
                  ? "Salonun için bekleme listesine giren müşteriler burada görünecek."
                  : "Dolu bir gün için bekleme listesine girerek yer açıldığında haberdar olabilirsin."}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addButton: {
    flexDirection: "row",
    gap: 8,
    margin: 16,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  salonName: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowText: { fontSize: 13 },
  leaveButton: {
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  leaveText: { fontWeight: "600", fontSize: 13 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center" },
});
