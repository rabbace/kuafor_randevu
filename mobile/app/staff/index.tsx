import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

export default function StaffScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);
  const isSalonOwner = user?.role === "salon_owner";

  const [salonId, setSalonId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ barberId: string; name: string } | null>(null);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!user?.id || !isSalonOwner) return;
    loadData();
  }, [user?.id, isSalonOwner]);

  async function loadData() {
    setIsLoading(true);
    try {
      // Salon sahibinin salonunu bul
      const { data: barberRow } = await supabase
        .from("barbers")
        .select("id, salon_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!barberRow?.salon_id) {
        setIsLoading(false);
        return;
      }
      setSalonId(barberRow.salon_id);

      // Bu salondaki çalışanları getir (salon sahibinin kendisi hariç)
      const { data: staffRows } = await supabase
        .from("barbers")
        .select("id, user_id, users(full_name, phone)")
        .eq("salon_id", barberRow.salon_id)
        .neq("user_id", user!.id);

      const mapped: StaffMember[] = ((staffRows ?? []) as any[]).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        full_name: r.users?.full_name ?? null,
        phone: r.users?.phone ?? null,
        email: null,
      }));
      setStaff(mapped);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchEmail.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    setSearchError("");

    try {
      // users tablosunda bu e-postayı ara (auth.users ile join yok, phone veya full_name arayalım)
      // Önce auth_id üzerinden e-posta ile eşleşen kullanıcıyı bul
      // Supabase'de anon key ile auth.users'a erişilemez, bu yüzden
      // kullanıcıdan e-posta yerine telefon numarasıyla arama yapıyoruz
      const { data: userRows } = await supabase
        .from("users")
        .select("id, full_name, role")
        .eq("phone", searchEmail.trim())
        .maybeSingle();

      if (!userRows) {
        setSearchError("Bu telefon numarasıyla kayıtlı berber bulunamadı.");
        return;
      }
      if (userRows.role !== "barber") {
        setSearchError("Bu kullanıcı berber rolüne sahip değil.");
        return;
      }

      const { data: barberRow } = await supabase
        .from("barbers")
        .select("id, salon_id")
        .eq("user_id", userRows.id)
        .maybeSingle();

      if (!barberRow) {
        setSearchError("Bu kullanıcının berber profili henüz oluşturulmamış.");
        return;
      }
      if (barberRow.salon_id && barberRow.salon_id !== salonId) {
        setSearchError("Bu berber başka bir salona kayıtlı.");
        return;
      }
      if (barberRow.salon_id === salonId) {
        setSearchError("Bu berber zaten salona kayıtlı.");
        return;
      }

      setSearchResult({ barberId: barberRow.id, name: userRows.full_name ?? "İsimsiz" });
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAdd() {
    if (!searchResult || !salonId) return;
    const { error } = await supabase
      .from("barbers")
      .update({ salon_id: salonId })
      .eq("id", searchResult.barberId);

    if (error) {
      Alert.alert("Hata", "Çalışan eklenirken bir sorun oluştu.");
      return;
    }
    setSearchResult(null);
    setSearchEmail("");
    loadData();
    Alert.alert("Eklendi", `${searchResult.name} salonunuza eklendi.`);
  }

  async function handleRemove(member: StaffMember) {
    Alert.alert(
      "Çalışanı Çıkar",
      `${member.full_name ?? "Bu çalışanı"} salondan çıkarmak istediğine emin misin?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkar",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("barbers")
              .update({ salon_id: null })
              .eq("id", member.id);
            if (error) {
              Alert.alert("Hata", "İşlem sırasında bir sorun oluştu.");
              return;
            }
            setStaff((prev) => prev.filter((m) => m.id !== member.id));
          },
        },
      ]
    );
  }

  if (!isSalonOwner) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: true, title: "Çalışanları Yönet" }} />
        <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Bu sayfa yalnızca salon sahipleri içindir.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Çalışanları Yönet" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>

        {/* Arama kartı */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Çalışan Ekle</Text>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Uygulamaya kayıtlı berber rolündeki kullanıcıyı telefon numarasıyla ara.
          </Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, flex: 1 }]}
              value={searchEmail}
              onChangeText={(t) => { setSearchEmail(t); setSearchResult(null); setSearchError(""); }}
              placeholder="Telefon numarası (05xx...)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
            <Pressable
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
              disabled={isSearching}
            >
              {isSearching
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="search-outline" size={20} color="#fff" />}
            </Pressable>
          </View>

          {searchError ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{searchError}</Text>
          ) : null}

          {searchResult ? (
            <View style={[styles.resultRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
              <Text style={[{ flex: 1, color: colors.text, fontWeight: "600" }]}>{searchResult.name}</Text>
              <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAdd}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Ekle</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Mevcut çalışanlar */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Mevcut Çalışanlar</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : staff.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Henüz çalışan eklenmemiş.
            </Text>
          ) : (
            staff.map((member) => (
              <View
                key={member.id}
                style={[styles.memberRow, { borderColor: colors.border }]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 16 }}>
                    {(member.full_name ?? "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
                    {member.full_name ?? "İsimsiz"}
                  </Text>
                  {member.phone ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{member.phone}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => handleRemove(member)}
                  style={[styles.removeButton, { borderColor: colors.danger }]}
                >
                  <Ionicons name="person-remove-outline" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 17 },
  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  searchButton: { width: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 13 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  addButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, paddingTop: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  removeButton: { borderWidth: 1, borderRadius: 8, padding: 8 },
  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 8 },
});
