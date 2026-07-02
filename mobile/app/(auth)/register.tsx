import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
  const [errors, setErrors] = useState<{
    fullName?: string;
    phone?: string;
    email?: string;
    password?: string;
    form?: string;
  }>({});

  async function handleRegister() {
    const nextErrors: typeof errors = {};
    if (!fullName.trim()) nextErrors.fullName = "Ad soyad zorunludur.";
    if (!phone.trim()) nextErrors.phone = "Telefon numarası zorunludur.";
    if (!email.trim()) nextErrors.email = "E-posta zorunludur.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      nextErrors.email = "Geçerli bir e-posta adresi gir.";
    if (!password) nextErrors.password = "Şifre zorunludur.";
    else if (password.length < 6) nextErrors.password = "Şifre en az 6 karakter olmalıdır.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });

    if (error || !data.user) {
      setIsLoading(false);
      let message = "Kayıt oluşturulamadı. Lütfen tekrar dene.";
      if (error && /already registered|already been registered/i.test(error.message)) {
        message = "Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene.";
      } else if (error && /password/i.test(error.message)) {
        message = "Şifre gereksinimleri karşılanmıyor. Daha güçlü bir şifre dene.";
      }
      setErrors({ form: message });
      return;
    }

    // E-posta doğrulaması gerekiyorsa oturum oluşmaz; RLS nedeniyle aşağıdaki
    // profil güncellemesi hiçbir satırı etkilemeden sessizce geçerdi.
    if (!data.session) {
      setIsLoading(false);
      Alert.alert(
        "E-postanı Doğrula",
        "Hesabını etkinleştirmek için e-postana gönderilen bağlantıya tıkla, ardından giriş yap.",
        [{ text: "Tamam", onPress: () => router.replace("/(auth)/login" as never) }]
      );
      return;
    }

    const { error: profileError } = await supabase
      .from("users")
      .update({ full_name: fullName.trim(), phone: phone.trim(), role })
      .eq("auth_id", data.user.id);

    setIsLoading(false);

    if (profileError) {
      Alert.alert("Profil Hatası", "Profil bilgileri kaydedilemedi. Profil sayfasından tekrar deneyebilirsin.");
      return;
    }

    router.replace("/(tabs)" as never);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={["#6D28D9", "#9333EA"]} style={styles.hero}>
        <View style={styles.logoCircle}>
          <Ionicons name="cut" size={28} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Hesap Oluştur</Text>
        <Text style={styles.heroSubtitle}>Saniyeler içinde berberini bul, randevunu al.</Text>
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
            <View style={styles.roleRow}>
              <RoleOption
                label="Müşteri"
                icon="person-outline"
                active={role === "customer"}
                colors={colors}
                onPress={() => setRole("customer")}
              />
              <RoleOption
                label="Berber"
                icon="cut-outline"
                active={role === "barber"}
                colors={colors}
                onPress={() => setRole("barber")}
              />
            </View>

            <Field icon="person-outline" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Ad Soyad"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={(v) => {
                  setFullName(v);
                  if (errors.fullName) setErrors((e) => ({ ...e, fullName: undefined }));
                }}
              />
            </Field>
            {errors.fullName && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.fullName}</Text>}
            <Field icon="call-outline" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Telefon Numarası"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                }}
              />
            </Field>
            {errors.phone && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.phone}</Text>}
            <Field icon="mail-outline" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="E-posta"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (errors.email || errors.form) setErrors((e) => ({ ...e, email: undefined, form: undefined }));
                }}
              />
            </Field>
            {errors.email && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.email}</Text>}
            <Field icon="lock-closed-outline" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Şifre"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (errors.password || errors.form) setErrors((e) => ({ ...e, password: undefined, form: undefined }));
                }}
              />
            </Field>
            {errors.password && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.password}</Text>}
            {errors.form && (
              <View style={[styles.formErrorBox, { backgroundColor: colors.danger + "14", borderColor: colors.danger + "44" }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={[styles.formErrorText, { color: colors.danger }]}>{errors.form}</Text>
              </View>
            )}

            <Pressable style={styles.primaryButtonWrap} onPress={handleRegister} disabled={isLoading}>
              <LinearGradient colors={["#6D28D9", "#9333EA"]} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{isLoading ? "Kaydediliyor..." : "Kayıt Ol"}</Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => router.push("/(auth)/login" as never)}>
              <Text style={[styles.loginLink, { color: colors.textMuted }]}>
                Zaten hesabın var mı? <Text style={{ color: colors.primary, fontWeight: "700" }}>Giriş yap</Text>
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

function RoleOption({
  label,
  icon,
  active,
  colors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  colors: ReturnType<typeof useThemeStore.getState>["colors"];
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.roleOption,
        {
          backgroundColor: active ? colors.primary : colors.background,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={active ? "#fff" : colors.textMuted} />
      <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 64,
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
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
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
  primaryButtonWrap: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  primaryButton: { paddingVertical: 15, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  loginLink: { textAlign: "center", marginTop: 12, fontSize: 13 },
  errorText: { fontSize: 12, marginTop: -6, marginLeft: 6 },
  formErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formErrorText: { flex: 1, fontSize: 13, fontWeight: "500" },
});
