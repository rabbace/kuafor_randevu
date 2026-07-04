import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ARTICLES, CATEGORY_META } from "@/content/articles";
import { useThemeStore } from "@/store/useThemeStore";

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useThemeStore((s) => s.colors);

  const article = ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: true, title: "İçerik" }} />
        <Ionicons name="document-outline" size={40} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted }}>İçerik bulunamadı.</Text>
      </View>
    );
  }

  const cat = CATEGORY_META[article.category];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: true, title: "" }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient colors={article.gradient} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name={article.icon} size={30} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>{article.title}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{cat.label}</Text>
            </View>
            <Text style={styles.heroMinutes}>{article.readMinutes} dk okuma</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: 20, gap: 18 }}>
          <Text style={[styles.summary, { color: colors.textMuted }]}>{article.summary}</Text>

          {article.sections.map((section) => (
            <View key={section.heading} style={{ gap: 6 }}>
              <Text style={[styles.heading, { color: colors.text }]}>{section.heading}</Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>{section.body}</Text>
            </View>
          ))}

          <Pressable
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)" as never)}
          >
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={styles.ctaText}>Randevu Al</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  hero: { padding: 24, paddingTop: 20, gap: 12, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 29 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroBadge: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  heroMinutes: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  summary: { fontSize: 15, lineHeight: 22, fontStyle: "italic" },
  heading: { fontSize: 16, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 22 },
  cta: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
