import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DateTimePicker = require("@react-native-community/datetimepicker").default;
import { TimeField } from "@/components/TimeField";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

interface BarberOption {
  id: string;
  salon_id: string;
  title: string | null;
  user: { full_name: string | null } | null;
  salon: { name: string } | null;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

export default function WaitlistAddScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);

  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<BarberOption | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("20:00");
  const [isSaving, setIsSaving] = useState(false);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  useEffect(() => {
    async function loadBarbers() {
      const { data } = await supabase
        .from("barbers")
        .select("id, salon_id, title, user:users!barbers_user_id_fkey(full_name), salon:salons(name)")
        .eq("is_active", true);
      setBarbers((data as unknown as BarberOption[]) ?? []);
    }
    loadBarbers();
  }, []);

  useEffect(() => {
    async function loadServices() {
      if (!selectedBarber) {
        setServices([]);
        setSelectedServiceIds([]);
        return;
      }
      const { data } = await supabase
        .from("services")
        .select("id, name, price")
        .eq("salon_id", selectedBarber.salon_id)
        .eq("is_active", true);
      setServices((data as ServiceOption[]) ?? []);
      setSelectedServiceIds([]);
    }
    loadServices();
  }, [selectedBarber?.id]);

  async function handleSubmit() {
    if (!user?.id) return;
    if (!selectedBarber) {
      Alert.alert("Eksik Bilgi", "Lütfen bir berber seç.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      Alert.alert("Eksik Bilgi", "Lütfen en az bir hizmet seç.");
      return;
    }
    if (!date) {
      Alert.alert("Eksik Bilgi", "Lütfen bir tarih seç.");
      return;
    }
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    if (dayEnd.getTime() < Date.now()) {
      Alert.alert("Geçersiz Tarih", "Geçmiş bir tarih için bekleme listesine giremezsin.");
      return;
    }
    if (startTime >= endTime) {
      Alert.alert("Geçersiz Saat", "Bitiş saati başlangıçtan sonra olmalı.");
      return;
    }

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    setIsSaving(true);
    const { error } = await supabase.from("waitlist").insert({
      customer_id: user.id,
      salon_id: selectedBarber.salon_id,
      barber_id: selectedBarber.id,
      service_id: selectedServiceIds[0],
      service_ids: selectedServiceIds,
      desired_date: `${y}-${m}-${d}`,
      desired_start_time: startTime,
      desired_end_time: endTime,
    });
    setIsSaving(false);

    if (error) {
      Alert.alert("Eklenemedi", "Bekleme listesine eklenirken bir hata oluştu.");
      return;
    }
    Alert.alert("Listeye Eklendin", "Bu tarihte bir yer açılırsa sana bildirim göndereceğiz.", [
      { text: "Tamam", onPress: () => router.back() },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Bekleme Listesine Gir" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Berber Seç</Text>
          <View style={styles.chipWrap}>
            {barbers.map((b) => {
              const active = selectedBarber?.id === b.id;
              return (
                <Pressable
                  key={b.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedBarber(b)}
                >
                  <Text style={{ color: active ? "#fff" : colors.text, fontSize: 13 }}>
                    {b.user?.full_name ?? b.title ?? "Berber"}
                    {b.salon?.name ? ` · ${b.salon.name}` : ""}
                  </Text>
                </Pressable>
              );
            })}
            {barbers.length === 0 && (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Aktif berber bulunamadı.</Text>
            )}
          </View>
        </View>

        {selectedBarber && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hizmet Seç</Text>
            <View style={styles.chipWrap}>
              {services.map((s) => {
                const active = selectedServiceIds.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.background,
                        borderColor: active ? colors.primary : colors.border,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      },
                    ]}
                    onPress={() => toggleService(s.id)}
                  >
                    <Ionicons
                      name={active ? "checkbox" : "square-outline"}
                      size={15}
                      color={active ? "#fff" : colors.textMuted}
                    />
                    <Text style={{ color: active ? "#fff" : colors.text, fontSize: 13 }}>
                      {s.name} · {s.price} TL
                    </Text>
                  </Pressable>
                );
              })}
              {services.length === 0 && (
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Bu salonda hizmet bulunamadı.</Text>
              )}
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>İstenen Tarih ve Saat Aralığı</Text>
          <Pressable
            style={[styles.input, styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={{ color: date ? colors.text : colors.textMuted, fontSize: 15, fontWeight: "600" }}>
              {date
                ? date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" })
                : "Tarih seç"}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={date ?? new Date()}
              mode="date"
              minimumDate={new Date()}
              onChange={(_e: unknown, d?: Date) => {
                setShowDatePicker(false);
                if (d) setDate(d);
              }}
            />
          )}

          <Text style={[styles.hintLabel, { color: colors.textMuted }]}>
            Hangi saatler arasında uygunsun?
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TimeField value={startTime} onChange={setStartTime} style={{ flex: 1 }} />
            <Text style={{ color: colors.textMuted }}>—</Text>
            <TimeField value={endTime} onChange={setEndTime} style={{ flex: 1 }} />
          </View>
        </View>

        <Pressable
          style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          <Ionicons name="hourglass-outline" size={18} color="#fff" />
          <Text style={styles.submitText}>{isSaving ? "Ekleniyor..." : "Bekleme Listesine Gir"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  dateButton: { flexDirection: "row", alignItems: "center", gap: 8 },
  hintLabel: { fontSize: 12, marginTop: 2 },
  submitButton: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
