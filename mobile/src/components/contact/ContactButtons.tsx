import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeStore } from "@/store/useThemeStore";

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function ContactButtons({ phone }: { phone: string | null | undefined }) {
  const colors = useThemeStore((s) => s.colors);

  if (!phone) return null;
  const normalized = normalizePhone(phone);

  async function openWhatsApp() {
    const url = `https://wa.me/${normalized.replace(/^\+/, "")}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("WhatsApp açılamadı", "WhatsApp yüklü değil veya numara hatalı.");
      return;
    }
    Linking.openURL(url);
  }

  function openSms() {
    Linking.openURL(`sms:${normalized}`);
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.button, { backgroundColor: "#25D366" }]}
        onPress={openWhatsApp}
      >
        <Text style={styles.buttonText}>WhatsApp'tan Yaz</Text>
      </Pressable>
      <Pressable
        style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
        onPress={openSms}
      >
        <Text style={[styles.buttonText, { color: colors.text }]}>SMS Gönder</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  button: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  buttonText: { fontWeight: "600", color: "#fff" },
});
