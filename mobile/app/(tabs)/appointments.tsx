import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DateTimePicker = require("@react-native-community/datetimepicker").default;
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { cardShadow } from "@/theme/shadows";
import { supabase } from "@/lib/supabase";
import { STATUS_NOTIFICATIONS, notifyAppointmentParty } from "@/lib/notify";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { AdBanner } from "@/components/ads/AdBanner";
import { ContactButtons } from "@/components/contact/ContactButtons";
import type { Appointment, Barber, Service } from "@/types/database";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Onay Bekliyor", color: "#B45309", bg: "#FEF3C7" },
  confirmed: { label: "Onaylandı", color: "#15803D", bg: "#DCFCE7" },
  rejected: { label: "Reddedildi", color: "#B91C1C", bg: "#FEE2E2" },
  cancelled: { label: "İptal Edildi", color: "#52525B", bg: "#E4E4E7" },
  completed: { label: "Tamamlandı", color: "#1D4ED8", bg: "#DBEAFE" },
  no_show: { label: "Gelmedi", color: "#B91C1C", bg: "#FEE2E2" },
};

export default function AppointmentsScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);
  const isBarber = user?.role === "barber" || user?.role === "salon_owner";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());

  const sections = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const today: Appointment[] = [];
    const upcoming: Appointment[] = [];
    const past: Appointment[] = [];
    for (const a of appointments) {
      const start = new Date(a.start_time);
      if (start >= todayStart && start < tomorrowStart) today.push(a);
      else if (start >= tomorrowStart) upcoming.push(a);
      else past.push(a);
    }
    past.reverse();
    return [
      { title: "Bugün", data: today },
      { title: "Yaklaşan", data: upcoming },
      { title: "Geçmiş", data: past },
    ].filter((s) => s.data.length > 0);
  }, [appointments]);

  const todaySummary = useMemo(() => {
    if (!isBarber) return null;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const todays = appointments.filter((a) => {
      const t = new Date(a.start_time);
      return t >= todayStart && t < tomorrowStart;
    });
    if (todays.length === 0) return null;

    const now = new Date();
    const next = todays
      .filter((a) => (a.status === "pending" || a.status === "confirmed") && new Date(a.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

    const completed = todays.filter((a) => a.status === "completed");
    const earnings = completed.reduce((sum, a) => sum + (a.total_price ?? 0), 0);

    const denominatorStatuses = ["completed", "cancelled", "no_show", "confirmed", "pending"];
    const denominator = todays.filter((a) => denominatorStatuses.includes(a.status)).length;
    const completionRate = denominator > 0 ? Math.round((completed.length / denominator) * 100) : 0;

    return {
      count: todays.length,
      nextLabel: next
        ? `${new Date(next.start_time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} ${next.manual_customer_name ?? "Müşteri"}`
        : "Yok",
      earnings,
      completionRate,
    };
  }, [appointments, isBarber]);

  async function loadAppointments() {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      if (isBarber) {
        const { data: barberRow } = await supabase
          .from("barbers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        setBarber(barberRow as Barber | null);

        if (barberRow) {
          const [{ data: appts }, { data: svc }] = await Promise.all([
            supabase.from("appointments").select("*").eq("barber_id", barberRow.id).order("start_time"),
            supabase.from("services").select("*").eq("salon_id", barberRow.salon_id),
          ]);
          setAppointments(appts ?? []);
          setServices(svc ?? []);
        }
        return;
      }

      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("customer_id", user.id)
        .order("start_time", { ascending: true });
      setAppointments(data ?? []);

      // Zaten değerlendirilen randevularda "Değerlendir" butonu gizlenir.
      const completedIds = (data ?? []).filter((a) => a.status === "completed").map((a) => a.id);
      if (completedIds.length > 0) {
        const { data: rated } = await supabase
          .from("barber_ratings")
          .select("appointment_id")
          .in("appointment_id", completedIds);
        setRatedIds(new Set(((rated as { appointment_id: string }[]) ?? []).map((r) => r.appointment_id)));
      }
    } catch {
      // Yükleme hatası sessizce yutulur; ekran boş liste gösterir.
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, [user?.id]);

  // Ekrana her dönüşte yenile: değerlendirme sonrası "Değerlendir" butonu
  // anında "Değerlendirildi"ye dönsün.
  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [user?.id])
  );

  async function updateStatus(appointmentId: string, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);
    if (error) {
      Alert.alert("Güncellenemedi", `Randevu durumu güncellenirken bir hata oluştu.\n\n${error.message}`);
      return;
    }
    // Karşı tarafa anlık bildirim (fire-and-forget).
    const notif = STATUS_NOTIFICATIONS[status];
    if (notif) notifyAppointmentParty(appointmentId, notif.title, notif.body);
    loadAppointments();
  }

  function handleCancel(appointmentId: string) {
    Alert.alert("Randevuyu İptal Et", "Bu randevuyu iptal etmek istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "İptal Et", style: "destructive", onPress: () => updateStatus(appointmentId, "cancelled") },
    ]);
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isBarber && barber && (
        <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setIsModalOpen(true)}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Dışarıdan Randevu Ekle</Text>
        </Pressable>
      )}

      {isBarber && todaySummary && (
        <LinearGradient colors={colors.gradient} style={[styles.summaryCard, cardShadow]}>
          <Text style={styles.summaryTitle}>Bugünkü Özet</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{todaySummary.count}</Text>
              <Text style={styles.summaryLabel}>Randevu</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue} numberOfLines={2}>
                {todaySummary.nextLabel}
              </Text>
              <Text style={styles.summaryLabel}>Sıradaki</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{todaySummary.earnings} ₺</Text>
              <Text style={styles.summaryLabel}>Tahmini Kazanç</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>%{todaySummary.completionRate}</Text>
              <Text style={styles.summaryLabel}>Tamamlanma</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 24, paddingTop: 12, gap: 12 }}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          const start = new Date(item.start_time);
          return (
            <View
              style={[
                styles.card,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderLeftWidth: 4,
                  borderLeftColor: meta?.color ?? colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.date, { color: colors.text }]}>
                    {start.toLocaleDateString("tr-TR", { day: "2-digit", month: "long" })}
                  </Text>
                  <Text style={[styles.time, { color: colors.textMuted }]}>
                    {start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: meta?.bg ?? colors.border }]}>
                  <Text style={[styles.badgeText, { color: meta?.color ?? colors.textMuted }]}>
                    {meta?.label ?? item.status}
                  </Text>
                </View>
              </View>

              {item.is_manual_entry && (
                <View style={styles.manualRow}>
                  <Ionicons name="create-outline" size={14} color={colors.primary} />
                  <Text style={[styles.manualBadge, { color: colors.primary }]}>
                    Elden Girildi · {item.manual_customer_name}
                    {item.manual_customer_phone ? ` (${item.manual_customer_phone})` : ""}
                  </Text>
                </View>
              )}

              {!isBarber && barber?.whatsapp_phone && <ContactButtons phone={barber.whatsapp_phone} />}

              {isBarber && item.status === "pending" && (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: "#15803D" }]}
                    onPress={() => updateStatus(item.id, "confirmed")}
                  >
                    <Ionicons name="checkmark" size={15} color="#fff" />
                    <Text style={styles.actionText}>Onayla</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: "#B91C1C" }]}
                    onPress={() => updateStatus(item.id, "rejected")}
                  >
                    <Ionicons name="close" size={15} color="#fff" />
                    <Text style={styles.actionText}>Reddet</Text>
                  </Pressable>
                </View>
              )}

              {isBarber && item.status === "confirmed" && (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: "#1D4ED8" }]}
                    onPress={() => updateStatus(item.id, "completed")}
                  >
                    <Ionicons name="checkmark-done" size={15} color="#fff" />
                    <Text style={styles.actionText}>Tamamlandı</Text>
                  </Pressable>
                </View>
              )}

              {!isBarber && (item.status === "pending" || item.status === "confirmed") && (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => handleCancel(item.id)}
                  >
                    <Ionicons name="close-circle-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.actionText, { color: colors.textMuted }]}>İptal Et</Text>
                  </Pressable>
                </View>
              )}

              {!isBarber && item.status === "completed" && !ratedIds.has(item.id) && (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: "#6D28D9" }]}
                    onPress={() => router.push(`/rating/${item.id}` as never)}
                  >
                    <Ionicons name="star-outline" size={15} color="#fff" />
                    <Text style={styles.actionText}>Değerlendir</Text>
                  </Pressable>
                </View>
              )}
              {!isBarber && item.status === "completed" && ratedIds.has(item.id) && (
                <View style={styles.ratedRow}>
                  <Ionicons name="checkmark-circle" size={15} color="#15803D" />
                  <Text style={{ color: "#15803D", fontSize: 13, fontWeight: "600" }}>Değerlendirildi</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "14" }]}>
              <Ionicons name="calendar-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz randevu yok</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isBarber ? "Gelen randevular burada listelenecek." : "Bir berber bularak randevu alabilirsin."}
            </Text>
          </View>
        }
      />
      <AdBanner />

      {isBarber && barber && (
        <ManualAppointmentModal
          visible={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          barber={barber}
          services={services}
          onCreated={() => {
            setIsModalOpen(false);
            loadAppointments();
          }}
        />
      )}
    </View>
  );
}

function ManualAppointmentModal({
  visible,
  onClose,
  barber,
  services,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  barber: Barber;
  services: Service[];
  onCreated: () => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const totalDuration = selectedServiceIds.reduce((sum, id) => {
    const svc = services.find((s) => s.id === id);
    return sum + (svc?.base_duration_minutes ?? 0);
  }, 0);

  const totalPrice = selectedServiceIds.reduce((sum, id) => {
    const svc = services.find((s) => s.id === id);
    return sum + (svc?.price ?? 0);
  }, 0);

  function formatDate(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  }
  function formatTime(d: Date) {
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert("Eksik Bilgi", "Müşteri adı zorunludur.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      Alert.alert("Eksik Bilgi", "En az bir hizmet seç.");
      return;
    }
    if (selectedDate.getTime() <= Date.now()) {
      Alert.alert("Geçersiz Tarih", "Randevu tarihi gelecekte olmalıdır.");
      return;
    }

    const end = new Date(selectedDate.getTime() + totalDuration * 60000);
    // Çoklu hizmet için ilk hizmet ID'yi service_id olarak kaydet
    const primaryServiceId = selectedServiceIds[0];

    setIsSaving(true);
    const { error } = await supabase.from("appointments").insert({
      salon_id: barber.salon_id,
      barber_id: barber.id,
      service_id: primaryServiceId,
      start_time: selectedDate.toISOString(),
      end_time: end.toISOString(),
      total_price: totalPrice,
      status: "confirmed",
      is_manual_entry: true,
      manual_customer_name: name.trim(),
      manual_customer_phone: phone.trim() || null,
      customer_id: null,
    });
    setIsSaving(false);

    if (error) {
      const isConflict = error.code === "23P01" || /conflict|overlap|exclusion/i.test(error.message ?? "");
      Alert.alert(
        "Randevu Eklenemedi",
        isConflict
          ? "Bu saat dilimi dolu, lütfen başka bir saat seçin."
          : "Randevu kaydedilirken bir hata oluştu. Lütfen tekrar dene."
      );
      return;
    }

    setName("");
    setPhone("");
    setSelectedServiceIds([]);
    onCreated();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Dışarıdan Randevu Ekle</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Müşteri Adı *"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Telefon (opsiyonel)"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          {/* Tarih & Saat Seçici */}
          <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>Tarih ve Saat</Text>
          <View style={styles.dateTimeRow}>
            <Pressable
              style={[styles.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{formatDate(selectedDate)}</Text>
            </Pressable>
            <Pressable
              style={[styles.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border, flex: 0.5 }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{formatTime(selectedDate)}</Text>
            </Pressable>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              minimumDate={new Date()}
              onChange={(_e: unknown, d?: Date) => {
                setShowDatePicker(false);
                if (d) {
                  const merged = new Date(d);
                  merged.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                  setSelectedDate(merged);
                }
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              minuteInterval={15}
              onChange={(_e: unknown, d?: Date) => {
                setShowTimePicker(false);
                if (d) {
                  const merged = new Date(selectedDate);
                  merged.setHours(d.getHours(), d.getMinutes(), 0, 0);
                  setSelectedDate(merged);
                }
              }}
            />
          )}

          {/* Çoklu Hizmet Seçimi */}
          <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
            Hizmetler{selectedServiceIds.length > 0 ? ` · ${totalDuration} dk · ${totalPrice} ₺` : ""}
          </Text>
          <View style={styles.serviceRow}>
            {services.map((s) => {
              const active = selectedServiceIds.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  style={[
                    styles.serviceChip,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleService(s.id)}
                >
                  {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                  <Text style={{ color: active ? "#fff" : colors.text, fontSize: 12, fontWeight: "600" }}>
                    {s.name}
                  </Text>
                  <Text style={{ color: active ? "rgba(255,255,255,0.75)" : colors.textMuted, fontSize: 11 }}>
                    {s.base_duration_minutes}dk
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.modalActions}>
            <Pressable style={[styles.modalButton, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.text }}>Vazgeç</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
              onPress={handleCreate}
              disabled={isSaving}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>{isSaving ? "Kaydediliyor..." : "Ekle"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 2,
  },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
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
  summaryCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 18, padding: 16, gap: 12 },
  summaryTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: { color: "#fff", fontSize: 13, fontWeight: "800", textAlign: "center" },
  summaryLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "600", textAlign: "center" },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  date: { fontWeight: "700", fontSize: 16 },
  time: { fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  manualRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionRow: { flexDirection: "row", gap: 8 },
  ratedRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  manualBadge: { fontSize: 12, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 20, padding: 22, gap: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  serviceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  serviceChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  pickerLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 },
  dateTimeRow: { flexDirection: "row", gap: 8 },
  dateTimeButton: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});
