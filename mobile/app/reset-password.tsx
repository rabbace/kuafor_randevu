import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

export default function ResetPasswordScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (password.length < 6) {
      Alert.alert("Geçersiz Şifre", "Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Eşleşmiyor", "Şifreler birbiriyle aynı değil.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (error) {
      Alert.alert(
        "Değiştirilemedi",
        /session/i.test(error.message)
          ? "Oturum bulunamadı. E-postadaki sıfırlama bağlantısına yeniden tıkla."
          : "Şifre güncellenirken bir hata oluştu. Lütfen tekrar dene."
      );
      return;
    }

    Alert.alert("Şifre Güncellendi", "Yeni şifrenle giriş yapabilirsin.", [
      { text: "Tamam", onPress: () => router.replace("/(tabs)" as never) },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Yeni Şifre Belirle" }} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "14" }]}>
          <Ionicons name="key-outline" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Yeni şifreni belirle</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Hesabın için yeni bir şifre oluştur. En az 6 karakter olmalı.
        </Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="Yeni şifre"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="Yeni şifre (tekrar)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>{isSaving ? "Kaydediliyor..." : "Şifreyi Güncelle"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 12 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  hint: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  button: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
