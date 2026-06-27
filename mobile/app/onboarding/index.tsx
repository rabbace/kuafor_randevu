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
import { OnboardingSlide, type OnboardingSlideData } from "@/components/onboarding/OnboardingSlide";
import { markOnboardingCompleted } from "@/lib/onboarding";

const SLIDES: OnboardingSlideData[] = [
  {
    key: "1",
    title: "Randevunu Saniyeler İçinde Al",
    description: "Sevdiğin berberi veya kuaförü seç, uygun saati gör, hemen rezervasyon yap.",
    image: require("../../assets/onboarding-1.png"),
  },
  {
    key: "2",
    title: "Dolu mu? Yedek Listeye Gir",
    description: "İstediğin saat doluysa yedek listeye katıl, iptal olunca anında bildirim al.",
    image: require("../../assets/onboarding-2.png"),
  },
  {
    key: "3",
    title: "Sadakat Puanı Kazan",
    description: "Her ziyaretinde puan topla, belirli sayıda randevuda ücretsiz hizmetin seni bekliyor.",
    image: require("../../assets/onboarding-3.png"),
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
    router.replace("/(auth)/login" as never);
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
        <Pressable onPress={handleFinish}>
          <Text style={styles.skipText}>Atla</Text>
        </Pressable>
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>
            {activeIndex === SLIDES.length - 1 ? "Başla" : "İleri"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  dotsContainer: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ddd" },
  dotActive: { backgroundColor: "#6D28D9", width: 20 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  skipText: { color: "#999", fontSize: 15 },
  nextButton: { backgroundColor: "#6D28D9", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  nextText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
