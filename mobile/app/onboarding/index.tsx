import { useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingSlide, type OnboardingSlideData } from "@/components/onboarding/OnboardingSlide";
import { markOnboardingCompleted } from "@/lib/onboarding";

const SLIDES: OnboardingSlideData[] = [
  {
    key: "1",
    title: "Randevunu Saniyeler İçinde Al",
    description: "Sevdiğin berberi veya kuaförü seç, uygun saati gör, hemen rezervasyon yap.",
    icon: "calendar-outline",
  },
  {
    key: "2",
    title: "Dolu mu? Yedek Listeye Gir",
    description: "İstediğin saat doluysa yedek listeye katıl, iptal olunca anında bildirim al.",
    icon: "notifications-outline",
  },
  {
    key: "3",
    title: "Sadakat Puanı Kazan",
    description: "Her ziyaretinde puan topla, belirli sayıda randevuda ücretsiz hizmetin seni bekliyor.",
    icon: "star-outline",
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  }

  async function handleFinish() {
    await markOnboardingCompleted();
    router.replace("/(auth)/register" as never);
  }

  function handleNext() {
    if (activeIndex === SLIDES.length - 1) {
      handleFinish();
      return;
    }
    listRef.current?.scrollToIndex({ index: activeIndex + 1 });
  }

  return (
    <View style={styles.container}>
      <View style={styles.skipRow}>
        <Pressable onPress={handleFinish}>
          <Text style={styles.skipText}>Atla</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => <OnboardingSlide slide={item} />}
      />

      <View style={styles.dotsContainer}>
        {SLIDES.map((slide, index) => (
          <View
            key={slide.key}
            style={[styles.dot, index === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.nextButtonWrap} onPress={handleNext}>
          <LinearGradient colors={["#6D28D9", "#9333EA"]} style={styles.nextButton}>
            <Text style={styles.nextText}>
              {activeIndex === SLIDES.length - 1 ? "Başla" : "İleri"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  skipRow: { alignItems: "flex-end", paddingHorizontal: 24, paddingTop: 60 },
  skipText: { color: "#999", fontSize: 15, fontWeight: "600" },
  dotsContainer: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ddd" },
  dotActive: { backgroundColor: "#6D28D9", width: 22 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  nextButtonWrap: { borderRadius: 16, overflow: "hidden" },
  nextButton: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
