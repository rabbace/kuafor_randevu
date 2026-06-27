# kuafor_randevu

Berberler, kuaförler ve güzellik salonları için randevu sistemi.

Mimari: React Native (Expo) mobil uygulama + Next.js web yönetim paneli, Supabase (PostgreSQL + Auth + RLS) backend.

## Adım 1 — Veritabanı Şeması ve Auth (tamamlandı)

`supabase/migrations/` içinde sırasıyla:

1. `0001_init.sql` — tüm tablolar (`users`, `salons`, `barbers`, `barber_schedules`, `services`, `barber_services`, `appointments`, `waitlist`, `loyalty_transactions`, `loyalty_rules`), enum tipleri, çakışan randevuları engelleyen `exclude` constraint'i, sadakat puanı otomasyon trigger'ı.
2. `0002_rls.sql` — her tablo için Row Level Security politikaları (müşteri/sahip/berber yetki ayrımı).
3. `0003_auth_trigger.sql` — `auth.users` kaydı oluştuğunda otomatik `public.users` satırı açan trigger (Google/Apple SSO dahil).

`supabase/config.toml` — local Supabase CLI yapılandırması (Google/Apple OAuth provider'ları için env değişkenleri: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`).

### Çalıştırma

```bash
supabase start
supabase db reset   # migration'ları local DB'ye uygular
```

Production projeye uygulamak için:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Sıradaki adımlar: Next.js yönetim paneli, Expo mobil uygulama, slot hesaplama algoritması, push notification ve AdMob entegrasyonu.
