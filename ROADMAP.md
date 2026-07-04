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

## 📈 Etki / Ölçüm
- [ ] Basit analitik: kaç randevu, kaç iptal, doluluk oranı (berber dashboard'a haftalık grafik)
- [ ] Müşteri tarafına "en çok gittiğin salon" özeti
- [ ] Berbere aylık e-posta özeti (kazanç, yeni müşteri, puan ortalaması)
