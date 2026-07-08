import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";
import { TimeField } from "@/components/TimeField";

const TIME_REGEX = /^([01]?\d|2[0-3]):[0-5]\d$/;

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const len = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(len);
  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = BASE64_CHARS.indexOf(clean[i]);
    const c1 = BASE64_CHARS.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] !== undefined ? BASE64_CHARS.indexOf(clean[i + 2]) : -1;
    const c3 = clean[i + 3] !== undefined ? BASE64_CHARS.indexOf(clean[i + 3]) : -1;
    bytes[byteIndex++] = (c0 << 2) | (c1 >> 4);
    if (c2 >= 0) bytes[byteIndex++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (c3 >= 0) bytes[byteIndex++] = ((c2 & 3) << 6) | c3;
  }
  return bytes.slice(0, byteIndex);
}

export default function SalonEditScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);
  const isOwner = user?.role === "salon_owner";

  const [salonId, setSalonId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetGender, setTargetGender] = useState<"male" | "female" | "unisex">("unisex");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bufferMinutes, setBufferMinutes] = useState("10");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("20:00");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [redeemAmount, setRedeemAmount] = useState("20");
  const [rewardType, setRewardType] = useState<"discount" | "custom">("discount");
  const [rewardText, setRewardText] = useState("");
  const [isTogglingLoyalty, setIsTogglingLoyalty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sakin saat indirimleri
  const [discounts, setDiscounts] = useState<
    { id: string; day_of_week: number; start_time: string; end_time: string; discount_percent: number }[]
  >([]);
  const [discountDay, setDiscountDay] = useState(2); // Salı
  const [discountStart, setDiscountStart] = useState("13:00");
  const [discountEnd, setDiscountEnd] = useState("16:00");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [isAddingDiscount, setIsAddingDiscount] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.id || !isOwner) {
        setIsLoading(false);
        return;
      }
      const { data: salon } = await supabase
        .from("salons")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (salon) {
        setSalonId(salon.id);
        setName(salon.name ?? "");
        setDescription(salon.description ?? "");
        setTargetGender((salon.target_gender as "male" | "female" | "unisex") ?? "unisex");
        setPhone(salon.phone ?? "");
        setAddress(salon.address ?? "");
        setBufferMinutes(String(salon.buffer_time_minutes ?? 10));
        setStartTime(String(salon.start_time ?? "09:00").slice(0, 5));
        setEndTime(String(salon.end_time ?? "20:00").slice(0, 5));
        setPhotoUrl((salon as { photo_url?: string | null }).photo_url ?? null);
        setLoyaltyEnabled((salon as { loyalty_enabled?: boolean }).loyalty_enabled ?? true);
        setRedeemAmount(String((salon as { loyalty_redeem_amount?: number }).loyalty_redeem_amount ?? 20));
        setRewardType(((salon as { loyalty_reward_type?: string }).loyalty_reward_type as "discount" | "custom") ?? "discount");
        setRewardText((salon as { loyalty_reward_text?: string | null }).loyalty_reward_text ?? "");

        const { data: discountRows } = await supabase
          .from("salon_discounts")
          .select("id, day_of_week, start_time, end_time, discount_percent")
          .eq("salon_id", salon.id)
          .eq("is_active", true)
          .order("day_of_week");
        setDiscounts((discountRows as typeof discounts) ?? []);
      }
      setIsLoading(false);
    }
    load();
  }, [user?.id]);

  const DAY_LABELS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

  async function handleAddDiscount() {
    if (!salonId) return;
    const pct = parseInt(discountPercent, 10);
    if (Number.isNaN(pct) || pct < 1 || pct > 90) {
      Alert.alert("Geçersiz Değer", "İndirim yüzdesi 1-90 arasında olmalı.");
      return;
    }
    if (!TIME_REGEX.test(discountStart.trim()) || !TIME_REGEX.test(discountEnd.trim())) {
      Alert.alert("Geçersiz Saat", "Saatleri '13:00' biçiminde gir.");
      return;
    }
    if (discountStart.trim() >= discountEnd.trim()) {
      Alert.alert("Geçersiz Aralık", "Bitiş saati başlangıçtan sonra olmalı.");
      return;
    }

    setIsAddingDiscount(true);
    const { data, error } = await supabase
      .from("salon_discounts")
      .insert({
        salon_id: salonId,
        day_of_week: discountDay,
        start_time: discountStart.trim(),
        end_time: discountEnd.trim(),
        discount_percent: pct,
      })
      .select("id, day_of_week, start_time, end_time, discount_percent")
      .single();
    setIsAddingDiscount(false);

    if (error || !data) {
      Alert.alert("Eklenemedi", "İndirim kaydedilirken bir hata oluştu. Migration 0017 çalıştırıldı mı?");
      return;
    }
    setDiscounts((prev) => [...prev, data as (typeof discounts)[number]]);
  }

  async function handleRemoveDiscount(id: string) {
    const { error } = await supabase.from("salon_discounts").delete().eq("id", id);
    if (error) {
      Alert.alert("Silinemedi", "İndirim silinirken bir hata oluştu.");
      return;
    }
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
  }

  async function handlePickPhoto() {
    if (!salonId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin Gerekli", "Fotoğraf seçmek için galeri izni vermelisin.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setIsUploading(true);
    try {
      const path = `${salonId}/${Date.now()}.jpg`;
      const bytes = base64ToBytes(result.assets[0].base64);

      const { error: uploadError } = await supabase.storage
        .from("salon-photos")
        .upload(path, bytes.buffer as ArrayBuffer, { contentType: "image/jpeg", upsert: true });

      if (uploadError) {
        const bucketMissing = /bucket|not found/i.test(uploadError.message ?? "");
        const noPermission = /security|policy|unauthorized|row-level/i.test(uploadError.message ?? "");
        Alert.alert(
          "Yüklenemedi",
          bucketMissing
            ? "Depolama alanı henüz yapılandırılmamış (salon-photos bucket'ı eksik)."
            : noPermission
              ? "Depolama izni eksik: salon-photos bucket'ına yükleme policy'si tanımlanmalı."
              : `Fotoğraf yüklenirken bir hata oluştu.\n\n${uploadError.message}`
        );
        return;
      }

      const { data: pub } = supabase.storage.from("salon-photos").getPublicUrl(path);
      const url = pub.publicUrl;

      const { error: updateError } = await supabase
        .from("salons")
        .update({ photo_url: url })
        .eq("id", salonId);

      if (updateError) {
        Alert.alert("Kaydedilemedi", "Fotoğraf adresi kaydedilirken bir hata oluştu.");
        return;
      }

      setPhotoUrl(url);
      Alert.alert("Yüklendi", "Salon fotoğrafın güncellendi.");
    } catch {
      Alert.alert("Hata", "Depolama alanı henüz yapılandırılmamış");
    } finally {
      setIsUploading(false);
    }
  }

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
    const redeem = parseInt(redeemAmount, 10);
    if (rewardType === "discount" && (Number.isNaN(redeem) || redeem < 1 || redeem > 10000)) {
      Alert.alert("Geçersiz Değer", "100 puanın TL değeri 1-10000 arasında olmalı.");
      return;
    }
    if (rewardType === "custom" && !rewardText.trim()) {
      Alert.alert("Eksik Bilgi", "Özel ödülün ne olduğunu yaz (örn. 1 sakal tıraşı bedava).");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("salons")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        target_gender: targetGender,
        phone: phone.trim() || null,
        address: address.trim() || null,
        buffer_time_minutes: buffer,
        start_time: startTime.trim(),
        end_time: endTime.trim(),
        loyalty_redeem_amount: rewardType === "discount" ? redeem : undefined,
        loyalty_reward_type: rewardType,
        loyalty_reward_text: rewardType === "custom" ? rewardText.trim() : null,
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
              <Text style={[styles.label, { color: colors.text }]}>Salon Fotoğrafı</Text>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.salonPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.hint, { color: colors.textMuted }]}>Henüz fotoğraf eklenmemiş</Text>
                </View>
              )}
              <Pressable
                style={[styles.photoButton, { borderColor: colors.primary, opacity: isUploading ? 0.6 : 1 }]}
                onPress={handlePickPhoto}
                disabled={isUploading}
              >
                <Ionicons name="camera-outline" size={17} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  {isUploading ? "Yükleniyor..." : "Fotoğraf Seç"}
                </Text>
              </Pressable>
            </View>

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

              <Text style={[styles.label, { color: colors.text }]}>Hedef Kitle</Text>
              <View style={styles.rewardTypeRow}>
                {(
                  [
                    { key: "male", label: "Erkek" },
                    { key: "female", label: "Kadın" },
                    { key: "unisex", label: "Unisex" },
                  ] as const
                ).map((s) => (
                  <Pressable
                    key={s.key}
                    style={[
                      styles.rewardTypeChip,
                      {
                        backgroundColor: targetGender === s.key ? colors.primary : colors.background,
                        borderColor: targetGender === s.key ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setTargetGender(s.key)}
                  >
                    <Text style={{ color: targetGender === s.key ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

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
                <TimeField value={startTime} onChange={setStartTime} style={{ flex: 1 }} />
                <Text style={{ color: colors.textMuted }}>—</Text>
                <TimeField value={endTime} onChange={setEndTime} style={{ flex: 1 }} />
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

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
              <Text style={[styles.label, { color: colors.text }]}>Sadakat Programı</Text>
              <View style={styles.loyaltyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
                    {loyaltyEnabled ? "Sadakat programı açık" : "Sadakat programı kapalı"}
                  </Text>
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    Açıkken müşteriler her randevuda sadakat puanı kazanır.
                  </Text>
                </View>
                <Switch
                  value={loyaltyEnabled}
                  disabled={isTogglingLoyalty}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  onValueChange={async (value) => {
                    if (!salonId) return;
                    setIsTogglingLoyalty(true);
                    const { error } = await supabase
                      .from("salons")
                      .update({ loyalty_enabled: value })
                      .eq("id", salonId);
                    setIsTogglingLoyalty(false);
                    if (error) {
                      Alert.alert("Kaydedilemedi", "Sadakat programı ayarı güncellenirken bir hata oluştu.");
                      return;
                    }
                    setLoyaltyEnabled(value);
                  }}
                />
              </View>

              {loyaltyEnabled && (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>100 Puanın Ödülü</Text>
                  <View style={styles.rewardTypeRow}>
                    {(
                      [
                        { key: "discount", label: "TL İndirim" },
                        { key: "custom", label: "Özel Ödül" },
                      ] as const
                    ).map((t) => (
                      <Pressable
                        key={t.key}
                        style={[
                          styles.rewardTypeChip,
                          {
                            backgroundColor: rewardType === t.key ? colors.primary : colors.background,
                            borderColor: rewardType === t.key ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setRewardType(t.key)}
                      >
                        <Text style={{ color: rewardType === t.key ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                          {t.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {rewardType === "discount" ? (
                    <>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        value={redeemAmount}
                        onChangeText={setRedeemAmount}
                        keyboardType="number-pad"
                        maxLength={5}
                        placeholder="20"
                        placeholderTextColor={colors.textMuted}
                      />
                      <Text style={[styles.hint, { color: colors.textMuted }]}>
                        Müşteri her 100 puanında bu tutar kadar indirim kullanır.
                      </Text>
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        value={rewardText}
                        onChangeText={setRewardText}
                        placeholder="Örn. 1 sakal tıraşı bedava"
                        placeholderTextColor={colors.textMuted}
                        maxLength={80}
                      />
                      <Text style={[styles.hint, { color: colors.textMuted }]}>
                        Serbest yaz: "1 kaş/bıyık alma bedava", "1 yıkama + fön bedava"... Müşteri 100 puanla bu ödülü kullanır.
                      </Text>
                    </>
                  )}
                  <Text style={[styles.hint, { color: colors.textMuted }]}>Kaydet butonuyla kaydedilir.</Text>
                </>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
              <Text style={[styles.label, { color: colors.text }]}>🏷️ Sakin Saat İndirimleri</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Az tercih edilen gün ve saatlere indirim tanımla; müşteriler o saatleri indirimli
                rozetle görür ve boş saatlerin dolar.
              </Text>

              {discounts.map((d) => (
                <View key={d.id} style={[styles.discountRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
                      {DAY_LABELS[d.day_of_week]} · {String(d.start_time).slice(0, 5)}–{String(d.end_time).slice(0, 5)}
                    </Text>
                    <Text style={{ color: "#16A34A", fontSize: 12, fontWeight: "700" }}>%{d.discount_percent} indirim</Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => handleRemoveDiscount(d.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))}

              <Text style={[styles.hint, { color: colors.textMuted, marginTop: 4 }]}>Gün seç:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {DAY_LABELS.map((label, i) => (
                  <Pressable
                    key={label}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: discountDay === i ? colors.primary : colors.background,
                        borderColor: discountDay === i ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setDiscountDay(i)}
                  >
                    <Text style={{ color: discountDay === i ? "#fff" : colors.text, fontSize: 12, fontWeight: "600" }}>
                      {label.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <TimeField value={discountStart} onChange={setDiscountStart} style={{ flex: 1 }} />
                <TimeField value={discountEnd} onChange={setDiscountEnd} style={{ flex: 1 }} />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, width: 70 }]}
                  value={discountPercent}
                  onChangeText={setDiscountPercent}
                  placeholder="%20"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              <Pressable
                style={[styles.saveButton, { backgroundColor: "#16A34A", opacity: isAddingDiscount ? 0.7 : 1 }]}
                onPress={handleAddDiscount}
                disabled={isAddingDiscount}
              >
                <Ionicons name="add-outline" size={18} color="#fff" />
                <Text style={styles.saveText}>{isAddingDiscount ? "Ekleniyor..." : "İndirim Ekle"}</Text>
              </Pressable>
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
  loyaltyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  rewardTypeRow: { flexDirection: "row", gap: 8 },
  discountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  dayChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  rewardTypeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  salonPhoto: { width: "100%", height: 160, borderRadius: 12 },
  photoPlaceholder: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
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
