import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "@/store/useThemeStore";

export interface OnboardingSlideData {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient?: [string, string];
  badge?: string;
}

export function OnboardingSlide({ slide }: { slide: OnboardingSlideData }) {
  const { width } = useWindowDimensions();
  const colors = useThemeStore((s) => s.colors);
  const grad = slide.gradient ?? (["#6D28D9", "#9333EA"] as [string, string]);

  return (
    <View style={[styles.container, { width }]}>
      <View style={[styles.iconGlow, { backgroundColor: grad[0] + "18" }]}>
        <LinearGradient colors={grad} style={styles.iconCircle}>
          <Ionicons name={slide.icon} size={64} color="#fff" />
        </LinearGradient>
        {slide.badge ? (
          <View style={[styles.badge, { backgroundColor: grad[0] }]}>
            <Text style={styles.badgeText}>{slide.badge}</Text>
          </View>
        ) : null}
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
  badge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 14, lineHeight: 34 },
  description: { fontSize: 15, textAlign: "center", lineHeight: 23, paddingHorizontal: 12 },
});
