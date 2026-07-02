import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

interface AppointmentDetail {
  id: string;
  barber_id: string;
  start_time: string;
  status: string;
  service: { name: string } | null;
  barber: { user: { full_name: string | null } | null } | null;
  salon: { name: string } | null;
}

export default function RatingScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!appointmentId) return;
      const [{ data: appt }, { data: existing }] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id, barber_id, start_time, status, service:services(name), " +
              "barber:barbers(user:users!barbers_user_id_fkey(full_name)), salon:salons(name)"
          )
          .eq("id", appointmentId)
          .maybeSingle(),
        supabase.from("barber_ratings").select("id").eq("appointment_id", appointmentId).maybeSingle(),
      ]);
      setAppointment(appt as unknown as AppointmentDetail | null);
      setAlreadyRated(!!existing);
      setIsLoading(false);
    }
    load();
  }, [appointmentId]);

  async function handleSubmit() {
    if (!user?.id || !appointment) return;
    if (rating < 1) {
      Alert.alert("Eksik Bilgi", "Lütfen 1-5 arası bir puan seç.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("barber_ratings").insert({
      appointment_id: appointment.id,
      customer_id: user.id,
      barber_id: appointment.barber_id,
      rating,
      comment: comment.trim() || null,
    });
    setIsSaving(false);

    if (error) {
      const isDuplicate = error.code === "23505";
      Alert.alert(
        "Gönderilemedi",
        isDuplicate
          ? "Bu randevuyu zaten değerlendirdin."
          : "Değerlendirme kaydedilirken bir hata oluştu."
      );
      return;
    }
    Alert.alert("Teşekkürler!", "Değerlendirmen kaydedildi.", [
      { text: "Tamam", onPress: () => router.back() },
    ]);
  }

  const start = appointment ? new Date(appointment.start_time) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Değerlendir" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        {isLoading ? (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>Yükleniyor...</Text>
        ) : !appointment ? (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>Randevu bulunamadı.</Text>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
              <Text style={[styles.salonName, { color: colors.text }]}>{appointment.salon?.name ?? "Salon"}</Text>
              <View style={styles.row}>
                <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.rowText, { color: colors.textMuted }]}>
                  {appointment.barber?.user?.full_name ?? "Berber"}
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="cut-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.rowText, { color: colors.textMuted }]}>
                  {appointment.service?.name ?? "Hizmet"}
                </Text>
              </View>
              {start && (
                <View style={styles.row}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.rowText, { color: colors.textMuted }]}>
                    {start.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}{" "}
                    {start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              )}
            </View>

            {alreadyRated ? (
              <View style={[styles.card, styles.centered, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle-outline" size={36} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  Bu randevuyu zaten değerlendirdin. Teşekkürler!
                </Text>
              </View>
            ) : appointment.status !== "completed" ? (
              <View style={[styles.card, styles.centered, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                  Randevu tamamlandıktan sonra değerlendirme yapabilirsin.
                </Text>
              </View>
            ) : (
              <>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Puanın</Text>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Pressable key={value} onPress={() => setRating(value)} hitSlop={6}>
                        <Ionicons
                          name={value <= rating ? "star" : "star-outline"}
                          size={38}
                          color={value <= rating ? "#F59E0B" : colors.textMuted}
                        />
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>
                    Yorumun (opsiyonel)
                  </Text>
                  <TextInput
                    style={[
                      styles.commentInput,
                      { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                    ]}
                    placeholder="Deneyimini paylaş..."
                    placeholderTextColor={colors.textMuted}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <Pressable
                  style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
                  onPress={handleSubmit}
                  disabled={isSaving}
                >
                  <Ionicons name="send-outline" size={17} color="#fff" />
                  <Text style={styles.submitText}>
                    {isSaving ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  centered: { alignItems: "center", gap: 10, paddingVertical: 24 },
  salonName: { fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowText: { fontSize: 13 },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
  starRow: { flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: 8 },
  commentInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, minHeight: 96 },
  submitButton: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  infoText: { fontSize: 14, textAlign: "center" },
});
