import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack as ExpoStack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";
import type { GenderType } from "@/types/database";

const GENDER_OPTIONS = [
  { key: "male", label: "Erkek", icon: "man-outline" },
  { key: "female", label: "Kadın", icon: "woman-outline" },
  { key: "other", label: "Belirtmek İstemiyorum", icon: "person-outline" },
] as const;

export default function ProfileEditScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const colors = useThemeStore((s) => s.colors);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string>(user?.gender ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("users")
      .select("phone, gender")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPhone(data.phone ?? "");
          setGender(data.gender ?? "");
        }
      });
  }, [user?.id]);

  async function handleSave() {
    if (!user?.id) return;
    if (!fullName.trim()) {
      Alert.alert("Eksik Bilgi", "Ad soyad boş bırakılamaz.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("users")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        gender: gender || null,
      })
      .eq("id", user.id);
    setIsSaving(false);

    if (error) {
      Alert.alert("Kaydedilemedi", "Bilgiler güncellenirken bir hata oluştu.");
      return;
    }

    const savedGender = (gender === "male" || gender === "female") ? gender as GenderType : null;
    setUser({ ...user, fullName: fullName.trim(), gender: savedGender });
    Alert.alert("Kaydedildi", "Profil bilgilerin güncellendi.", [
      { text: "Tamam", onPress: () => router.back() },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ExpoStack.Screen options={{ headerShown: true, title: "Profili Düzenle" }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Ad Soyad</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Adınızı girin"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Telefon</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="05xx xxx xx xx"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Cinsiyet</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.genderOption,
                  {
                    backgroundColor: gender === opt.key ? colors.primary : colors.background,
                    borderColor: gender === opt.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setGender(opt.key)}
              >
                <Ionicons name={opt.icon as never} size={16} color={gender === opt.key ? "#fff" : colors.textMuted} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: gender === opt.key ? "#fff" : colors.text }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.saveButtonText}>{isSaving ? "Kaydediliyor..." : "Kaydet"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 20 },
  section: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 12 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genderOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  saveButton: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
