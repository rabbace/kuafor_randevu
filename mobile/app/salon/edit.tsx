import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

const TIME_REGEX = /^([01]?\d|2[0-3]):[0-5]\d$/;

export default function SalonEditScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);
  const isOwner = user?.role === "salon_owner";

  const [salonId, setSalonId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bufferMinutes, setBufferMinutes] = useState("10");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("20:00");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.id || !isOwner) {
        setIsLoading(false);
        return;
      }
      const { data: salon } = await supabase
        .from("salons")
        .select("id, name, description, phone, address, buffer_time_minutes, start_time, end_time")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (salon) {
        setSalonId(salon.id);
        setName(salon.name ?? "");
        setDescription(salon.description ?? "");
        setPhone(salon.phone ?? "");
        setAddress(salon.address ?? "");
        setBufferMinutes(String(salon.buffer_time_minutes ?? 10));
        setStartTime(String(salon.start_time ?? "09:00").slice(0, 5));
        setEndTime(String(salon.end_time ?? "20:00").slice(0, 5));
      }
      setIsLoading(false);
    }
    load();
  }, [user?.id]);

  async function handleSave() {
    if (!user?.id || !salonId) return;

    if (!name.trim()) {
      Alert.alert("Eksik Bilgi", "Salon adı zorunludur.");
      return;
    }
    const buffer = parseInt(bufferMinutes, 10);
    if (Number.isNaN(buffer) || buffer < 0 || buffer > 120) {
      Alert.alert("Geçersiz Değer", "Tampon süre 0-120 dakika arasında olmalı.");
      return;
    }
    if (!TIME_REGEX.test(startTime.trim()) || !TIME_REGEX.test(endTime.trim())) {
      Alert.alert("Geçersiz Saat", "Saatleri '09:00' biçiminde gir.");
      return;
    }
    if (startTime.trim() >= endTime.trim()) {
      Alert.alert("Geçersiz Saat", "Kapanış saati açılış saatinden sonra olmalı.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("salons")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        buffer_time_minutes: buffer,
        start_time: startTime.trim(),
        end_time: endTime.trim(),
      })
      .eq("owner_id", user.id);
    setIsSaving(false);

    if (error) {
      Alert.alert("Kaydedilemedi", "Salon bilgileri güncellenirken bir hata oluştu.");
      return;
    }
    Alert.alert("Kaydedildi", "Salon bilgilerin güncellendi.");
  }

  if (!isOwner) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: true, title: "Salon Bilgileri" }} />
        <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Bu sayfa yalnızca salon sahipleri içindir.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Salon Bilgileri" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        {isLoading ? (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>Yükleniyor...</Text>
        ) : !salonId ? (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Sana ait bir salon bulunamadı.
          </Text>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
              <Text style={[styles.label, { color: colors.text }]}>Salon Adı</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Salon adı"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.text }]}>Açıklama</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multiline,
                  { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Salonunu kısaca tanıt..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={[styles.label, { color: colors.text }]}>Telefon</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="05xx xxx xx xx"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: colors.text }]}>Adres</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Salon adresi"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
              <Text style={[styles.label, { color: colors.text }]}>Çalışma Saatleri</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={5}
                />
                <Text style={{ color: colors.textMuted }}>—</Text>
                <TextInput
                  style={[styles.input, styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="20:00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={5}
                />
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Tampon Süre (dakika)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={bufferMinutes}
                onChangeText={setBufferMinutes}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>Randevular arası tampon süre</Text>
            </View>

            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveText}>{isSaving ? "Kaydediliyor..." : "Kaydet"}</Text>
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
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  multiline: { minHeight: 80 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeInput: { flex: 1, textAlign: "center" },
  hint: { fontSize: 12 },
  saveButton: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
