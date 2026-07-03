import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";
import type { Appointment, Barber, Salon } from "@/types/database";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Onay Bekliyor", color: "#B45309", bg: "#FEF3C7" },
  confirmed: { label: "Onaylandı", color: "#15803D", bg: "#DCFCE7" },
  rejected: { label: "Reddedildi", color: "#B91C1C", bg: "#FEE2E2" },
  cancelled: { label: "İptal Edildi", color: "#52525B", bg: "#E4E4E7" },
  completed: { label: "Tamamlandı", color: "#1D4ED8", bg: "#DBEAFE" },
  no_show: { label: "Gelmedi", color: "#B91C1C", bg: "#FEE2E2" },
};

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

type BarberSchedule = {
  id?: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_off: boolean;
};

type AppointmentWithService = Appointment & {
  services: { name: string; base_duration_minutes: number } | null;
};

type BarberWithSalon = Barber & { salons: Salon | null };

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function BarberDashboard() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);

  const [barber, setBarber] = useState<BarberWithSalon | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const weekDays = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    const { data: barberRow } = await supabase
      .from("barbers")
      .select("*, salons(*)")
      .eq("user_id", user.id)
      .maybeSingle();

    setBarber((barberRow as BarberWithSalon | null) ?? null);

    if (!barberRow) {
      setIsLoading(false);
      return;
    }

    const weekStart = startOfDay(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [apptsRes, schedulesRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, services(name, base_duration_minutes)")
        .eq("barber_id", (barberRow as BarberWithSalon).id)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString())
        .order("start_time"),
      supabase.from("barber_schedules").select("*").eq("barber_id", (barberRow as BarberWithSalon).id),
    ]);

    setAppointments((apptsRes.data ?? []) as AppointmentWithService[]);
    setSchedules((schedulesRes.data ?? []) as BarberSchedule[]);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeStatuses = ["pending", "confirmed"];

  function appointmentsForDay(day: Date): AppointmentWithService[] {
    const dayEnd = new Date(day.getTime() + 86_400_000);
    return appointments.filter((a) => {
      const t = new Date(a.start_time);
      return t >= day && t < dayEnd;
    });
  }

  function dayState(day: Date): "busy" | "available" | "off" {
    const schedule = schedules.find((s) => s.day_of_week === day.getDay());
    const workingDays = barber?.salons?.working_days;
    const isOff =
      schedule?.is_off === true ||
      (Array.isArray(workingDays) && !workingDays.includes(day.getDay()));
    if (isOff) return "off";
    const dayAppts = appointmentsForDay(day).filter((a) => activeStatuses.includes(a.status));
    return dayAppts.length > 0 ? "busy" : "available";
  }

  const stats = useMemo(() => {
    const today = weekDays[0];
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const todays = appointments.filter((a) => {
      const t = new Date(a.start_time);
      return t >= today && t < tomorrow;
    });
    const now = new Date();
    const next = appointments.find(
      (a) => activeStatuses.includes(a.status) && new Date(a.start_time) > now
    );
    return {
      todayCount: todays.length,
      nextLabel: next ? timeLabel(next.start_time) : "Yok",
      weekTotal: appointments.length,
    };
  }, [appointments, weekDays]);

  async function updateStatus(appointmentId: string, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);
    if (error) {
      Alert.alert("Güncellenemedi", "Randevu durumu güncellenirken bir hata oluştu.");
      return;
    }
    loadData();
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!barber || !barber.salons) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "14" }]}>
          <Ionicons name="storefront-outline" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Salonunu henüz kurmamdın</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Randevu almaya başlamak için önce salon bilgilerini tamamla.
        </Text>
        <Pressable
          style={[styles.setupButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/profile" as never)}
        >
          <Ionicons name="settings-outline" size={16} color="#fff" />
          <Text style={styles.setupButtonText}>Salonunu Kur</Text>
        </Pressable>
      </View>
    );
  }

  const selectedDay = weekDays[selectedDayIndex];
  const selectedAppointments = appointmentsForDay(selectedDay);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
    >
      {/* Stats */}
      <LinearGradient colors={["#6D28D9", "#7C3AED"]} style={[styles.statsCard, cardShadow]}>
        <Text style={styles.statsTitle}>Genel Bakış</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.todayCount}</Text>
            <Text style={styles.statLabel}>Bugünkü Randevu</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.nextLabel}</Text>
            <Text style={styles.statLabel}>Sıradaki</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.weekTotal}</Text>
            <Text style={styles.statLabel}>Bu Hafta</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Weekly calendar strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {weekDays.map((day, i) => {
          const state = dayState(day);
          const selected = i === selectedDayIndex;
          const dotColor = state === "busy" ? "#DC2626" : state === "available" ? "#16A34A" : colors.border;
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => setSelectedDayIndex(i)}
              style={[
                styles.dayCell,
                {
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  opacity: state === "off" && !selected ? 0.55 : 1,
                },
              ]}
            >
              <Text style={[styles.dayName, { color: selected ? "#fff" : colors.textMuted }]}>
                {DAY_NAMES[day.getDay()]}
              </Text>
              <Text style={[styles.dayNumber, { color: selected ? "#fff" : colors.text }]}>
                {day.getDate()}
              </Text>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Selected day appointments */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
        {selectedDay.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", weekday: "long" })}
      </Text>

      {selectedAppointments.length === 0 ? (
        <View style={styles.emptyDay}>
          <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Bu gün müsait</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {dayState(selectedDay) === "off" ? "Bu gün izinli görünüyorsun." : "Henüz randevu yok."}
          </Text>
        </View>
      ) : (
        selectedAppointments.map((item) => {
          const meta = STATUS_META[item.status];
          return (
            <View
              key={item.id}
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timeRange, { color: colors.text }]}>
                    {timeLabel(item.start_time)} – {timeLabel(item.end_time)}
                  </Text>
                  <Text style={[styles.customerName, { color: colors.textMuted }]}>
                    {item.manual_customer_name ?? "Uygulama Müşterisi"}
                  </Text>
                  {item.services?.name && (
                    <Text style={[styles.serviceName, { color: colors.textMuted }]}>
                      {item.services.name}
                    </Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: meta?.bg ?? colors.border }]}>
                  <Text style={[styles.badgeText, { color: meta?.color ?? colors.textMuted }]}>
                    {meta?.label ?? item.status}
                  </Text>
                </View>
              </View>

              {item.status === "pending" && (
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

              {item.status === "confirmed" && (
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
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  statsCard: { borderRadius: 18, padding: 16, gap: 12 },
  statsTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 4,
  },
  statValue: { color: "#fff", fontSize: 16, fontWeight: "800", textAlign: "center" },
  statLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "600", textAlign: "center" },
  dayCell: {
    width: 62,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  dayName: { fontSize: 12, fontWeight: "600" },
  dayNumber: { fontSize: 18, fontWeight: "800" },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  timeRange: { fontWeight: "700", fontSize: 16 },
  customerName: { fontSize: 13, marginTop: 2, fontWeight: "600" },
  serviceName: { fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 8 },
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
  emptyDay: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 4 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  setupButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  setupButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
