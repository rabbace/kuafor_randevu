# Güvenlik Kontrol Listesi — Kuaför Randevu

> Kaynak esinlenme: [awesome-security-hardening](https://github.com/decalage2/awesome-security-hardening)
> (sunucu/Linux sıkılaştırma derlemesi). Altyapıyı Supabase yönettiği için oradaki
> OS/SSH/kernel maddeleri bize uygulanmaz; bu dosya, aynı disiplinin **bu yığına**
> (Supabase + Expo + GitHub Actions) uyarlanmış halidir. Self-host'a geçilirse
> (ROADMAP) o repo birincil başvuru olur.

## ✅ Uygulanmış durumda

| Katman | Önlem |
|--------|-------|
| Veritabanı | Tüm tablolarda RLS; çapraz kullanıcı işlemleri security definer RPC'lerle |
| Veritabanı | `loyalty_points` istemciden değiştirilemez (trigger koruması, 0018) |
| Veritabanı | Kampanya hız limiti sunucu tarafında (trigger, 0018) |
| Veritabanı | Randevu çakışması exclusion constraint ile; `total_price >= 0` CHECK |
| Auth | Rol, signUp metadata'sından trigger'la atanır; istemci beyanına güvenilmez |
| Push | Token'lar yalnızca sahibince okunur; kampanya/randevu bildirimi token'ları ilişki-doğrulamalı RPC'lerle |
| Storage | Yalnızca authenticated yazabilir (bucket-geneli policy) |
| CI | Keystore/imza sırları GitHub Secrets'ta; repoda sır yok |
| Yedek | Haftalık otomatik pg_dump (Actions artifact, 90 gün) |

## 🔲 Yayın öncesi yapılacaklar

- [ ] **Google Maps key kısıtla**: paket `com.kuaforrandevu.app` + SHA-1 + yalnızca Maps SDK for Android
- [ ] **Supabase Auth**: Redirect URL allowlist'inde yalnızca `kuaforrandevu://` şemaları kalsın
- [ ] **Google OAuth**: Client secret yalnızca Supabase provider ayarında (asla repoda/istemcide)

## 🔲 Yayın sonrası (ilk ay)

- [ ] Crash/hata raporlama (Sentry) — saldırı denemeleri de burada görünür
- [ ] Supabase Auth loglarını haftalık gözden geçir (başarısız giriş yoğunlukları)
- [ ] `barber_avg_ratings` / `appointment_reminder_targets` view'lerine `security_invoker`
- [ ] Storage policy'lerini yol-tabanlı sahipliğe geri sıkılaştırmayı yeniden dene (0018'deki sürüm; ortamda insert reddi verdiği için bucket-geneline gevşetildi)
- [ ] Bağımlılık taraması: `npm audit` çıktısını ayda bir değerlendir

## 🔲 Ölçek büyüyünce / self-host'a geçişte

- [ ] awesome-security-hardening → Linux/SSH/Docker bölümleri birincil rehber
- [ ] Rate limiting'i API gateway katmanına taşı
- [ ] `total_price` sunucu tarafı yeniden hesap (şu an berber onayı telafi ediyor)
- [ ] Penetrasyon testi (yayınlanan uygulamaya karşı, yetkilendirilmiş)

## Olay müdahale (özet)

1. **Sır sızarsa** (keystore şifresi, API key): Maps key → Google Cloud'dan rotate;
   Supabase anon key → Dashboard'dan rotate + `app.json` güncelle + yeni build;
   keystore → rotate EDİLEMEZ, Play Console "App Signing by Google Play" kurtarma sürecine başvur.
2. **Şüpheli veri değişikliği**: Haftalık yedekten karşılaştır (`db-backup` artifact'ları).
3. **Hesap ele geçirme şüphesi**: Supabase Auth → kullanıcının oturumlarını sonlandır, şifre sıfırlat.
