import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ARTICLES, CATEGORY_META, type Article } from "@/content/articles";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

type Filter = "all" | Article["category"];

export default function BlogListScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [filter, setFilter] = useState<Filter>("all");

  const list = filter === "all" ? ARTICLES : ARTICLES.filter((a) => a.category === filter);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "İpuçları & Trendler" }} />
      <FlatList
        data={list}
        keyExtractor={(a) => a.slug}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {(
              [
                { key: "all", label: "Tümü" },
                { key: "erkek", label: "Erkek" },
                { key: "kadın", label: "Kadın" },
                { key: "bakım", label: "Bakım" },
                { key: "trend", label: "Trend" },
              ] as const
            ).map((f) => (
              <Pressable
                key={f.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filter === f.key ? colors.primary : colors.surface,
                    borderColor: filter === f.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={{ color: filter === f.key ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        }
        renderItem={({ item }) => {
          const cat = CATEGORY_META[item.category];
          return (
            <Pressable
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}
              onPress={() => router.push(`/blog/${item.slug}` as never)}
            >
              <LinearGradient colors={item.gradient} style={styles.cardIcon}>
                <Ionicons name={item.icon} size={24} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[styles.catBadge, { backgroundColor: cat.color + "1A" }]}>
                    <Text style={{ color: cat.color, fontSize: 11, fontWeight: "700" }}>{cat.label}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{item.readMinutes} dk okuma</Text>
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.cardSummary, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.summary}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  card: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
  },
  cardIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  catBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  cardTitle: { fontSize: 15, fontWeight: "800", lineHeight: 20 },
  cardSummary: { fontSize: 12.5, lineHeight: 18 },
});
