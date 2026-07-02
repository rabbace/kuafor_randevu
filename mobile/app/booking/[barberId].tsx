import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { generateDailySlots, type TimeSlot } from "@/lib/slotCalculator";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";
import type { Appointment, Barber, Salon, Service } from "@/types/database";

interface BarberSchedule {
  id: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_off: boolean;
}

type BarberWithMeta = Barber & { user: { full_name: string | null } | null };

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function BookingScreen() {
  const { barberId } = useLocalSearchParams<{ barberId: string }>();
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);

  const [isLoading, setIsLoading] = useState(true);
  const [barber, setBarber] = useState<BarberWithMeta | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  useEffect(() => {
    async function load() {
      if (!barberId) return;
      try {
        const { data: barberRow, error } = await supabase
          .from("barbers")
          .select("*, user:users!barbers_user_id_fkey(full_name)")
          .eq("id", barberId)
          .maybeSingle();

        if (error || !barberRow) {
          Alert.alert("Hata", "Berber bilgileri yüklenemedi.");
          router.back();
          return;
        }
        setBarber(barberRow as unknown as BarberWithMeta);

        const [salonRes, servicesRes, schedulesRes] = await Promise.all([
          supabase.from("salons").select("*").eq("id", barberRow.salon_id).maybeSingle(),
          supabase
            .from("services")
            .select("*")
            .eq("salon_id", barberRow.salon_id)
            .eq("is_active", true)
            .order("name"),
          supabase.from("barber_schedules").select("*").eq("barber_id", barberRow.id),
        ]);

        setSalon((salonRes.data as Salon) ?? null);
        setServices((servicesRes.data as Service[]) ?? []);
        setSchedules((schedulesRes.data as BarberSchedule[]) ?? []);
      } catch {
        Alert.alert("Hata", "Bilgiler yüklenirken bir sorun oluştu.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [barberId]);

  const loadDayAppointments = useCallback(async () => {
    if (!barber) return;
    try {
      const dayStart = new Date(selectedDate);
      const dayEnd = new Date(selectedDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("barber_id", barber.id)
        .in("status", ["pending", "confirmed"])
        .gte("start_time", dayStart.toISOString())
        .lt("start_time", dayEnd.toISOString());

      setAppointments((data as Appointment[]) ?? []);
    } catch {
      setAppointments([]);
    }
  }, [barber, selectedDate]);

  useEffect(() => {
    loadDayAppointments();
  }, [loadDayAppointments]);

  const slots = useMemo(() => {
    if (!salon || !barber || !selectedService) return [];

    const schedule = schedules.find((s) => s.day_of_week === selectedDate.getDay());
    if (schedule?.is_off) return [];

    const generated = generateDailySlots({
      date: selectedDate,
      salon,
      barber,
      service: selectedService,
      existingAppointments: appointments,
      barberWorkingHours: schedule
        ? { start: schedule.start_time, end: schedule.end_time }
        : null,
    });

    // Geçmiş saatler seçilemesin.
    const now = new Date();
    return generated.map((slot) =>
      slot.start <= now ? { ...slot, isAvailable: false } : slot
    );
  }, [salon, barber, selectedService, schedules, selectedDate, appointments]);

  async function handleBook() {
    if (!user?.id) {
      Alert.alert("Giriş Gerekli", "Randevu almak için giriş yapmalısın.");
      return;
    }
    if (!barber || !salon || !selectedService || !selectedSlot) {
      Alert.alert("Eksik Seçim", "Lütfen hizmet, tarih ve saat seç.");
      return;
    }

    setIsBooking(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        salon_id: salon.id,
        barber_id: barber.id,
        service_id: selectedService.id,
        customer_id: user.id,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        status: "pending",
      });

      if (error) {
        const isConflict =
          error.code === "23P01" ||
          /conflict|overlap|exclusion/i.test(error.message ?? "");
        Alert.alert(
          "Randevu Alınamadı",
          isConflict
            ? "Bu saat dilimi dolu, lütfen başka bir saat seçin."
            : "Randevu oluşturulurken bir hata oluştu. Lütfen tekrar dene."
        );
        loadDayAppointments();
        return;
      }

      Alert.alert(
        "Randevun Alındı",
        "Randevu talebin gönderildi. Berber onayladığında bilgilendirileceksin.",
        [{ text: "Tamam", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert("Hata", "Randevu oluşturulurken beklenmeyen bir hata oluştu.");
    } finally {
      setIsBooking(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {barber?.user?.full_name ?? "Randevu Al"}
          </Text>
          {salon && (
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {salon.name}
            </Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hizmet Seç</Text>
        {services.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Bu salon henüz hizmet eklememiş.
          </Text>
        ) : (
          <View style={styles.serviceList}>
            {services.map((service) => {
              const active = selectedService?.id === service.id;
              return (
                <Pressable
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    cardShadow,
                  ]}
                  onPress={() => {
                    setSelectedService(service);
                    setSelectedSlot(null);
                  }}
                >
                  <Text style={[styles.serviceName, { color: active ? "#fff" : colors.text }]}>
                    {service.name}
                  </Text>
                  <Text style={[styles.serviceMeta, { color: active ? "rgba(255,255,255,0.85)" : colors.textMuted }]}>
                    {service.base_duration_minutes} dk · {service.price} ₺
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tarih Seç</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {days.map((day) => {
            const active = day.getTime() === selectedDate.getTime();
            return (
              <Pressable
                key={day.toISOString()}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedDate(day);
                  setSelectedSlot(null);
                }}
              >
                <Text style={[styles.dateDay, { color: active ? "#fff" : colors.textMuted }]}>
                  {DAY_NAMES[day.getDay()]}
                </Text>
                <Text style={[styles.dateNum, { color: active ? "#fff" : colors.text }]}>
                  {day.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Saat Seç</Text>
        {!selectedService ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Uygun saatleri görmek için önce bir hizmet seç.
          </Text>
        ) : slots.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Bu gün için uygun saat bulunmuyor.
          </Text>
        ) : (
          <SlotPicker
            slots={slots}
            selectedStart={selectedSlot?.start ?? null}
            onSelect={(slot) => setSelectedSlot(slot)}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          style={[
            styles.bookButtonWrap,
            { opacity: !selectedService || !selectedSlot || isBooking ? 0.5 : 1 },
          ]}
          disabled={!selectedService || !selectedSlot || isBooking}
          onPress={handleBook}
        >
          <LinearGradient colors={["#6D28D9", "#9333EA"]} style={styles.bookButton}>
            {isBooking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="calendar-outline" size={17} color="#fff" />
                <Text style={styles.bookButtonText}>Randevu Al</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSubtitle: { fontSize: 13, marginTop: 1 },
  content: { padding: 24, paddingTop: 18, paddingBottom: 24, gap: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 16, marginBottom: 10 },
  emptyText: { fontSize: 13, fontStyle: "italic" },
  serviceList: { gap: 10 },
  serviceCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  serviceName: { fontSize: 15, fontWeight: "600" },
  serviceMeta: { fontSize: 12, marginTop: 3 },
  dateRow: { gap: 8, paddingBottom: 4 },
  dateChip: {
    width: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  dateDay: { fontSize: 12, fontWeight: "600" },
  dateNum: { fontSize: 17, fontWeight: "700" },
  footer: { padding: 16, paddingBottom: 28, borderTopWidth: 1 },
  bookButtonWrap: { borderRadius: 14, overflow: "hidden" },
  bookButton: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
