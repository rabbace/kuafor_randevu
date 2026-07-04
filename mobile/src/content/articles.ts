import type { Ionicons } from "@expo/vector-icons";

export interface ArticleSection {
  heading: string;
  body: string;
}

export interface Article {
  slug: string;
  title: string;
  summary: string;
  category: "erkek" | "kadın" | "bakım" | "trend";
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  readMinutes: number;
  sections: ArticleSection[];
}

export const ARTICLES: Article[] = [
  {
    slug: "yuz-tipine-gore-kesim",
    title: "Yüz Tipine Göre Doğru Kesimi Seçmek",
    summary: "Aynada gördüğün yüz şekli, sana en çok yakışacak kesimin haritasıdır. İşte adım adım rehber.",
    category: "erkek",
    icon: "cut-outline",
    gradient: ["#6D28D9", "#9333EA"],
    readMinutes: 4,
    sections: [
      {
        heading: "Yüz tipini nasıl anlarsın?",
        body: "Saçını geriye topla ve aynaya bak. Alın, elmacık kemikleri ve çene hattından hangisi en geniş? Yüz uzunluğun genişliğine oranla ne kadar fazla? Genişlikler birbirine yakın ve hatlar yumuşaksa oval; yanaklar dolgunsa yuvarlak; çene köşeliyse kare; yüz belirgin uzunsa uzun; alın geniş çene sivriyse kalp; elmacıklar baskınsa elmas yüzlüsün.",
      },
      {
        heading: "Temel kural: dengele, kopyalama",
        body: "İyi bir kesim, yüzünün en güçlü hattını sahiplenir ve zayıf kalan bölgeyi dengeler. Yuvarlak yüzde amaç dikey uzunluk kazandırmak, uzun yüzde ise tam tersi: yanlara hacim verip yüzü kısaltmak. Sosyal medyada beğendiğin kesim, o modelin yüz tipinde çalışıyor — senin tipinde aynı sonucu vermeyebilir.",
      },
      {
        heading: "Berberine ne söylemelisin?",
        body: "\"Şu fotoğraftaki gibi olsun\" yerine \"yüzümü daha uzun/dar göstermek istiyorum\" de. Hedefi söylersen berberin senin yüz tipine göre tekniği uyarlar. Uygulamadaki Stil Rehberi'nden yüz tipine uygun önerileri seçip randevu notuna yazman da işi kolaylaştırır.",
      },
      {
        heading: "Kesimden sonrası",
        body: "Her kesim ilk gün en iyi halinde değildir; 3-4 gün sonra oturur. Kesimin formunu koruması ortalama 3-4 haftadır — takvimine bir sonraki randevuyu şimdiden ekle, sadakat puanı da birikir.",
      },
    ],
  },
  {
    slug: "sakal-tasarim-rehberi",
    title: "Sakal Tasarımı: Yüzüne Göre Doğru Form",
    summary: "Sakal, yüz hatlarını yeniden çizebilen tek araçtır. Doğru formu bulmanın yolları.",
    category: "erkek",
    icon: "man-outline",
    gradient: ["#0369A1", "#0EA5E9"],
    readMinutes: 3,
    sections: [
      {
        heading: "Sakal ne işe yarar?",
        body: "Sakal sadece stil değil, geometri aracıdır: dar çeneye kütle katar (kalp yüz), yuvarlak yüze köşe çizer, uzun yüzü yatay çizgilerle böler. Yüz tipine ters düşen sakal ise tam tersini yapar — bu yüzden \"herkese yakışan sakal\" yoktur.",
      },
      {
        heading: "Hangi yüze hangi sakal?",
        body: "Yuvarlak yüz: keçi sakal veya köşeli hatlı kısa sakal, çeneyi uzatır. Kare yüz: hafif yuvarlatılmış formlar köşeleri yumuşatır. Uzun yüz: dolgun yanlı kısa sakal genişlik katar; uzun sivri sakaldan kaçın. Kalp/elmas yüz: alt kısmı dolgun tam sakal dar çeneyi dengeler.",
      },
      {
        heading: "Bakım olmadan tasarım olmaz",
        body: "En iyi tasarım bile bakımsız kalınca dağılır. Haftada 2-3 kez sakal yağı, düzenli yıkama ve 2-3 haftada bir profesyonel hat düzeltmesi formu korur. Boyun çizgisini kendin alırken çok yukarı çıkma — en sık yapılan hata budur; çizgi âdem elmasının bir parmak üstünde bitmeli.",
      },
    ],
  },
  {
    slug: "kadin-kesim-katman-rehberi",
    title: "Katman, Kahkül, Bob: Hangisi Sana Göre?",
    summary: "Kadın kesimlerinde üç büyük karar ve yüz tipine göre doğru tercih.",
    category: "kadın",
    icon: "woman-outline",
    gradient: ["#BE123C", "#F43F5E"],
    readMinutes: 4,
    sections: [
      {
        heading: "Katman: hareket ve hacim",
        body: "Katmanlı kesim saça hareket katar ve yüz çevresini yumuşatır. Kare ve elmas yüzlerde keskin hatları gölgelemek için ideal. İnce telli saçta az ve uzun katman tercih et; çok katman inceltir. Kalın ve dalgalı saçta katman, hacmi kontrol altına alır.",
      },
      {
        heading: "Kahkül: yüzün çerçevesi",
        body: "Küt kahkül uzun yüzü kısaltır ama yuvarlak yüzü genişletir — orada perde kahkül (curtain bangs) daha güvenli: ortadan ikiye ayrılıp yanlara akar, hemen her yüz tipiyle çalışır. Geniş alnı yumuşatmak isteyen kalp yüzlüler için de ilk tercih.",
      },
      {
        heading: "Bob: cesur ama kurallı",
        body: "Çene hizası küt bob, oval ve kalp yüzde harika durur; yuvarlak ve kare yüzde ise çene hattını vurgular — orada çene altına inen, önü hafif uzun 'lob' daha dengelidir. Düzleştirici kullanmayı sevmiyorsan dalgalı (wavy) bob bakımı en kolay olandır.",
      },
      {
        heading: "Kuaföre giderken",
        body: "İstediğin görselin yanına, saç kalınlığını ve sabah rutinine ayırabileceğin süreyi de söyle. 'Fönsüz de toparlanan bir kesim istiyorum' cümlesi, kuaförünün teknik seçimini tamamen değiştirir.",
      },
    ],
  },
  {
    slug: "sac-bakim-temelleri",
    title: "Saç Bakımının 5 Temel Kuralı",
    summary: "Kesim ne kadar iyi olursa olsun, sağlıksız saçta parlamaz. Evde uygulanabilir temeller.",
    category: "bakım",
    icon: "water-outline",
    gradient: ["#047857", "#10B981"],
    readMinutes: 3,
    sections: [
      {
        heading: "1. Her gün yıkama",
        body: "Saç tipine göre haftada 2-4 yıkama çoğu insan için yeterli. Her gün şampuan, saç derisinin doğal yağını alır ve dengelemek için daha çok yağ üretmesine yol açar.",
      },
      {
        heading: "2. Sıcaklıkla ara",
        body: "Fön ve düzleştiriciyi orta sıcaklıkta kullan, mutlaka ısı koruyucu sprey uygula. Havluyla ovalamak yerine bastırarak kurula — ıslak saç en kırılgan halidir.",
      },
      {
        heading: "3. Saç derisi de cilttir",
        body: "Kepek, kaşıntı veya dökülme artışı varsa kozmetik ürün değiştirerek değil, saç derisine odaklanarak çöz: nazik şampuan, düzenli masaj ve gerekiyorsa dermatolog.",
      },
      {
        heading: "4. Düzenli uç alımı",
        body: "6-8 haftada bir uç alımı kırıkların yukarı ilerlemesini durdurur. 'Uzatıyorum, kestirmem' yaklaşımı uzun vadede daha çok kestirmene sebep olur.",
      },
      {
        heading: "5. İçeriden besle",
        body: "Protein, demir, çinko ve yeterli su — saç görünümünde en az şampuan kadar etkili. Ani dökülmelerde önce kan değerlerini kontrol ettir.",
      },
    ],
  },
  {
    slug: "erkek-sac-trendleri",
    title: "Bu Sezonun Öne Çıkan Erkek Kesimleri",
    summary: "Berber koltuğuna oturmadan önce ilham: şu an en çok istenen 5 stil.",
    category: "trend",
    icon: "trending-up-outline",
    gradient: ["#C2410C", "#F97316"],
    readMinutes: 3,
    sections: [
      {
        heading: "Dokulu Crop",
        body: "Kısa, önü hafif perçemli ve mat dokulu. Bakımı en kolay trend: sabah bir wax dokunuşu yeter. Hemen her yüz tipiyle uyumlu, özellikle oval ve kalp yüzlerde güçlü.",
      },
      {
        heading: "Düşük Fade + Doğal Üst",
        body: "Agresif sıfır çizgiler yerini kulak hizasında başlayan yumuşak geçişlere bıraktı. Üstte makasla bırakılan doğal uzunluk, ofis ortamına da uygun dengeli bir görünüm veriyor.",
      },
      {
        heading: "Orta Uzun Akışkan Saç (Flow)",
        body: "Kulak üstünü örten, geriye doğru akan orta uzunluk. Sabır ister — geçiş dönemi 2-3 ay — ama sonucu karizmatik. Dalgalı saç tellerinde en iyi sonucu verir.",
      },
      {
        heading: "Buzz Cut",
        body: "En minimal seçenek geri döndü. Kare çene hattında ve düzgün kafa yapısında çok güçlü durur; denemeden önce berberinden kafa şekli değerlendirmesi iste.",
      },
      {
        heading: "Mullet'in Yumuşak Hali",
        body: "Önü kısa arkası uzun kesimin abartısız yorumu genç kuşakta popüler. Cesaret ister; ilk kez deneyeceksen makasla, sıfırla değil.",
      },
    ],
  },
  {
    slug: "randevudan-once",
    title: "Randevudan Önce: 5 Dakikalık Hazırlık",
    summary: "Koltuğa hazır oturan müşteri, her zaman daha iyi sonuç alır. Küçük ama etkili hazırlıklar.",
    category: "bakım",
    icon: "checkmark-done-outline",
    gradient: ["#334155", "#64748B"],
    readMinutes: 2,
    sections: [
      {
        heading: "Referans görsel seç",
        body: "Kelimeler herkes için farklı anlam taşır; 'kısa' senin için 3 cm, berberin için 1 cm olabilir. 1-2 fotoğraf her tartışmayı bitirir. Stil Rehberi'nden yüz tipine uygun önerileri de not alabilirsin.",
      },
      {
        heading: "Saçını günlük halinle getir",
        body: "Aşırı wax'lı veya sımsıkı toplanmış saçla gelme; berberin saçın doğal düşüşünü görmesi kesim kalitesini doğrudan etkiler.",
      },
      {
        heading: "Rutinini söyle",
        body: "Sabah 2 dakikan mı var, 20 dakikan mı? Fön kullanır mısın? Bu cevaplar kesim tekniğini belirler. İyi berber saç kesmez, rutinine çözüm tasarlar.",
      },
      {
        heading: "Geç kalma, erken de gelme",
        body: "Randevu sistemli salonlarda 5-10 dakika önce gelmek idealdir. Gecikirsen uygulamadan berberine haber verebilirsin — telefonu ve WhatsApp'ı profilinde.",
      },
    ],
  },
];

export const CATEGORY_META: Record<Article["category"], { label: string; color: string }> = {
  erkek: { label: "Erkek", color: "#0369A1" },
  kadın: { label: "Kadın", color: "#BE123C" },
  bakım: { label: "Bakım", color: "#047857" },
  trend: { label: "Trend", color: "#C2410C" },
};
