import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useThemeStore } from "@/store/useThemeStore";

export default function LoginScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function translateAuthError(message: string): string {
    if (/invalid login credentials/i.test(message)) return "E-posta veya şifre hatalı.";
    if (/email not confirmed/i.test(message)) return "E-posta adresin henüz doğrulanmamış. Lütfen e-postanı kontrol et.";
    if (/network/i.test(message)) return "Bağlantı hatası. İnternet bağlantını kontrol et.";
    return "Giriş yapılamadı. Lütfen bilgilerini kontrol edip tekrar dene.";
  }

  async function handleEmailLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Eksik Bilgi", "E-posta ve şifre alanları zorunludur.");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setIsLoading(false);

    if (error) {
      Alert.alert("Giriş Hatası", translateAuthError(error.message));
      return;
    }
    router.replace("/(tabs)" as never);
  }

  async function handleOAuthLogin(provider: "google" | "apple") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: "kuaforrandevu://auth-callback" },
    });
    if (error) Alert.alert("Giriş Hatası", "Bu yöntemle giriş yapılamadı. Lütfen tekrar dene.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={["#6D28D9", "#9333EA"]} style={styles.hero}>
        <View style={styles.logoCircle}>
          <Ionicons name="cut" size={28} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Tekrar Hoş Geldin</Text>
        <Text style={styles.heroSubtitle}>Randevularına devam etmek için giriş yap.</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Field icon="mail-outline" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="E-posta"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </Field>
            <Field icon="lock-closed-outline" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Şifre"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </Field>

            <Pressable style={styles.primaryButtonWrap} onPress={handleEmailLogin} disabled={isLoading}>
              <LinearGradient colors={["#6D28D9", "#9333EA"]} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}</Text>
              </LinearGradient>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>veya</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            <Pressable
              style={[styles.oauthButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => handleOAuthLogin("google")}
            >
              <Ionicons name="logo-google" size={17} color={colors.text} />
              <Text style={[styles.oauthText, { color: colors.text }]}>Google ile Giriş Yap</Text>
            </Pressable>
            <Pressable
              style={[styles.oauthButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => handleOAuthLogin("apple")}
            >
              <Ionicons name="logo-apple" size={18} color={colors.text} />
              <Text style={[styles.oauthText, { color: colors.text }]}>Apple ile Giriş Yap</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/(auth)/register" as never)}>
              <Text style={[styles.registerLink, { color: colors.textMuted }]}>
                Hesabın yok mu? <Text style={{ color: colors.primary, fontWeight: "700" }}>Kayıt ol</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  icon,
  colors,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useThemeStore.getState>["colors"];
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.field, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 80,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4, textAlign: "center" },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: 0 },
  card: {
    marginTop: -24,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 15 },
  primaryButtonWrap: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  primaryButton: { paddingVertical: 15, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
  oauthButton: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  oauthText: { fontWeight: "600", fontSize: 14 },
  registerLink: { textAlign: "center", marginTop: 8, fontSize: 13 },
});
