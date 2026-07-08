import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Pressable } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TimeField } from "@/components/TimeField";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const TIME_REGEX = /^([01]?\d|2[0-3]):[0-5]\d$/;

interface DayRow {
  day_of_week: number;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  is_off: boolean;
}

function defaultRows(): DayRow[] {
  return DAY_NAMES.map((_, day) => ({
    day_of_week: day,
    start_time: "09:00",
    end_time: "18:00",
    is_off: day === 0, // Pazar kapalı
  }));
}

export default function ScheduleScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);
  const isBarber = user?.role === "barber" || user?.role === "salon_owner";

  const [barberId, setBarberId] = useState<string | null>(null);
  const [rows, setRows] = useState<DayRow[]>(defaultRows());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.id || !isBarber) {
        setIsLoading(false);
        return;
      }
      const { data: barberRow } = await supabase
        .from("barbers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!barberRow) {
        setIsLoading(false);
        return;
      }
      setBarberId(barberRow.id);

      const { data: schedules } = await supabase
        .from("barber_schedules")
        .select("day_of_week, start_time, end_time, is_off")
        .eq("barber_id", barberRow.id);

      if (schedules && schedules.length > 0) {
        setRows(
          DAY_NAMES.map((_, day) => {
            const existing = schedules.find((s) => s.day_of_week === day);
            if (!existing) {
              return { day_of_week: day, start_time: "09:00", end_time: "18:00", is_off: day === 0 };
            }
            return {
              day_of_week: day,
              start_time: String(existing.start_time).slice(0, 5),
              end_time: String(existing.end_time).slice(0, 5),
              is_off: existing.is_off,
            };
          })
        );
      }
      setIsLoading(false);
    }
    load();
  }, [user?.id]);

  function updateRow(day: number, patch: Partial<DayRow>) {
    setRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    if (!barberId) return;

    for (const row of rows) {
      if (!row.is_off && (!TIME_REGEX.test(row.start_time) || !TIME_REGEX.test(row.end_time))) {
        Alert.alert("Geçersiz Saat", `${DAY_NAMES[row.day_of_week]} için saatleri "09:00" biçiminde gir.`);
        return;
      }
      if (!row.is_off && row.start_time >= row.end_time) {
        Alert.alert("Geçersiz Saat", `${DAY_NAMES[row.day_of_week]} için kapanış saati açılıştan sonra olmalı.`);
        return;
      }
    }

    setIsSaving(true);
    const { error } = await supabase.from("barber_schedules").upsert(
      rows.map((r) => ({
        barber_id: barberId,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        is_off: r.is_off,
      })),
      { onConflict: "barber_id,day_of_week" }
    );
    setIsSaving(false);

    if (error) {
      Alert.alert("Kaydedilemedi", "Çalışma saatleri kaydedilirken bir hata oluştu.");
      return;
    }
    Alert.alert("Kaydedildi", "Çalışma saatlerin güncellendi.");
  }

  if (!isBarber) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: true, title: "Çalışma Saatleri" }} />
        <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Bu sayfa yalnızca berberler ve salon sahipleri içindir.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Çalışma Saatleri" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {isLoading ? (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>Yükleniyor...</Text>
        ) : !barberId ? (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Berber kaydın bulunamadı. Önce profilinden berber bilgilerini tamamla.
          </Text>
        ) : (
          <>
            {rows.map((row) => (
              <View
                key={row.day_of_week}
                style={[styles.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}
              >
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayName, { color: colors.text }]}>{DAY_NAMES[row.day_of_week]}</Text>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: colors.textMuted }]}>
                      {row.is_off ? "Kapalı" : "Açık"}
                    </Text>
                    <Switch
                      value={!row.is_off}
                      onValueChange={(open) => updateRow(row.day_of_week, { is_off: !open })}
                      trackColor={{ true: colors.primary }}
                    />
                  </View>
                </View>

                {!row.is_off && (
                  <View style={styles.timeRow}>
                    <TimeField
                      value={row.start_time}
                      onChange={(t) => updateRow(row.day_of_week, { start_time: t })}
                      style={{ flex: 1 }}
                    />
                    <Text style={{ color: colors.textMuted }}>—</Text>
                    <TimeField
                      value={row.end_time}
                      onChange={(t) => updateRow(row.day_of_week, { end_time: t })}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </View>
            ))}

            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveButtonText}>{isSaving ? "Kaydediliyor..." : "Kaydet"}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  infoText: { fontSize: 14, textAlign: "center" },
  dayCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayName: { fontSize: 15, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  switchLabel: { fontSize: 12, fontWeight: "600" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    textAlign: "center",
    fontSize: 15,
  },
  saveButton: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
