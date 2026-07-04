# Kuaför Randevu — Yol Haritası

## 🎯 Yayın Sonrası Gelir Özellikleri
- [ ] **Öne Çıkan Salon aboneliği** — keşfette üst sıra + "Sponsorlu" rozeti + vurgulu harita pini + büyük fotoğraf kartı. (`salons.featured_until` kolonu + sıralama önceliği). Liste yeterince kalabalıklaşınca aç.
- [ ] **Kampanya kredisi** — bildirim göndermek için kredi satın alma (rate limit'in üzerine ek hak). RevenueCat veya Play Billing.
- [ ] **AdMob gerçek reklam ID'leri** — kullanıcı tabanı oluşunca test ID'leri değiştir.

## 📣 Pazarlama / Dikkat Çekme
- [ ] İlk 10-20 berberi elden onboard et (yüz yüze); "kurucu berber" rozeti ver
- [ ] Berbere özel davet linki: müşterisini uygulamaya çekene puan/rozet
- [ ] Google Play'de ASO: "berber randevu", "kuaför randevu" anahtar kelimeleri açıklamada geçsin (store-listing hazır)
- [ ] Instagram'da önce/sonra kesim fotoğraflarıyla organik içerik; berberlerin kendi hesaplarında "Randevu için uygulamadan" etiketi

## 🔐 Güvenlik / Sağlamlık
- [ ] Kampanya rate limit'ini Edge Function'a taşı (client bypass edilemesin)
- [ ] Supabase SMTP kur (Resend) → e-posta onayını yeniden aç
- [ ] `barber_avg_ratings` ve `appointment_reminder_targets` view'lerine `security_invoker`
- [ ] Sentry veya benzeri crash raporlama ekle
- [ ] Google Maps key'e paket adı + SHA-1 kısıtlaması

## 🎨 Tasarım / UX
- [ ] Boş durum illüstrasyonları (randevu yok, salon yok, arama sonuçsuz)
- [ ] Haptic feedback (randevu onaylanınca titreşim)
- [ ] Skeleton loading (spinner yerine iskelet kartlar)
- [ ] Randevu hatırlatma bildirimi (24 saat + 1 saat önce) — Edge Function cron

## 🖥️ Altyapı / Taşınabilirlik (ücretsiz → kendi sunucusu)
- [x] Tüm şema `supabase/migrations/` altında (0001–0016) — herhangi bir Postgres'e sıfırdan kurulabilir
- [x] Haftalık otomatik DB yedeği workflow'u (`db-backup.yml`) — `SUPABASE_DB_URL` secret'ı ekleyince aktifleşir
- [ ] Dashboard'dan yapılan her manuel ayarı burada belgele:
  - Auth: URL Configuration (site url + redirect'ler), Google provider (client id/secret)
  - Storage: `salon-photos` bucket (public)
- [ ] **Uyarı eşiği:** Supabase free = 500 MB DB, 1 GB storage, 7 gün inaktivitede duraklatma.
  DB 400 MB'ı veya günlük aktif kullanıcı ~1000'i geçince önce **Supabase Pro ($25/ay)** — self-host değil.
- [ ] Self-host ancak çok büyük ölçekte mantıklı (Supabase açık kaynak, Docker ile kurulabilir;
  mobil tarafta değişecek tek şey `app.json` içindeki `supabaseUrl` + `supabaseAnonKey`)
- [ ] Storage taşıma: `salon-photos` S3 uyumlu — rclone ile kopyalanabilir

## 🏷️ Sakin Saat Analizi (Yarı 2 — yayından ~2 ay sonra)
- [x] Yarı 1: Manuel sakin saat indirimi (salon tanımlar, slotlar rozetli görünür) — v1'de var
- [ ] Yarı 2: Randevu geçmişinden gün×saat doluluk analizi; %X altı dolulukta berbere
  "bu aralığa indirim tanımla" önerisi (dashboard kartı + bildirim). Ön koşul: 4-8 hafta gerçek veri.

## 📈 Etki / Ölçüm
- [ ] Basit analitik: kaç randevu, kaç iptal, doluluk oranı (berber dashboard'a haftalık grafik)
- [ ] Müşteri tarafına "en çok gittiğin salon" özeti
- [ ] Berbere aylık e-posta özeti (kazanç, yeni müşteri, puan ortalaması)
