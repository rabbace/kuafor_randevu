import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useThemeStore } from "@/store/useThemeStore";
import type { UserRole } from "@/types/database";

export default function RegisterScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    if (!fullName.trim() || !phone.trim() || !email.trim() || !password) {
      Alert.alert("Eksik Bilgi", "Ad Soyad, telefon, e-posta ve şifre alanları zorunludur.");
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error || !data.user) {
      setIsLoading(false);
      Alert.alert("Kayıt Hatası", error?.message ?? "Bilinmeyen bir hata oluştu.");
      return;
    }

    const { error: profileError } = await supabase
      .from("users")
      .update({ full_name: fullName.trim(), phone: phone.trim(), role })
      .eq("auth_id", data.user.id);

    setIsLoading(false);

    if (profileError) {
      Alert.alert("Profil Hatası", profileError.message);
      return;
    }

    router.replace("/(tabs)" as never);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: colors.text }]}>Hesap Oluştur</Text>

      <View style={styles.roleRow}>
        <RoleOption label="Müşteri" active={role === "customer"} colors={colors} onPress={() => setRole("customer")} />
        <RoleOption label="Berber" active={role === "barber"} colors={colors} onPress={() => setRole("barber")} />
      </View>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Ad Soyad"
        placeholderTextColor={colors.textMuted}
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Telefon Numarası"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="E-posta"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Şifre"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        <Text style={styles.primaryButtonText}>{isLoading ? "Kaydediliyor..." : "Kayıt Ol"}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={[styles.loginLink, { color: colors.textMuted }]}>Zaten hesabın var mı? Giriş yap</Text>
      </Pressable>
    </ScrollView>
  );
}

function RoleOption({
  label,
  active,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  colors: ReturnType<typeof useThemeStore.getState>["colors"];
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.roleOption,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  roleOption: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  loginLink: { textAlign: "center", marginTop: 16 },
});
