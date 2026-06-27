import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Giriş Yap</Text>

      <TextInput
        style={styles.input}
        placeholder="E-posta"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.primaryButton} onPress={handleEmailLogin} disabled={isLoading}>
        <Text style={styles.primaryButtonText}>{isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}</Text>
      </Pressable>

      <Pressable style={styles.oauthButton} onPress={() => handleOAuthLogin("google")}>
        <Text style={styles.oauthText}>Google ile Giriş Yap</Text>
      </Pressable>
      <Pressable style={styles.oauthButton} onPress={() => handleOAuthLogin("apple")}>
        <Text style={styles.oauthText}>Apple ile Giriş Yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButton: { backgroundColor: "#6D28D9", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  oauthButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  oauthText: { fontWeight: "500" },
});
