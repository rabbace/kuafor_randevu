import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export interface OnboardingSlideData {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function OnboardingSlide({ slide }: { slide: OnboardingSlideData }) {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width }]}>
      <LinearGradient colors={["#6D28D9", "#9333EA"]} style={styles.iconCircle}>
        <Ionicons name={slide.icon} size={56} color="#fff" />
      </LinearGradient>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.description}>{slide.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 12, color: "#1F2937" },
  description: { fontSize: 15, textAlign: "center", color: "#666", lineHeight: 22, paddingHorizontal: 8 },
});
