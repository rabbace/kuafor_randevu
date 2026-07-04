import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { BarberDashboard } from "@/components/dashboard/BarberDashboard";
import { ContactButtons } from "@/components/contact/ContactButtons";
import { generateDailySlots } from "@/lib/slotCalculator";
import type { Appointment, Barber, Salon, Service } from "@/types/database";

type BarberWithMeta = Barber & {
  user: { full_name: string | null } | null;
  salon: { name: string; photo_url?: string | null; target_gender?: string | null } | null;
};

type SegmentFilter = "all" | "male" | "female" | "unisex";

const SEGMENT_META: Record<string, { label: string; color: string }> = {
  male: { label: "Erkek", color: "#0369A1" },
  female: { label: "Kadın", color: "#BE123C" },
  unisex: { label: "Unisex", color: "#047857" },
};

type RatingInfo = { avg: number; total: number };

function initialsOf(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatSlotLabel(day: "today" | "tomorrow", slot: Date): string {
  const time = slot.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return day === "today" ? `Bugün ${time}'da müsait` : `Yarın ${time}'da müsait`;
}

/** İki koordinat arası kuş uçuşu mesafe (km) — Haversine formülü. */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const isBarber = user?.role === "barber" || user?.role === "salon_owner";

  if (isBarber) {
    return <BarberDashboard />;
  }
  return <DiscoverScreen />;
}

function DiscoverScreen() {
  const colors = useThemeStore((s) => s.colors);
  const user = useAuthStore((s) => s.user);
  const isCustomer = user?.role === "customer";
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [barbers, setBarbers] = useState<BarberWithMeta[]>([]);
  const [ratings, setRatings] = useState<Map<string, RatingInfo>>(new Map());
  const [availability, setAvailability] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [myLocation, setMyLocation] = useState<{ lat: number; lon: number } | null>(null);
  // Kullanıcının cinsiyeti biliniyorsa ona uygun segmenti öntanımlı seç.
  const [segment, setSegment] = useState<SegmentFilter>(() =>
    user?.gender === "female" ? "female" : user?.gender === "male" ? "male" : "all"
  );

  useEffect(() => {
    supabase
      .from("barbers")
      .select("*, user:users!barbers_user_id_fkey(full_name), salon:salons(name, photo_url, target_gender)")
      .eq("is_active", true)
      .then(({ data }) => {
        setBarbers((data ?? []) as unknown as BarberWithMeta[]);
        setIsLoading(false);
      });
  }, []);

  // Konum izni iste; verilirse berberleri yakınlığa göre sırala.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Location = require("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setMyLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        }
      } catch {
        // Konum alınamazsa liste sıralamasız devam eder.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Favori berberleri yükle.
  useEffect(() => {
    if (!user?.id || !isCustomer) return;
    supabase
      .from("favorite_barbers")
      .select("barber_id")
      .eq("customer_id", user.id)
      .then(({ data }) => {
        if (data) setFavorites(new Set((data as { barber_id: string }[]).map((r) => r.barber_id)));
      });
  }, [user?.id, isCustomer]);

  async function toggleFavorite(barberId: string) {
    if (!user?.id) return;
    const isFav = favorites.has(barberId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(barberId);
      else next.add(barberId);
      return next;
    });
    const { error } = isFav
      ? await supabase.from("favorite_barbers").delete().eq("customer_id", user.id).eq("barber_id", barberId)
      : await supabase.from("favorite_barbers").insert({ customer_id: user.id, barber_id: barberId });
    if (error) {
      // Geri al.
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(barberId);
        else next.delete(barberId);
        return next;
      });
    }
  }

  // Puanları ikincil olarak yükle (view henüz oluşturulmamış olabilir).
  useEffect(() => {
    if (barbers.length === 0) return;
    let cancelled = false;
    async function loadRatings() {
      try {
        const { data, error } = await supabase
          .from("barber_avg_ratings")
          .select("barber_id, avg_rating, total_ratings")
          .in("barber_id", barbers.map((b) => b.id));
        if (error || !data || cancelled) return;
        const map = new Map<string, RatingInfo>();
        for (const row of data as { barber_id: string; avg_rating: number; total_ratings: number }[]) {
          map.set(row.barber_id, { avg: Number(row.avg_rating), total: Number(row.total_ratings) });
        }
        setRatings(map);
      } catch {
        // View henüz yoksa sessizce geç.
      }
    }
    loadRatings();
    return () => {
      cancelled = true;
    };
  }, [barbers]);

  // Müsaitlik bilgisini ikincil olarak yükle.
  useEffect(() => {
    if (barbers.length === 0) return;
    let cancelled = false;

    async function computeForBarber(
      barber: BarberWithMeta,
      salonsById: Map<string, Salon>,
      servicesBySalon: Map<string, Service[]>,
      schedulesByBarber: Map<string, { day_of_week: number; start_time: string; end_time: string; is_off: boolean }[]>,
      appointmentsByBarber: Map<string, Appointment[]>
    ): Promise<string> {
      const salon = salonsById.get(barber.salon_id);
      if (!salon) return "Bu hafta müsait değil";

      const salonServices = servicesBySalon.get(barber.salon_id) ?? [];
      const shortest =
        salonServices.length > 0
          ? salonServices.reduce((a, b) => (a.base_duration_minutes <= b.base_duration_minutes ? a : b))
          : ({
              id: "default",
              salon_id: barber.salon_id,
              name: "Varsayılan",
              base_duration_minutes: 30,
              price: 0,
            } as Service);

      const now = new Date();
      const days: { key: "today" | "tomorrow"; date: Date }[] = [
        { key: "today", date: startOfDay(now) },
        { key: "tomorrow", date: startOfDay(new Date(now.getTime() + 86_400_000)) },
      ];

      const schedules = schedulesByBarber.get(barber.id) ?? [];
      const appts = appointmentsByBarber.get(barber.id) ?? [];

      for (const { key, date } of days) {
        const schedule = schedules.find((s) => s.day_of_week === date.getDay());
        if (schedule?.is_off) continue;

        const dayEnd = new Date(date.getTime() + 86_400_000);
        const dayAppts = appts.filter((a) => {
          const t = new Date(a.start_time);
          return t >= date && t < dayEnd;
        });

        const slots = generateDailySlots({
          date,
          salon,
          barber,
          services: [shortest],
          existingAppointments: dayAppts,
          barberWorkingHours: schedule ? { start: schedule.start_time, end: schedule.end_time } : null,
        });

        const firstFree = slots.find((s) => s.isAvailable && s.start > now);
        if (firstFree) return formatSlotLabel(key, firstFree.start);
      }
      return "Bu hafta müsait değil";
    }

    async function loadAvailability() {
      try {
        const barberIds = barbers.map((b) => b.id);
        const salonIds = [...new Set(barbers.map((b) => b.salon_id))];
        const todayStart = startOfDay(new Date());
        const rangeEnd = new Date(todayStart.getTime() + 2 * 86_400_000);

        const [salonsRes, servicesRes, schedulesRes, apptsRes] = await Promise.all([
          supabase.from("salons").select("*").in("id", salonIds),
          supabase.from("services").select("*").in("salon_id", salonIds).eq("is_active", true),
          supabase.from("barber_schedules").select("*").in("barber_id", barberIds),
          supabase
            .from("appointments")
            .select("*")
            .in("barber_id", barberIds)
            .in("status", ["pending", "confirmed"])
            .gte("start_time", todayStart.toISOString())
            .lt("start_time", rangeEnd.toISOString()),
        ]);

        if (cancelled) return;

        const salonsById = new Map<string, Salon>();
        for (const s of (salonsRes.data ?? []) as Salon[]) salonsById.set(s.id, s);

        const servicesBySalon = new Map<string, Service[]>();
        for (const s of (servicesRes.data ?? []) as Service[]) {
          const arr = servicesBySalon.get(s.salon_id) ?? [];
          arr.push(s);
          servicesBySalon.set(s.salon_id, arr);
        }

        const schedulesByBarber = new Map<
          string,
          { day_of_week: number; start_time: string; end_time: string; is_off: boolean }[]
        >();
        for (const row of (schedulesRes.data ?? []) as {
          barber_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_off: boolean;
        }[]) {
          const arr = schedulesByBarber.get(row.barber_id) ?? [];
          arr.push(row);
          schedulesByBarber.set(row.barber_id, arr);
        }

        const appointmentsByBarber = new Map<string, Appointment[]>();
        for (const a of (apptsRes.data ?? []) as Appointment[]) {
          const arr = appointmentsByBarber.get(a.barber_id) ?? [];
          arr.push(a);
          appointmentsByBarber.set(a.barber_id, arr);
        }

        const entries = await Promise.all(
          barbers.map(async (b) => {
            const label = await computeForBarber(
              b,
              salonsById,
              servicesBySalon,
              schedulesByBarber,
              appointmentsByBarber
            );
            return [b.id, label] as const;
          })
        );
        if (!cancelled) setAvailability(new Map(entries));
      } catch {
        // Müsaitlik hesaplanamazsa kartlar bilgisiz kalır.
      }
    }

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [barbers]);

  // Mesafeleri hesapla (konum izni verildiyse).
  const distances = useMemo(() => {
    const map = new Map<string, number>();
    if (!myLocation) return map;
    for (const b of barbers) {
      if (b.latitude != null && b.longitude != null) {
        map.set(b.id, distanceKm(myLocation.lat, myLocation.lon, b.latitude, b.longitude));
      }
    }
    return map;
  }, [barbers, myLocation]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    let list = !q
      ? [...barbers]
      : barbers.filter((b) => {
          const haystack = `${b.user?.full_name ?? ""} ${b.salon?.name ?? ""} ${b.address ?? ""}`.toLocaleLowerCase("tr-TR");
          return haystack.includes(q);
        });
    // Segment filtresi: unisex salonlar erkek/kadın filtresinde de görünür.
    if (segment !== "all") {
      list = list.filter((b) => {
        const t = b.salon?.target_gender ?? "unisex";
        return segment === "unisex" ? t === "unisex" : t === segment || t === "unisex";
      });
    }
    // Yakın berberler önce; konumu olmayanlar listenin sonunda.
    if (distances.size > 0) {
      list.sort((a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity));
    }
    return list;
  }, [barbers, query, distances, segment]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingTop: 16, gap: 16 }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Yakınındaki berberleri keşfet, saniyeler içinde randevunu al.
            </Text>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Salon, kuaför veya adres ara"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable hitSlop={8} onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            <View style={styles.segmentRow}>
              {(
                [
                  { key: "all", label: "Tümü" },
                  { key: "male", label: "Erkek" },
                  { key: "female", label: "Kadın" },
                  { key: "unisex", label: "Unisex" },
                ] as const
              ).map((s) => (
                <Pressable
                  key={s.key}
                  style={[
                    styles.segmentChip,
                    {
                      backgroundColor: segment === s.key ? colors.primary : colors.surface,
                      borderColor: segment === s.key ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSegment(s.key)}
                >
                  <Text
                    style={{
                      color: segment === s.key ? "#fff" : colors.text,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const rating = ratings.get(item.id);
          const availabilityLabel = availability.get(item.id);
          const distance = distances.get(item.id);
          return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {isCustomer && (
                <Pressable
                  hitSlop={10}
                  style={styles.favoriteButton}
                  onPress={() => toggleFavorite(item.id)}
                >
                  <Ionicons
                    name={favorites.has(item.id) ? "heart" : "heart-outline"}
                    size={22}
                    color={favorites.has(item.id) ? "#EF4444" : colors.textMuted}
                  />
                </Pressable>
              )}
              <View style={[styles.headerRow, isCustomer && { paddingRight: 28 }]}>
                {item.salon?.photo_url ? (
                  <Image source={{ uri: item.salon.photo_url }} style={styles.salonPhoto} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.primary + "1A" }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {initialsOf(item.user?.full_name)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{item.user?.full_name ?? "Uzman"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {item.salon?.name && (
                      <Text style={[styles.salon, { color: colors.textMuted }]}>{item.salon.name}</Text>
                    )}
                    {item.salon?.target_gender && SEGMENT_META[item.salon.target_gender] && (
                      <View
                        style={[
                          styles.segmentBadge,
                          { backgroundColor: SEGMENT_META[item.salon.target_gender].color + "1A" },
                        ]}
                      >
                        <Text
                          style={{
                            color: SEGMENT_META[item.salon.target_gender].color,
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {SEGMENT_META[item.salon.target_gender].label}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {rating && rating.total > 0 ? (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={15} color="#F59E0B" />
                    <Text style={[styles.ratingText, { color: colors.text }]}>{rating.avg.toFixed(1)}</Text>
                  </View>
                ) : (
                  <View style={[styles.newBadge, { backgroundColor: colors.primary + "1A" }]}>
                    <Text style={[styles.newBadgeText, { color: colors.primary }]}>Yeni</Text>
                  </View>
                )}
              </View>

              {(item.address || distance != null) && (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                  {distance != null && (
                    <View style={[styles.distanceBadge, { backgroundColor: colors.primary + "1A" }]}>
                      <Text style={[styles.distanceText, { color: colors.primary }]}>
                        {formatDistance(distance)}
                      </Text>
                    </View>
                  )}
                  {item.address ? (
                    <Text style={[styles.address, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  ) : null}
                </View>
              )}

              {availabilityLabel && (
                <View style={styles.addressRow}>
                  <Ionicons name="time-outline" size={15} color={colors.primary} />
                  <Text style={[styles.availabilityText, { color: colors.primary }]}>{availabilityLabel}</Text>
                </View>
              )}

              {item.latitude && item.longitude && (
                <MapView
                  style={styles.map}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pointerEvents="none"
                  initialRegion={{
                    latitude: item.latitude,
                    longitude: item.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                >
                  <Marker coordinate={{ latitude: item.latitude, longitude: item.longitude }} />
                </MapView>
              )}

              <ContactButtons phone={item.whatsapp_phone} />

              <Pressable
                style={[styles.bookButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/booking/${item.id}` as never)}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primaryText} />
                <Text style={[styles.bookText, { color: colors.primaryText }]}>Randevu Al</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "14" }]}>
              <Ionicons name={query ? "search-outline" : "cut-outline"} size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {query ? "Sonuç bulunamadı" : "Henüz berber yok"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {query
                ? "Farklı bir arama terimi dene."
                : "Konum bilgisi paylaşan berberler burada görünecek."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listHeader: { gap: 14, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  favoriteButton: { position: "absolute", top: 14, right: 14, zIndex: 2 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "700", fontSize: 16 },
  salonPhoto: { width: 50, height: 50, borderRadius: 8 },
  name: { fontSize: 17, fontWeight: "700" },
  salon: { fontSize: 13, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 14, fontWeight: "700" },
  newBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  newBadgeText: { fontSize: 12, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  address: { fontSize: 13, flex: 1 },
  distanceBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  distanceText: { fontSize: 12, fontWeight: "700" },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  segmentChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
  segmentBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  availabilityText: { fontSize: 13, fontWeight: "600", flex: 1 },
  map: { width: "100%", height: 140, borderRadius: 14, marginTop: 2 },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 2,
  },
  bookText: { fontSize: 14, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingTop: 72, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 4 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19, paddingHorizontal: 24 },
});
