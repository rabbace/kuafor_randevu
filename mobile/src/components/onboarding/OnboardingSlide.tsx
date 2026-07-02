import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "@/store/useThemeStore";

export interface OnboardingSlideData {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function OnboardingSlide({ slide }: { slide: OnboardingSlideData }) {
  const { width } = useWindowDimensions();
  const colors = useThemeStore((s) => s.colors);

  return (
    <View style={[styles.container, { width }]}>
      <View style={[styles.iconGlow, { backgroundColor: colors.primary + "14" }]}>
        <LinearGradient colors={["#6D28D9", "#9333EA"]} style={styles.iconCircle}>
          <Ionicons name={slide.icon} size={64} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>{slide.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  iconGlow: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  iconCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 14, lineHeight: 34 },
  description: { fontSize: 15, textAlign: "center", lineHeight: 23, paddingHorizontal: 12 },
});
