import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Appointment } from "@/types/database";

const STATUS_LABELS: Record<string, string> = {
  pending: "Onay Bekliyor",
  confirmed: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
  completed: "Tamamlandı",
  no_show: "Gelmedi",
};

export default function AppointmentsScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("appointments")
      .select("*")
      .eq("customer_id", userId)
      .order("start_time", { ascending: true })
      .then(({ data }) => setAppointments(data ?? []));
  }, [userId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.date}>
              {new Date(item.start_time).toLocaleString("tr-TR")}
            </Text>
            <Text style={styles.status}>{STATUS_LABELS[item.status]}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Henüz randevun yok.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 16 },
  date: { fontWeight: "600", marginBottom: 4 },
  status: { color: "#666" },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
