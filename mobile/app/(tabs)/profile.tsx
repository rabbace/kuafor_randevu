import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, type LatLng } from "react-native-maps";
import { supabase } from "@/lib/supabase";
import { registerForPushNotificationsAsync } from "@/lib/pushNotifications";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";
import type { Barber, Service } from "@/types/database";

const DEFAULT_REGION = { latitude: 41.0082, longitude: 28.9784 }; // İstanbul

const ROLE_LABELS: Record<string, string> = {
  customer: "Müşteri",
  barber: "Berber",
  salon_owner: "Salon Sahibi",
};

function initialsOf(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const colors = useThemeStore((s) => s.colors);
  const setMode = useThemeStore((s) => s.setMode);
  const mode = useThemeStore((s) => s.mode);
  // salon_owner da salon sahibi bir berberdir; aynı yönetim arayüzünü görür.
  const isBarberRole = user?.role === "barber" || user?.role === "salon_owner";

  const [barber, setBarber] = useState<Barber | null>(null);
  const [barberChecked, setBarberChecked] = useState(false);
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [position, setPosition] = useState<LatLng>(DEFAULT_REGION);
  const [isSaving, setIsSaving] = useState(false);

  // Salon kurulum (onboarding)
  const [salonName, setSalonName] = useState("");
  const [salonPhone, setSalonPhone] = useState("");
  const [salonDescription, setSalonDescription] = useState("");
  const [isCreatingSalon, setIsCreatingSalon] = useState(false);

  // Hizmet yönetimi
  const [services, setServices] = useState<Service[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [isAddingService, setIsAddingService] = useState(false);

  useEffect(() => {
    if (user?.id) registerForPushNotificationsAsync(user.id);
  }, [user?.id]);

  const loadServices = useCallback(async (salonId: string) => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("salon_id", salonId)
      .eq("is_active", true)
      .order("name");
    setServices((data as Service[]) ?? []);
  }, []);

  useEffect(() => {
    if (!user?.id || !isBarberRole) return;

    supabase
      .from("barbers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setBarberChecked(true);
        if (!data) return;
        setBarber(data as Barber);
        setAddress(data.address ?? "");
        setWhatsapp(data.whatsapp_phone ?? "");
        if (data.latitude && data.longitude) {
          setPosition({ latitude: data.latitude, longitude: data.longitude });
        }
        loadServices(data.salon_id);
      });
  }, [user?.id, user?.role, loadServices]);

  async function handleCreateSalon() {
    if (!user?.id) return;
    if (!salonName.trim()) {
      Alert.alert("Eksik Bilgi", "Salon adı zorunludur.");
      return;
    }

    setIsCreatingSalon(true);

    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .insert({
        name: salonName.trim(),
        owner_id: user.id,
        phone: salonPhone.trim() || null,
        description: salonDescription.trim() || null,
      })
      .select()
      .single();

    if (salonError || !salon) {
      setIsCreatingSalon(false);
      Alert.alert("Salon Oluşturulamadı", "Salon kaydedilirken bir hata oluştu. Lütfen tekrar dene.");
      return;
    }

    const { data: newBarber, error: barberError } = await supabase
      .from("barbers")
      .insert({
        salon_id: salon.id,
        user_id: user.id,
        title: "Berber",
        speed_multiplier: 1.0,
      })
      .select()
      .single();

    setIsCreatingSalon(false);

    if (barberError || !newBarber) {
      Alert.alert("Berber Profili Oluşturulamadı", "Berber profili kaydedilirken bir hata oluştu. Lütfen tekrar dene.");
      return;
    }

    setBarber(newBarber as Barber);
    loadServices(salon.id);
    Alert.alert("Salon Hazır", "Salonun oluşturuldu. Şimdi hizmetlerini ekleyebilirsin.");
  }

  async function handleAddService() {
    if (!barber) return;
    const duration = parseInt(serviceDuration, 10);
    const price = parseFloat(servicePrice.replace(",", "."));

    if (!serviceName.trim()) {
      Alert.alert("Eksik Bilgi", "Hizmet adı zorunludur.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      Alert.alert("Geçersiz Süre", "Süreyi dakika cinsinden gir (örn. 30).");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert("Geçersiz Fiyat", "Geçerli bir fiyat gir (örn. 250).");
      return;
    }

    setIsAddingService(true);
    const { error } = await supabase.from("services").insert({
      salon_id: barber.salon_id,
      name: serviceName.trim(),
      base_duration_minutes: duration,
      price,
    });
    setIsAddingService(false);

    if (error) {
      Alert.alert("Hizmet Eklenemedi", "Hizmet kaydedilirken bir hata oluştu. Lütfen tekrar dene.");
      return;
    }

    setServiceName("");
    setServiceDuration("");
    setServicePrice("");
    loadServices(barber.salon_id);
  }

  function handleDeleteService(service: Service) {
    Alert.alert("Hizmeti Sil", `"${service.name}" hizmetini silmek istediğine emin misin?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("services").update({ is_active: false }).eq("id", service.id);
          if (error) {
            Alert.alert("Silinemedi", "Hizmet silinirken bir hata oluştu. Lütfen tekrar dene.");
            return;
          }
          setServices((prev) => prev.filter((s) => s.id !== service.id));
        },
      },
    ]);
  }

  async function handleSaveLocation() {
    if (!barber) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("barbers")
      .update({
        address: address.trim(),
        whatsapp_phone: whatsapp.trim(),
        latitude: position.latitude,
        longitude: position.longitude,
      })
      .eq("id", barber.id);
    setIsSaving(false);

    if (error) {
      Alert.alert("Kaydedilemedi", "Adres ve konum bilgisi kaydedilirken bir hata oluştu.");
      return;
    }
    Alert.alert("Kaydedildi", "Adres ve konum bilgin güncellendi.");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    signOut();
    router.replace("/(auth)/login" as never);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initialsOf(user?.fullName)}</Text>
        </View>
        <View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.fullName ?? "Misafir"}</Text>
          {user?.role && (
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + "1A" }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>{ROLE_LABELS[user.role] ?? user.role}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.surface }, cardShadow]}>
        <Ionicons name="star" size={20} color="#F59E0B" />
        <View>
          <Text style={[styles.statValue, { color: colors.text }]}>{user?.loyaltyPoints ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sadakat Puanı</Text>
        </View>
      </View>

      <View>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Görünüm</Text>
        <View style={styles.themeRow}>
          {(
            [
              { key: "light", label: "Açık", icon: "sunny-outline" },
              { key: "dark", label: "Karanlık", icon: "moon-outline" },
              { key: "system", label: "Sistem", icon: "phone-portrait-outline" },
            ] as const
          ).map((m) => (
            <Pressable
              key={m.key}
              style={[
                styles.themeOption,
                {
                  backgroundColor: mode === m.key ? colors.primary : colors.surface,
                  borderColor: mode === m.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setMode(m.key)}
            >
              <Ionicons name={m.icon} size={16} color={mode === m.key ? "#fff" : colors.textMuted} />
              <Text style={{ color: mode === m.key ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isBarberRole && barberChecked && !barber && (
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }, cardShadow]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Salonunu Kur</Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            Müşterilerin seni bulabilmesi için önce salonunu oluştur. Sonrasında hizmetlerini ve konumunu
            ekleyebilirsin.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Salon adı *"
            placeholderTextColor={colors.textMuted}
            value={salonName}
            onChangeText={setSalonName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Telefon"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={salonPhone}
            onChangeText={setSalonPhone}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Açıklama (opsiyonel)"
            placeholderTextColor={colors.textMuted}
            multiline
            value={salonDescription}
            onChangeText={setSalonDescription}
          />

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isCreatingSalon ? 0.7 : 1 }]}
            onPress={handleCreateSalon}
            disabled={isCreatingSalon}
          >
            <Text style={styles.primaryButtonText}>{isCreatingSalon ? "Oluşturuluyor..." : "Salon Oluştur"}</Text>
          </Pressable>
        </View>
      )}

      {isBarberRole && barber && (
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }, cardShadow]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cut-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hizmetler</Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            Müşterilerin randevu alırken göreceği hizmetleri buradan yönetebilirsin.
          </Text>

          {services.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz hizmet eklemedin.</Text>
          )}

          {services.map((service) => (
            <View
              key={service.id}
              style={[styles.serviceRow, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
                <Text style={[styles.serviceMeta, { color: colors.textMuted }]}>
                  {service.base_duration_minutes} dk · {service.price} ₺
                </Text>
              </View>
              <Pressable hitSlop={8} onPress={() => handleDeleteService(service)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>Hizmet Ekle</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Hizmet adı (örn. Saç Kesimi)"
            placeholderTextColor={colors.textMuted}
            value={serviceName}
            onChangeText={setServiceName}
          />
          <View style={styles.serviceInputRow}>
            <TextInput
              style={[
                styles.input,
                { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Süre (dk)"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={serviceDuration}
              onChangeText={setServiceDuration}
            />
            <TextInput
              style={[
                styles.input,
                { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Fiyat (₺)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={servicePrice}
              onChangeText={setServicePrice}
            />
          </View>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isAddingService ? 0.7 : 1 }]}
            onPress={handleAddService}
            disabled={isAddingService}
          >
            <Text style={styles.primaryButtonText}>{isAddingService ? "Ekleniyor..." : "Ekle"}</Text>
          </Pressable>
        </View>
      )}

      {isBarberRole && barber && (
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }, cardShadow]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Adres ve Konum</Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            Haritada konumunu sürükleyerek ayarlayabilirsin. Müşteriler bu konumu görecek.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Adres"
            placeholderTextColor={colors.textMuted}
            value={address}
            onChangeText={setAddress}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="WhatsApp Numarası"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={whatsapp}
            onChangeText={setWhatsapp}
          />

          <MapView
            style={styles.map}
            initialRegion={{
              latitude: position.latitude,
              longitude: position.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={(e) => setPosition(e.nativeEvent.coordinate)}
          >
            <Marker coordinate={position} draggable onDragEnd={(e) => setPosition(e.nativeEvent.coordinate)} />
          </MapView>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveLocation}
            disabled={isSaving}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? "Kaydediliyor..." : "Konumu Kaydet"}</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={[styles.signOutButton, { borderColor: colors.border }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={[styles.signOutText, { color: colors.danger }]}>Çıkış Yap</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 20 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 20 },
  name: { fontSize: 20, fontWeight: "700" },
  roleBadge: { marginTop: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  roleText: { fontSize: 12, fontWeight: "700" },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  themeRow: { flexDirection: "row", gap: 8 },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionHint: { fontSize: 13, lineHeight: 18 },
  subSectionTitle: { fontSize: 14, fontWeight: "700", marginTop: 6 },
  emptyText: { fontSize: 13, fontStyle: "italic" },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  serviceName: { fontSize: 14, fontWeight: "600" },
  serviceMeta: { fontSize: 12, marginTop: 2 },
  serviceInputRow: { flexDirection: "row", gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  map: { width: "100%", height: 200, borderRadius: 14 },
  primaryButton: { borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  signOutButton: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: { fontWeight: "600" },
});
