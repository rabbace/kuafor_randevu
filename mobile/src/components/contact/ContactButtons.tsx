import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
      <Pressable style={[styles.button, { backgroundColor: "#25D366" }]} onPress={openWhatsApp}>
        <Ionicons name="logo-whatsapp" size={17} color="#fff" />
        <Text style={styles.buttonText}>WhatsApp</Text>
      </Pressable>
      <Pressable
        style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
        onPress={openSms}
      >
        <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
        <Text style={[styles.buttonText, { color: colors.text }]}>SMS Gönder</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  button: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontWeight: "600", color: "#fff", fontSize: 13 },
});
