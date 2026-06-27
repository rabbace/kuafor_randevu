import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";

export interface OnboardingSlideData {
  key: string;
  title: string;
  description: string;
  image: ReturnType<typeof require>;
}

export function OnboardingSlide({ slide }: { slide: OnboardingSlideData }) {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width }]}>
      <Image source={slide.image} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.description}>{slide.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  image: { width: "80%", height: 280, marginBottom: 32 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  description: { fontSize: 15, textAlign: "center", color: "#666", lineHeight: 22 },
});
