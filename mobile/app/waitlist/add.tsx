import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
        setSelectedServiceId(null);
        return;
      }
      const { data } = await supabase
        .from("services")
        .select("id, name, price")
        .eq("salon_id", selectedBarber.salon_id)
        .eq("is_active", true);
      setServices((data as ServiceOption[]) ?? []);
      setSelectedServiceId(null);
    }
    loadServices();
  }, [selectedBarber?.id]);

  async function handleSubmit() {
    if (!user?.id) return;
    if (!selectedBarber) {
      Alert.alert("Eksik Bilgi", "Lütfen bir berber seç.");
      return;
    }
    if (!selectedServiceId) {
      Alert.alert("Eksik Bilgi", "Lütfen bir hizmet seç.");
      return;
    }
    const trimmed = date.trim();
    if (!DATE_REGEX.test(trimmed) || Number.isNaN(new Date(trimmed + "T00:00:00").getTime())) {
      Alert.alert("Geçersiz Tarih", "Tarihi 'YYYY-AA-GG' biçiminde gir (örn. 2026-07-15).");
      return;
    }
    if (new Date(trimmed + "T23:59:59").getTime() < Date.now()) {
      Alert.alert("Geçersiz Tarih", "Geçmiş bir tarih için bekleme listesine giremezsin.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("waitlist").insert({
      customer_id: user.id,
      salon_id: selectedBarber.salon_id,
      barber_id: selectedBarber.id,
      service_id: selectedServiceId,
      desired_date: trimmed,
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
                const active = selectedServiceId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.background,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedServiceId(s.id)}
                  >
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>İstenen Tarih</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="YYYY-AA-GG (örn. 2026-07-15)"
            placeholderTextColor={colors.textMuted}
            value={date}
            onChangeText={setDate}
            maxLength={10}
          />
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
