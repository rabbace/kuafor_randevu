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

interface SalonDiscount {
  day_of_week: number;
  start_time: string;
  end_time: string;
  discount_percent: number;
}

/** Slot başlangıcı bir indirim penceresine düşüyorsa yüzdesini döner. */
function discountForSlot(discounts: SalonDiscount[], slotStart: Date): number {
  const day = slotStart.getDay();
  const minutes = slotStart.getHours() * 60 + slotStart.getMinutes();
  let best = 0;
  for (const d of discounts) {
    if (d.day_of_week !== day) continue;
    const [sh, sm] = d.start_time.split(":").map(Number);
    const [eh, em] = d.end_time.split(":").map(Number);
    if (minutes >= sh * 60 + sm && minutes < eh * 60 + em) {
      best = Math.max(best, d.discount_percent);
    }
  }
  return best;
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
  const [staffList, setStaffList] = useState<BarberWithMeta[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const [discounts, setDiscounts] = useState<SalonDiscount[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [usePoints, setUsePoints] = useState(false);

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices]
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.base_duration_minutes, 0),
    [selectedServices]
  );

  function toggleService(service: Service) {
    setSelectedSlot(null);
    setSelectedServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  }

  const loyaltyPoints = user?.loyaltyPoints ?? 0;
  // Ödülü salon belirler: TL indirim (loyalty_redeem_amount) ya da özel ödül metni.
  const salonLoyalty = salon as (Salon & {
    loyalty_redeem_amount?: number;
    loyalty_reward_type?: "discount" | "custom";
    loyalty_reward_text?: string | null;
  }) | null;
  const rewardType = salonLoyalty?.loyalty_reward_type ?? "discount";
  const rewardText = salonLoyalty?.loyalty_reward_text ?? null;
  // 0 veya negatif tanımlanmışsa varsayılana dön (0'a bölme/sonsuz döngü koruması).
  const rawRedeem = salonLoyalty?.loyalty_redeem_amount ?? 20;
  const redeemValue = rawRedeem > 0 ? rawRedeem : 20;
  // Sakin saat indirimi: seçili slota denk gelen pencere varsa uygulanır.
  const slotDiscountPercent = selectedSlot ? discountForSlot(discounts, selectedSlot.start) : 0;
  const slotDiscountAmount = Math.round((totalPrice * slotDiscountPercent) / 100);
  const priceAfterSlotDiscount = Math.max(0, totalPrice - slotDiscountAmount);

  const { maxDiscount, pointsToRedeem } = useMemo(() => {
    if (priceAfterSlotDiscount === 0) return { maxDiscount: 0, pointsToRedeem: 0 };
    if (rewardType === "custom") {
      // Özel ödül: 100 puan = 1 ödül; fiyat değişmez, ödül notta belirtilir.
      return { maxDiscount: 0, pointsToRedeem: loyaltyPoints >= 100 ? 100 : 0 };
    }
    const availableUnits = Math.floor(loyaltyPoints / 100);
    const neededUnits = Math.ceil(priceAfterSlotDiscount / redeemValue);
    const units = Math.min(availableUnits, neededUnits);
    return {
      maxDiscount: Math.min(units * redeemValue, priceAfterSlotDiscount),
      pointsToRedeem: units * 100,
    };
  }, [loyaltyPoints, priceAfterSlotDiscount, redeemValue, rewardType]);
  const canRedeem =
    loyaltyPoints >= 100 && (rewardType === "custom" ? !!rewardText : maxDiscount > 0);

  // Seçimler değişip puan kullanımı geçersiz kalırsa işareti kaldır
  // (gizli kalan onay kutusuyla puan düşülmesin).
  useEffect(() => {
    if (!canRedeem && usePoints) setUsePoints(false);
  }, [canRedeem, usePoints]);

  const discount = usePoints && rewardType === "discount" ? maxDiscount : 0;
  const finalPrice = Math.max(0, priceAfterSlotDiscount - discount);

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

        const [salonRes, servicesRes, schedulesRes, discountsRes, staffRes] = await Promise.all([
          supabase.from("salons").select("*").eq("id", barberRow.salon_id).maybeSingle(),
          supabase
            .from("services")
            .select("*")
            .eq("salon_id", barberRow.salon_id)
            .eq("is_active", true)
            .order("name"),
          supabase.from("barber_schedules").select("*").eq("barber_id", barberRow.id),
          supabase
            .from("salon_discounts")
            .select("day_of_week, start_time, end_time, discount_percent")
            .eq("salon_id", barberRow.salon_id)
            .eq("is_active", true),
          // Salonun tüm çalışanları: müşteri istediği uzmanı seçebilsin.
          supabase
            .from("barbers")
            .select("*, user:users!barbers_user_id_fkey(full_name)")
            .eq("salon_id", barberRow.salon_id)
            .eq("is_active", true),
        ]);

        setSalon((salonRes.data as Salon) ?? null);
        setServices((servicesRes.data as Service[]) ?? []);
        setSchedules((schedulesRes.data as BarberSchedule[]) ?? []);
        setDiscounts((discountsRes.data as SalonDiscount[]) ?? []);
        setStaffList(((staffRes.data ?? []) as unknown as BarberWithMeta[]));
      } catch {
        Alert.alert("Hata", "Bilgiler yüklenirken bir sorun oluştu.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [barberId]);

  // Müşteri başka bir çalışanı seçince o çalışanın takvimi yüklenir.
  async function switchStaff(staff: BarberWithMeta) {
    if (staff.id === barber?.id) return;
    setSelectedSlot(null);
    setBarber(staff);
    const { data: sched } = await supabase
      .from("barber_schedules")
      .select("*")
      .eq("barber_id", staff.id);
    setSchedules((sched as BarberSchedule[]) ?? []);
  }

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
    if (!salon || !barber || selectedServices.length === 0) return [];

    const schedule = schedules.find((s) => s.day_of_week === selectedDate.getDay());
    if (schedule?.is_off) return [];

    const generated = generateDailySlots({
      date: selectedDate,
      salon,
      barber,
      services: selectedServices,
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
  }, [salon, barber, selectedServices, schedules, selectedDate, appointments]);

  async function handleBook() {
    if (!user?.id) {
      Alert.alert("Giriş Gerekli", "Randevu almak için giriş yapmalısın.");
      return;
    }
    if (!barber || !salon || selectedServices.length === 0 || !selectedSlot) {
      Alert.alert("Eksik Seçim", "Lütfen hizmet, tarih ve saat seç.");
      return;
    }

    setIsBooking(true);
    try {
      // Çoklu hizmette ilk hizmet service_id olur; tamamı notes'a yazılır,
      // end_time toplam süreyi zaten kapsar (araya bekleme girmez).
      const serviceNames = selectedServices.map((s) => s.name).join(" + ");
      const noteParts: string[] = [];
      if (selectedServices.length > 1) noteParts.push(`Hizmetler: ${serviceNames}`);
      if (usePoints && rewardType === "custom" && rewardText) {
        noteParts.push(`Sadakat ödülü: ${rewardText} (100 puan)`);
      }
      const { data: created, error } = await supabase
        .from("appointments")
        .insert({
          salon_id: salon.id,
          barber_id: barber.id,
          service_id: selectedServices[0].id,
          customer_id: user.id,
          start_time: selectedSlot.start.toISOString(),
          end_time: selectedSlot.end.toISOString(),
          total_price: finalPrice,
          notes: noteParts.length > 0 ? noteParts.join(" · ") : null,
          status: "pending",
        })
        .select("id")
        .single();

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

      // Sadakat puanı kullanımı: sunucu tarafında RPC ile işlenir (bakiye
      // kontrolü + puan düşümü, migration 0018). Kazanım, randevu "completed"
      // olduğunda DB trigger tarafından işlenir.
      if (usePoints && canRedeem && pointsToRedeem > 0) {
        try {
          const { data: redeemRes, error: redeemErr } = await supabase.rpc(
            "redeem_loyalty_points",
            {
              p_salon_id: salon.id,
              p_points: pointsToRedeem,
              p_reason:
                rewardType === "custom" && rewardText
                  ? `Ödül kullanıldı: ${rewardText}`
                  : "Randevuda indirim kullanıldı",
              p_appointment_id: created?.id ?? null,
            }
          );
          const redeemOk = !redeemErr && (redeemRes as { ok?: boolean } | null)?.ok === true;
          if (!redeemOk) {
            // Puan düşülemedi: randevu fiyatını indirimsiz tutara geri çek
            // ve kullanıcıyı bilgilendir (indirim uygulanmadı).
            if (discount > 0 && created?.id) {
              await supabase
                .from("appointments")
                .update({ total_price: priceAfterSlotDiscount })
                .eq("id", created.id);
            }
            Alert.alert(
              "Puan Kullanılamadı",
              "Randevun alındı ancak sadakat puanların kullanılamadı; indirim uygulanmadı. Puan bakiyeni kontrol et."
            );
          }
        } catch {
          // Puan işlemi başarısız olsa da randevu akışını bozma.
        }
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
        {staffList.length > 1 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Uzman Seç</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {staffList.map((staff) => {
                const active = staff.id === barber?.id;
                return (
                  <Pressable
                    key={staff.id}
                    style={[
                      styles.staffChip,
                      {
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => switchStaff(staff)}
                  >
                    <View style={[styles.staffAvatar, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.primary + "1A" }]}>
                      <Text style={{ color: active ? "#fff" : colors.primary, fontWeight: "800", fontSize: 13 }}>
                        {(staff.user?.full_name ?? "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                      {staff.user?.full_name ?? "Uzman"}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hizmet Seç</Text>
        {services.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Bu salon henüz hizmet eklememiş.
          </Text>
        ) : (
          <View style={styles.serviceList}>
            <Text style={[styles.multiHint, { color: colors.textMuted }]}>
              Birden fazla hizmet seçebilirsin; işlemler art arda, bekleme olmadan yapılır.
            </Text>
            {services.map((service) => {
              const active = selectedServices.some((s) => s.id === service.id);
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
                  onPress={() => toggleService(service)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons
                      name={active ? "checkbox" : "square-outline"}
                      size={20}
                      color={active ? "#fff" : colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.serviceName, { color: active ? "#fff" : colors.text }]}>
                        {service.name}
                      </Text>
                      <Text style={[styles.serviceMeta, { color: active ? "rgba(255,255,255,0.85)" : colors.textMuted }]}>
                        {service.base_duration_minutes} dk · {service.price} ₺
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
            {selectedServices.length > 1 && (
              <View style={[styles.totalChip, { backgroundColor: colors.primary + "14", borderColor: colors.primary }]}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                  Toplam: {totalDuration} dk · {totalPrice} ₺
                </Text>
              </View>
            )}
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
        {selectedServices.length === 0 ? (
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
            discountFor={(slot) => discountForSlot(discounts, slot.start)}
          />
        )}

        {selectedServices.length > 0 && selectedSlot && canRedeem && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sadakat Puanı</Text>
            <Pressable
              style={[
                styles.loyaltyCard,
                {
                  backgroundColor: usePoints ? colors.primary + "14" : colors.surface,
                  borderColor: usePoints ? colors.primary : colors.border,
                },
                cardShadow,
              ]}
              onPress={() => setUsePoints((v) => !v)}
            >
              <Ionicons
                name={usePoints ? "checkbox" : "square-outline"}
                size={22}
                color={usePoints ? colors.primary : colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.loyaltyTitle, { color: colors.text }]}>
                  {rewardType === "custom"
                    ? `Puanlarımı kullan (100 puan = ${rewardText})`
                    : `Puanlarımı kullan (${pointsToRedeem} puan = ${maxDiscount} TL indirim)`}
                </Text>
                <Text style={[styles.loyaltyHint, { color: colors.textMuted }]}>
                  Mevcut puanın: {loyaltyPoints}
                </Text>
              </View>
            </Pressable>
          </>
        )}

        {selectedServices.length > 0 && selectedSlot && (
          <View style={[styles.priceSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Ödenecek Tutar</Text>
              {slotDiscountPercent > 0 && (
                <Text style={{ color: "#16A34A", fontSize: 12, fontWeight: "700", marginTop: 2 }}>
                  🏷️ Sakin saat indirimi: %{slotDiscountPercent} (−{slotDiscountAmount} ₺)
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {(discount > 0 || slotDiscountAmount > 0) && (
                <Text style={[styles.priceStruck, { color: colors.textMuted }]}>
                  {totalPrice} ₺
                </Text>
              )}
              <Text style={[styles.priceValue, { color: colors.text }]}>{finalPrice} ₺</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          style={[
            styles.bookButtonWrap,
            { opacity: selectedServices.length === 0 || !selectedSlot || isBooking ? 0.5 : 1 },
          ]}
          disabled={selectedServices.length === 0 || !selectedSlot || isBooking}
          onPress={handleBook}
        >
          <LinearGradient colors={colors.gradient} style={styles.bookButton}>
            {isBooking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="calendar-outline" size={17} color="#fff" />
                <Text style={styles.bookButtonText}>
                  {selectedServices.length > 0 && selectedSlot ? `Randevu Al · ${finalPrice} ₺` : "Randevu Al"}
                </Text>
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
  staffChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  staffAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, fontStyle: "italic" },
  serviceList: { gap: 10 },
  multiHint: { fontSize: 12, lineHeight: 17 },
  totalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
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
  loyaltyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  loyaltyTitle: { fontSize: 14, fontWeight: "600" },
  loyaltyHint: { fontSize: 12, marginTop: 2 },
  priceSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  priceLabel: { fontSize: 13, fontWeight: "600" },
  priceStruck: { fontSize: 14, textDecorationLine: "line-through" },
  priceValue: { fontSize: 18, fontWeight: "800" },
});
