import { View, Text, StyleSheet } from "react-native";

export default function DiscoverScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yakınındaki Salonlar</Text>
      <Text style={styles.subtitle}>
        Cinsiyetine ve konumuna göre filtrelenmiş salon listesi burada gösterilecek.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#666" },
});
