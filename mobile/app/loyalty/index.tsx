import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

const REASON_LABELS: Record<string, string> = {
  appointment_completed: "Tamamlanan randevu",
  reward_redeemed: "Ödül kullanımı",
};

interface LoyaltyTransaction {
  id: string;
  points_change: number;
  reason: string;
  created_at: string;
  salon: { name: string } | null;
}

interface LoyaltyRule {
  points_per_visit: number;
  free_visit_threshold: number;
}

export default function LoyaltyScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);

  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [rule, setRule] = useState<LoyaltyRule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      const [{ data: txs }, { data: rules }] = await Promise.all([
        supabase
          .from("loyalty_transactions")
          .select("id, points_change, reason, created_at, salon:salons(name)")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("loyalty_rules").select("points_per_visit, free_visit_threshold").limit(1),
      ]);
      setTransactions((txs as unknown as LoyaltyTransaction[]) ?? []);
      setRule((rules?.[0] as LoyaltyRule | undefined) ?? null);
      setIsLoading(false);
    }
    load();
  }, [user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Sadakat Puanları" }} />

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={[styles.totalCard, { backgroundColor: colors.primary }, cardShadow]}>
              <Ionicons name="star" size={28} color="#fff" />
              <Text style={styles.totalPoints}>{user?.loyaltyPoints ?? 0}</Text>
              <Text style={styles.totalLabel}>Toplam Puan</Text>
            </View>

            {rule && (
              <View style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.ruleText, { color: colors.textMuted }]}>
                  Her tamamlanan randevuda {rule.points_per_visit} puan kazanırsınız.{" "}
                  {rule.free_visit_threshold} puana ulaştığınızda 1 ücretsiz ziyaret hakkı kazanırsınız.
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const positive = item.points_change >= 0;
          return (
            <View style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txReason, { color: colors.text }]}>
                  {REASON_LABELS[item.reason] ?? item.reason}
                </Text>
                <Text style={[styles.txMeta, { color: colors.textMuted }]}>
                  {item.salon?.name ? `${item.salon.name} · ` : ""}
                  {new Date(item.created_at).toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <Text style={[styles.txPoints, { color: positive ? "#15803D" : colors.danger }]}>
                {positive ? `+${item.points_change}` : item.points_change}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz puan geçmişin yok</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Randevularını tamamladıkça burada puan kazanımlarını göreceksin.
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
  totalCard: { borderRadius: 20, padding: 24, alignItems: "center", gap: 4 },
  totalPoints: { color: "#fff", fontSize: 36, fontWeight: "800" },
  totalLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" },
  ruleCard: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "flex-start",
  },
  ruleText: { flex: 1, fontSize: 13, lineHeight: 18 },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  txReason: { fontSize: 14, fontWeight: "600" },
  txMeta: { fontSize: 12, marginTop: 2 },
  txPoints: { fontSize: 18, fontWeight: "800" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center" },
});
