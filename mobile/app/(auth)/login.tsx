import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useThemeStore } from "@/store/useThemeStore";

export default function LoginScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailLogin() {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (error) {
      Alert.alert("Giriş Hatası", error.message);
      return;
    }
    router.replace("/(tabs)" as never);
  }

  async function handleOAuthLogin(provider: "google" | "apple") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: "kuaforrandevu://auth-callback" },
    });
    if (error) Alert.alert("Giriş Hatası", error.message);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Giriş Yap</Text>

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

      <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleEmailLogin} disabled={isLoading}>
        <Text style={styles.primaryButtonText}>{isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}</Text>
      </Pressable>

      <Pressable style={[styles.oauthButton, { borderColor: colors.border }]} onPress={() => handleOAuthLogin("google")}>
        <Text style={[styles.oauthText, { color: colors.text }]}>Google ile Giriş Yap</Text>
      </Pressable>
      <Pressable style={[styles.oauthButton, { borderColor: colors.border }]} onPress={() => handleOAuthLogin("apple")}>
        <Text style={[styles.oauthText, { color: colors.text }]}>Apple ile Giriş Yap</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/(auth)/register" as never)}>
        <Text style={[styles.registerLink, { color: colors.textMuted }]}>Hesabın yok mu? Kayıt ol</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  oauthButton: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  oauthText: { fontWeight: "500" },
  registerLink: { textAlign: "center", marginTop: 16 },
});
