# CLAUDE.md — Kuaför Randevu

Berber / kuaför / güzellik salonu randevu uygulaması.
Sahip: tek geliştirici (teknik olmayan), iletişim dili **Türkçe**.

## Mimari

| Katman | Teknoloji | Konum |
|--------|-----------|-------|
| Mobil | Expo SDK 51, Expo Router v3, Zustand, TypeScript | `mobile/` |
| Web (gizlilik/koşullar) | Next.js 14, Tailwind | `web/` |
| Backend | Supabase (Postgres + Auth + Storage + RLS) | `supabase/` |
| CI | GitHub Actions (APK/AAB build, DB yedek) | `.github/workflows/` |

- Supabase proje ref: `frzwlctzomhborhcxukd`
- Android paket: `com.kuaforrandevu.app`, deep link şeması: `kuaforrandevu://`
- EAS projectId ve Maps key `mobile/app.json` içinde

## Komutlar

```bash
# TypeScript kontrolü (her değişiklikten sonra ZORUNLU)
cd mobile && npx tsc --noEmit

# Web kontrolü
cd web && npx tsc --noEmit
```

Test framework'ü YOK; doğrulama = tsc + kullanıcının cihazda manuel testi.

## Kritik İş Akışları

### Veritabanı değişiklikleri
- Her şema değişikliği `supabase/migrations/NNNN_isim.sql` dosyası olarak yazılır (sıradaki numara).
- **Migration'lar otomatik uygulanmaz!** Kullanıcı SQL'i Supabase Dashboard → SQL Editor'a
  yapıştırıp elle çalıştırır. Yeni migration yazınca SQL'i sohbette de paylaş.
- Migration'ları idempotent yaz (`if not exists`, `drop policy if exists`).
- Ortam sandbox'ı dış ağa kapalı: Supabase'e/Expo API'ye buradan doğrudan erişilemez.

### Build & dağıtım
- Kod `claude/beauty-salon-booking-app-ika6rf` branch'inde geliştirilir → PR → **main'e merge**.
  Build workflow'ları main'den çalışır; merge edilmeden build'e girmez.
- APK: Actions → "Build Android APK" → Run workflow (kullanıcı tetikler, ~15 dk).
- AAB (Play Store): "Build Android AAB" — `ANDROID_KEYSTORE_BASE64/KEY_ALIAS/KEY_PASSWORD/STORE_PASSWORD` secrets gerekli.

### Sık düşülen tuzaklar
- `(tabs)` gibi parantezli yollar Bash'te quote gerektirir: `git add "mobile/app/(tabs)/x.tsx"`.
- `users.role` enum'dur: plpgsql'de text değişkeni `::public.user_role` cast'i olmadan insert etme (0012'nin sebebi).
- Auth trigger `handle_new_auth_user` signUp metadata'sından rol okur; signUp çağrılarında `options.data` doldur.
- RLS: `users` tablosunda herkes yalnızca kendini okur + berber profilleri public (0014).
  Çapraz kullanıcı işlemleri için security definer RPC kullan (`assign_barber_by_phone` örneği).
- Elle girilen randevularda `customer_id` NULL olur — trigger/sorgu yazarken hesaba kat.
- Native modüller (`datetimepicker`, `expo-location`) TS module hatası verirse `require()` ile yükle.
- `salons.target_gender`, `loyalty_*`, `photo_url` gibi kolonlar sonradan eklendi;
  yeni kolon kullanmadan önce migration'da var mı kontrol et.

## Roller & Alan Modeli (özet)
- `customer` / `barber` / `salon_owner`. Salon kuran barber otomatik `salon_owner` olur.
- `barbers.salon_id` NULL = salona atanmamış çalışan; salon sahibi RPC ile telefonla ekler.
- Sadakat: 100 puan = salonun tanımladığı ödül (TL indirim veya serbest metin ödül).
- Sakin saat indirimleri: `salon_discounts` (gün + saat aralığı + yüzde).
- Randevu çakışması DB seviyesinde exclusion constraint ile engellenir (23P01 = saat dolu).

## Konvansiyonlar
- Kullanıcıya dönük tüm metinler Türkçe; kod yorumları Türkçe.
- Hata mesajlarında gerçek nedeni göster (generic "hata oluştu" yazma — teşhisi zorlaştırıyor).
- Kullanıcıya hata açıklarken: önce root cause analizi, onay, sonra çözüm (kullanıcının açık talebi).
- Statik içerik (blog, stil rehberi) `mobile/src/content/` altında; sunucu bağımlılığı ekleme.
- Yol haritası `ROADMAP.md`, yayın adımları `PLAY_STORE_CHECKLIST.md`.
