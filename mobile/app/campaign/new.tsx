import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

type Target = "favorites" | "all_customers";

const PRESETS = [
  "Kurban Bayramı öncesi doluyuz, randevunuzu erkenden alın! 🐑",
  "Ramazan Bayramı traşları başladı, slot kalmadan yerinizi alın! ✂️",
  "Yılbaşı öncesi yoğunluk dönemi, bugün randevu alın! 🎉",
  "Özel kampanya: bu hafta %10 indirim! 🎁",
];

export default function NewCampaignScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);
  const isBarber = user?.role === "barber" || user?.role === "salon_owner";

  const [barberId, setBarberId] = useState<string | null>(null);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<Target>("favorites");
  const [isSending, setIsSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id || !isBarber) return;
    supabase
      .from("barbers")
      .select("id, salon_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBarberId(data.id);
          setSalonId(data.salon_id);
        }
      });
  }, [user?.id, isBarber]);

  // Hedef değişince alıcı sayısını önizle
  useEffect(() => {
    if (!barberId) return;
    setRecipientCount(null);
    fetchRecipientTokens().then((tokens) => setRecipientCount(tokens.length));
  }, [barberId, target]);

  async function fetchRecipientTokens(): Promise<string[]> {
    if (!barberId) return [];
    let customerIds: string[] = [];

    if (target === "favorites") {
      const { data } = await supabase
        .from("favorite_barbers")
        .select("customer_id")
        .eq("barber_id", barberId);
      customerIds = ((data as { customer_id: string }[]) ?? []).map((r) => r.customer_id);
    } else {
      const { data } = await supabase
        .from("appointments")
        .select("customer_id")
        .eq("barber_id", barberId)
        .not("customer_id", "is", null);
      customerIds = [
        ...new Set(((data as { customer_id: string }[]) ?? []).map((r) => r.customer_id)),
      ];
    }

    if (customerIds.length === 0) return [];

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .in("user_id", customerIds);
    return [...new Set(((tokens as { token: string }[]) ?? []).map((r) => r.token))];
  }

  async function handleSend() {
    if (!barberId || !salonId) return;
    if (!title.trim()) {
      Alert.alert("Eksik Bilgi", "Bildirim başlığı zorunludur.");
      return;
    }
    if (!message.trim()) {
      Alert.alert("Eksik Bilgi", "Bildirim mesajı zorunludur.");
      return;
    }

    // Rate limiting: son 7 günde max 2 kampanya, aralarında min 48 saat
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentCampaigns } = await supabase
      .from("campaigns")
      .select("sent_at")
      .eq("salon_id", salonId)
      .gte("sent_at", sevenDaysAgo)
      .order("sent_at", { ascending: false });

    if (recentCampaigns && recentCampaigns.length >= 2) {
      Alert.alert(
        "Gönderim Limiti",
        "7 gün içinde en fazla 2 kampanya gönderebilirsin. Müşteri deneyimini korumak için bu limit uygulanmaktadır."
      );
      return;
    }

    if (recentCampaigns && recentCampaigns.length > 0) {
      const lastSent = new Date(recentCampaigns[0].sent_at as string);
      const hoursSinceLast = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < 48) {
        const hoursLeft = Math.ceil(48 - hoursSinceLast);
        Alert.alert(
          "Çok Erken",
          `Son kampanyanın üzerinden ${hoursLeft} saat daha geçmesi gerekiyor. Müşteriler çok sık bildirim almaktan rahatsız olur.`
        );
        return;
      }
    }

    setIsSending(true);
    try {
      const { error: insertError } = await supabase.from("campaigns").insert({
        salon_id: salonId,
        title: title.trim(),
        message: message.trim(),
        target,
        sent_at: new Date().toISOString(),
      });
      if (insertError) {
        Alert.alert("Gönderilemedi", "Kampanya kaydedilirken bir hata oluştu.");
        return;
      }

      const tokens = await fetchRecipientTokens();
      if (tokens.length === 0) {
        Alert.alert(
          "Alıcı Yok",
          target === "favorites"
            ? "Seni favorilerine ekleyen ve bildirime açık müşteri bulunamadı."
            : "Bildirime açık geçmiş müşteri bulunamadı."
        );
        return;
      }

      const messages = tokens.map((token) => ({
        to: token,
        title: title.trim(),
        body: message.trim(),
        sound: "default",
      }));

      for (let i = 0; i < messages.length; i += 100) {
        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(messages.slice(i, i + 100)),
        });
        if (!res.ok) {
          console.warn("Expo push API error", res.status);
        }
      }

      Alert.alert("Gönderildi", `${tokens.length} kişiye bildirim gönderildi`);
      setTitle("");
      setMessage("");
    } catch {
      Alert.alert("Hata", "Bildirim gönderilirken bir hata oluştu. Lütfen tekrar dene.");
    } finally {
      setIsSending(false);
    }
  }

  if (!isBarber) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: true, title: "Bildirim Gönder" }} />
        <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Bu sayfa yalnızca berberler içindir.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Bildirim Gönder" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Kampanya</Text>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Müşterilerine özel kampanya veya duyuru bildirimi gönder.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>Başlık</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Örn. Özel Kampanya"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.text }]}>Mesaj</Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder="Bildirim mesajını yaz..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: colors.text }]}>Hedef Kitle</Text>
          <View style={styles.targetRow}>
            {(
              [
                { key: "favorites", label: "Favori müşteriler" },
                { key: "all_customers", label: "Tüm geçmiş müşteriler" },
              ] as const
            ).map((t) => (
              <Pressable
                key={t.key}
                style={[
                  styles.targetOption,
                  {
                    backgroundColor: target === t.key ? colors.primary : colors.background,
                    borderColor: target === t.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTarget(t.key)}
              >
                <Text
                  style={{
                    color: target === t.key ? "#fff" : colors.text,
                    fontWeight: "600",
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Yoğunluk Dönemi Şablonları</Text>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Hazır şablona dokunarak mesaj alanını doldur.
          </Text>
          {PRESETS.map((preset) => (
            <Pressable
              key={preset}
              style={[styles.presetButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setMessage(preset)}
            >
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>{preset}</Text>
            </Pressable>
          ))}
        </View>

        {recipientCount !== null && (
          <View style={[styles.recipientInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>
              Bu bildirim <Text style={{ color: colors.primary }}>{recipientCount} kişiye</Text> gidecek
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.sendButton, { backgroundColor: colors.primary, opacity: isSending || !barberId ? 0.7 : 1 }]}
          onPress={handleSend}
          disabled={isSending || !barberId}
        >
          <Ionicons name="send-outline" size={18} color="#fff" />
          <Text style={styles.sendText}>{isSending ? "Gönderiliyor..." : "Gönder"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  infoText: { fontSize: 14, textAlign: "center" },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  hint: { fontSize: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  multiline: { minHeight: 90 },
  targetRow: { flexDirection: "row", gap: 8 },
  targetOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  presetButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  recipientInfo: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  sendButton: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
