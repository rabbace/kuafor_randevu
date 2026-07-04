import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "@/store/useThemeStore";
import { cardShadow } from "@/theme/shadows";

type Gender = "male" | "female";

interface StyleTip {
  name: string;
  why: string;
}

interface FaceShape {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  traits: string;
  cuts: { male: StyleTip[]; female: StyleTip[] };
  beard?: StyleTip[]; // yalnızca erkek
  avoid: { male: string; female: string };
}

const FACE_SHAPES: FaceShape[] = [
  {
    key: "oval",
    label: "Oval",
    icon: "ellipse-outline",
    traits: "Alın hafif geniş, çene yumuşak hatlı; en dengeli yüz tipi.",
    cuts: {
      male: [
        { name: "Klasik Pompadour", why: "Oval yüz her stili taşır; hacimli üst bölge yüzü daha da dengeler." },
        { name: "Kısa Kenar + Dokulu Üst (Crop)", why: "Modern ve bakımı kolay; yüz hatlarını olduğu gibi gösterir." },
        { name: "Orta Uzun Doğal Taramalı", why: "Yumuşak hatlarla uyumlu, doğal bir görünüm verir." },
      ],
      female: [
        { name: "Uzun Katmanlı Kesim", why: "Oval yüz uzunlukla da kısayla da çalışır; katmanlar hareket katar." },
        { name: "Küt Bob (Çene Hizası)", why: "Çene hattını vurgular, oval yüzde asla sırıtmaz." },
        { name: "Perde Kahkül (Curtain Bangs)", why: "Alnı yumuşatır, her oval yüze oturur." },
      ],
    },
    beard: [
      { name: "Kısa Kirli Sakal", why: "Dengeli yüz hattını bozmadan karakter katar." },
      { name: "Klasik Tam Sakal (Kısa Tutulmuş)", why: "Oval yüz tam sakalı da rahat taşır; hatları netleştirir." },
    ],
    avoid: {
      male: "Yüzü tamamen kapatan çok uzun perçemden kaçın; dengeli hatlarını gizler.",
      female: "Aşırı hacimli, yüzü boğan kabarık modeller dengeni bozabilir.",
    },
  },
  {
    key: "round",
    label: "Yuvarlak",
    icon: "radio-button-off-outline",
    traits: "Yanaklar dolgun, yüz genişliği ve uzunluğu birbirine yakın.",
    cuts: {
      male: [
        { name: "Yüksek Fade + Dik Üst (Quiff)", why: "Üstteki yükseklik yüzü uzatır, yanlardaki kısalık inceltir." },
        { name: "Yan Ayrımlı Klasik", why: "Asimetrik çizgi yuvarlaklığı kırar, keskinlik katar." },
        { name: "Faux Hawk", why: "Ortadaki hacim dikey algı yaratır." },
      ],
      female: [
        { name: "Uzun Düz Katmanlar", why: "Omuz altına inen uzunluk yüzü görsel olarak uzatır." },
        { name: "Asimetrik Uzun Bob", why: "Çeneden uzun köşeli bitiş, yuvarlak hatlara kontrast verir." },
        { name: "Yandan Ayrımlı Dalgalar", why: "Derin yan ayrım yüzü daraltır; dalgalar yanağı gölgeler." },
      ],
    },
    beard: [
      { name: "Keçi Sakal (Goatee) / Van Dyke", why: "Çeneyi uzatır, yüze dikey çizgi ekler." },
      { name: "Köşeli Hatlı Kısa Sakal", why: "Çene hattına olmayan köşeleri sakalla çizersin." },
    ],
    avoid: {
      male: "Yanları hacimli bırakma; yüzü daha da genişletir. Düz küt perçem de aynı etkiyi yapar.",
      female: "Çene hizasında biten küt bob ve tam ortadan ayrım yuvarlaklığı vurgular.",
    },
  },
  {
    key: "square",
    label: "Kare",
    icon: "square-outline",
    traits: "Belirgin, köşeli çene hattı; alın ve çene genişliği yakın.",
    cuts: {
      male: [
        { name: "Buzz Cut / Çok Kısa", why: "Güçlü çene hattını sahiplenir — kare yüzün süper gücü budur." },
        { name: "Crew Cut", why: "Temiz ve maskülen; köşeli hatlarla mükemmel uyum." },
        { name: "Dokulu Fransız Kesim", why: "Üstteki doku sertliği hafifçe yumuşatır." },
      ],
      female: [
        { name: "Yumuşak Dalgalı Lob", why: "Omuz hizası dalgalar köşeli çeneyi yumuşatır." },
        { name: "Uzun Katmanlı + Perde Kahkül", why: "Katmanlar yüz çevresinde yumuşak çerçeve oluşturur." },
        { name: "Yüz Çevresi Katmanları", why: "Çene köşelerini gölgeleyerek hatları inceltir." },
      ],
    },
    beard: [
      { name: "Hafif Uzun Yuvarlatılmış Sakal", why: "Çene köşelerini yumuşatmak istersen ideal." },
      { name: "Sıfıra Yakın Kirli Sakal", why: "Çene hattını gizlemeden dokusunu değiştirir." },
    ],
    avoid: {
      male: "Çene hizasında biten düz kesimler köşeleri daha sert gösterir.",
      female: "Çene hizası küt kesim + düz kahkül kombinasyonu yüzü kutu gibi gösterebilir.",
    },
  },
  {
    key: "oblong",
    label: "Uzun",
    icon: "tablet-portrait-outline",
    traits: "Yüz uzunluğu genişliğinden belirgin fazla; alın yüksek olabilir.",
    cuts: {
      male: [
        { name: "Orta Boy Yanlar + Perçemli Üst", why: "Alna inen perçem yüzü kısaltır; yanlardaki hacim genişlik katar." },
        { name: "Klasik Taper (Fade Değil)", why: "Yanları sıfırlamadan bırakmak yüzü orantılar." },
        { name: "Dağınık Orta Uzun", why: "Yanlara doğru hacim, uzunluk algısını kırar." },
      ],
      female: [
        { name: "Küt Kahkül + Uzun Saç", why: "Kahkül alnı kapatarak yüzü belirgin kısaltır." },
        { name: "Omuz Hizası Dalgalı Kesim", why: "Yanlardaki dalga hacmi genişlik dengesi kurar." },
        { name: "Katmanlı Bob", why: "Yüzün alt üçte birine hacim ekler." },
      ],
    },
    beard: [
      { name: "Dolgun Yanlı Kısa Sakal", why: "Yanaklara dolgunluk katarak yüzü genişletir." },
      { name: "Bıyık + Kısa Sakal Kombinasyonu", why: "Yatay çizgiler uzunluğu böler." },
    ],
    avoid: {
      male: "Üstte aşırı yükseklik (pompadour, dik quiff) yüzü daha da uzatır. Uzun sivri sakal da öyle.",
      female: "Kahkülsüz dümdüz uzun saç, yüz uzunluğunu vurgular.",
    },
  },
  {
    key: "heart",
    label: "Kalp",
    icon: "heart-outline",
    traits: "Alın geniş, çene dar ve sivri; elmacık kemikleri belirgin.",
    cuts: {
      male: [
        { name: "Orta Uzunlukta Yan Taramalı", why: "Alın genişliğini dengeler, dar çeneden dikkati alır." },
        { name: "Dokulu Crop + Hafif Perçem", why: "Alnı kısmen kapatarak oran kurar." },
        { name: "Düşük Fade", why: "Yanları çok inceltmeden toparlar; sivri çeneyi yumuşatır." },
      ],
      female: [
        { name: "Çene Altı Lob", why: "Dar çene çevresine hacim ekleyerek kalp formunu dengeler." },
        { name: "Perde Kahkül + Katman", why: "Geniş alnı yumuşatır, bakışları ortaya çeker." },
        { name: "Dalgalı Orta Boy", why: "Çene hizasındaki dalgalar alt yüzü dolgunlaştırır." },
      ],
    },
    beard: [
      { name: "Tam Sakal (Alt Kısmı Dolgun)", why: "Dar çeneye kütle kazandırır — kalp yüzün en iyi dostu." },
      { name: "Boxed Beard (Köşeli Kısa Sakal)", why: "Çene hattını genişletip dengeler." },
    ],
    avoid: {
      male: "Üstte aşırı hacim + sıfır yanlar alnı daha geniş gösterir.",
      female: "Çok kısa pixie kesimler dar çeneyi vurgulayabilir; yüz çevresi yumuşaklığı koru.",
    },
  },
  {
    key: "diamond",
    label: "Elmas",
    icon: "diamond-outline",
    traits: "Elmacık kemikleri en geniş bölge; alın ve çene dar.",
    cuts: {
      male: [
        { name: "Dokulu Fringe (Perçemli)", why: "Dar alnı kapatarak elmacıkları dengeler." },
        { name: "Orta Boy Yanlar + Doğal Üst", why: "Yanlarda hafif hacim, keskin elmacıkları yumuşatır." },
        { name: "Messy Quiff", why: "Dağınık üst bölge, açısal hatlara doğallık katar." },
      ],
      female: [
        { name: "Çene Hizası Bob + Kahkül", why: "Alnı ve çeneyi dolgunlaştırıp elmacıkları çerçeveler." },
        { name: "Kulak Arkası Uzun Katman", why: "Elmacık altına hacim vererek dengeyi kurar." },
        { name: "Yumuşak Perde Kahkül", why: "Dar alnı görsel olarak genişletir." },
      ],
    },
    beard: [
      { name: "Çeneyi Dolduran Kısa Sakal", why: "Dar çeneye genişlik katar, elmas formu ovale yaklaştırır." },
      { name: "Hafif Favorili Sakal", why: "Elmacık altını doldurarak geçişi yumuşatır." },
    ],
    avoid: {
      male: "Yanları sıfırlamak elmacıkları daha da çıkıntılı gösterir.",
      female: "Elmacık hizasında biten kesimler en geniş noktayı vurgular.",
    },
  },
];

export default function StyleGuideScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [gender, setGender] = useState<Gender>("male");
  const [shapeKey, setShapeKey] = useState("oval");

  const shape = FACE_SHAPES.find((s) => s.key === shapeKey) ?? FACE_SHAPES[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: "Stil Rehberi" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
        <Text style={[styles.intro, { color: colors.textMuted }]}>
          Yüz tipini seç, sana yakışacak kesim ve tasarım fikirlerini gör. Son kararı
          uzmanınla birlikte ver — bu öneriler başlangıç noktası.
        </Text>

        {/* Cinsiyet seçimi */}
        <View style={styles.genderRow}>
          {(
            [
              { key: "male", label: "Erkek", icon: "man-outline" },
              { key: "female", label: "Kadın", icon: "woman-outline" },
            ] as const
          ).map((g) => (
            <Pressable
              key={g.key}
              style={[
                styles.genderChip,
                {
                  backgroundColor: gender === g.key ? colors.primary : colors.surface,
                  borderColor: gender === g.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setGender(g.key)}
            >
              <Ionicons name={g.icon} size={16} color={gender === g.key ? "#fff" : colors.textMuted} />
              <Text style={{ color: gender === g.key ? "#fff" : colors.text, fontWeight: "700", fontSize: 14 }}>
                {g.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Yüz şekli seçimi */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FACE_SHAPES.map((s) => {
            const active = s.key === shapeKey;
            return (
              <Pressable
                key={s.key}
                style={[
                  styles.shapeChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setShapeKey(s.key)}
              >
                <Ionicons name={s.icon} size={20} color={active ? "#fff" : colors.primary} />
                <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Yüz tipi tanımı */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
          <View style={styles.cardHeader}>
            <Ionicons name={shape.icon} size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{shape.label} Yüz</Text>
          </View>
          <Text style={[styles.traits, { color: colors.textMuted }]}>{shape.traits}</Text>
        </View>

        {/* Kesim önerileri */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {gender === "male" ? "Önerilen Saç Kesimleri" : "Önerilen Kesimler"}
        </Text>
        {shape.cuts[gender].map((tip) => (
          <View
            key={tip.name}
            style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}
          >
            <View style={[styles.tipIcon, { backgroundColor: colors.primary + "14" }]}>
              <Ionicons name="cut-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipName, { color: colors.text }]}>{tip.name}</Text>
              <Text style={[styles.tipWhy, { color: colors.textMuted }]}>{tip.why}</Text>
            </View>
          </View>
        ))}

        {/* Sakal önerileri (erkek) */}
        {gender === "male" && shape.beard && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sakal Tasarımı</Text>
            {shape.beard.map((tip) => (
              <View
                key={tip.name}
                style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}
              >
                <View style={[styles.tipIcon, { backgroundColor: colors.primary + "14" }]}>
                  <Ionicons name="man-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tipName, { color: colors.text }]}>{tip.name}</Text>
                  <Text style={[styles.tipWhy, { color: colors.textMuted }]}>{tip.why}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Kaçınılması gerekenler */}
        <View style={[styles.avoidCard, { backgroundColor: "#F59E0B14", borderColor: "#F59E0B55" }]}>
          <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
          <Text style={[styles.avoidText, { color: colors.text }]}>{shape.avoid[gender]}</Text>
        </View>

        {/* CTA */}
        <Pressable
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)" as never)}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.ctaText}>Bu Stil İçin Randevu Al</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  intro: { fontSize: 13, lineHeight: 19 },
  genderRow: { flexDirection: "row", gap: 8 },
  genderChip: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shapeChip: {
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  traits: { fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  tipCard: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: "flex-start" },
  tipIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tipName: { fontSize: 14, fontWeight: "700" },
  tipWhy: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  avoidCard: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: "flex-start" },
  avoidText: { flex: 1, fontSize: 13, lineHeight: 19 },
  ctaButton: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
