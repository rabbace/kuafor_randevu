# Google Play Store Yayın Kontrol Listesi

## 1. Supabase Dashboard (supabase.com → projen → SQL Editor)

### Migration'ları Çalıştır
```sql
-- Önce 0006'yı çalıştır:
-- supabase/migrations/0006_appointments_update_check.sql içeriğini yapıştır

-- Sonra 0007'yi çalıştır:
-- supabase/migrations/0007_ratings.sql içeriğini yapıştır
```

### Auth Ayarları
`Authentication → Settings`:
- [ ] **Email Confirmations → Kapat** (ya da SMTP kur)

`Authentication → URL Configuration`:
- [ ] Site URL: `kuaforrandevu://`
- [ ] Redirect URLs: `kuaforrandevu://login` ekle

---

## 2. Google Cloud Console (console.cloud.google.com)

- [ ] Yeni proje oluştur veya mevcut projeye git
- [ ] Maps SDK for Android → etkinleştir → API key al
- [ ] Maps SDK for iOS → etkinleştir → API key al
- [ ] `mobile/app.json` içindeki `YOUR_ANDROID_GOOGLE_MAPS_API_KEY` ve `YOUR_IOS_GOOGLE_MAPS_API_KEY` değerlerini güncelle

---

## 3. Android Keystore Oluştur (SADECE BİR KEZ)

```bash
# macOS / Linux terminalde:
bash scripts/generate-keystore.sh

# Üretilen .keystore dosyasını iCloud / harici disk'e yedekle
# BU DOSYAYI KAYBEDERSEN PLAY STORE GÜNCELLEMESİ YAPAMAZSIN!
```

### GitHub Secrets'a Ekle
`GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret`

| Secret Adı | Değer |
|------------ |-------|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i kuafor-randevu-release.keystore` çıktısı |
| `ANDROID_KEY_ALIAS` | `kuafor-randevu-key` |
| `ANDROID_KEY_PASSWORD` | Keystore'u oluştururken girdiğin şifre |
| `ANDROID_STORE_PASSWORD` | Keystore'u oluştururken girdiğin şifre |

---

## 4. AAB Build Al

`GitHub → Actions → Build Android AAB (Play Store) → Run workflow`

~15 dakika sonra Artifacts bölümünden `kuafor-randevu-release-aab` indir.

---

## 5. Google Play Console (play.google.com/console)

### Uygulama Oluştur
- [ ] "Uygulama oluştur" → Kuaför Randevu
- [ ] Dil: Türkçe, Kategori: Yaşam Tarzı
- [ ] Ücretsiz / Ücretli: Ücretsiz

### Store Listing
- [ ] Türkçe açıklama: `store-listing/tr.md` içeriğini kullan
- [ ] İngilizce açıklama: `store-listing/en.md` içeriğini kullan
- [ ] 8 ekran görüntüsü (telefon): 16:9 veya 9:16 PNG/JPG
- [ ] Özellikli grafik (Feature graphic): 1024×500 px
- [ ] Uygulama ikonu: `mobile/assets/icon.png` (1024×1024)
- [ ] Gizlilik politikası URL: `https://[web-domainin]/privacy`

### İçerik Derecelendirmesi
- [ ] Anketi doldur → "Herkes için" çıkacak

### Veri Güvenliği Formu
Topladığın veriler:
- [ ] Ad/soyad → ✓ topluyor
- [ ] E-posta → ✓ topluyor
- [ ] Telefon → ✓ topluyor
- [ ] Konum (yaklaşık) → ✓ isteğe bağlı
- [ ] Uygulama aktivitesi (randevular) → ✓ topluyor

### AAB Yükleme
- [ ] Production → Sürüm oluştur → AAB yükle
- [ ] Sürüm notları: "İlk sürüm"

### İncelemeye Gönder
- [ ] Tüm alanlar dolu mu kontrol et
- [ ] "İncelemeye gönder" → 1-3 gün sürer

---

## 6. Web Deploy (Vercel / Netlify)

Gizlilik politikası sayfasının yayında olması gerekiyor:
- [ ] `web/` klasörünü Vercel/Netlify'a deploy et
- [ ] `https://[domain]/privacy` URL'ini Play Console'a gir

---

## AdMob Production (İsteğe Bağlı — Sonradan)

`mobile/src/lib/ads.ts` içindeki test ID'lerini production ID'lerle değiştir:
- AdMob hesabı oluştur → admob.google.com
- Android uygulama ekle → App ID al → `app.json`'a yaz
- Reklam birimi oluştur → Banner ID al → `ads.ts`'e yaz

---

## SMTP (Supabase Email — Sonradan)

`Supabase → Settings → Auth → SMTP`:
- Resend.com (ücretsiz 100 email/gün) veya SendGrid kullan
- Email onayını aç, özel domain ile gönder

---

## Özet Sıralama

```
1. Supabase migration + auth ayarları    (~30 dk)
2. Google Maps API key                   (~15 dk)
3. Keystore oluştur + GitHub secrets     (~20 dk)
4. AAB build al (GitHub Actions)         (~15 dk)
5. Web deploy (gizlilik politikası)      (~30 dk)
6. Play Console store listing            (~60 dk)
7. İncelemeye gönder → bekle             (1-3 gün)
```
