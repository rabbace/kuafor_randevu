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

## Adım 2 — Next.js Web Yönetim Paneli (tamamlandı)

```
web/
├── app/
│   ├── layout.tsx, globals.css
│   ├── login/page.tsx              # Google/Apple SSO girişi
│   ├── actions/appointments.ts     # Server Actions: onay/red, çalışan ekleme
│   └── dashboard/
│       ├── appointments/page.tsx   # Randevu onay/red listesi
│       └── employees/page.tsx      # Çalışan listesi + ekleme formu
├── components/
│   ├── appointments/AppointmentApprovalCard.tsx
│   └── employees/AddEmployeeForm.tsx
├── lib/
│   ├── supabase/{client,server}.ts
│   ├── store/useSalonStore.ts      # Zustand
│   └── types/database.ts
├── middleware.ts                   # Oturum kontrolü, /dashboard koruması
├── tailwind.config.ts, postcss.config.js, next.config.js
└── package.json
```

Kurulum:

```bash
cd web
npm install
cp .env.example .env.local   # Supabase URL/anon key doldur
npm run dev
```

## Adım 3 — Expo Mobil Uygulama (tamamlandı)

```
mobile/
├── app/
│   ├── _layout.tsx              # onboarding -> auth -> tabs yönlendirme mantığı
│   ├── onboarding/index.tsx     # kaydırmalı (swipe) tanıtım, AsyncStorage ile tek seferlik
│   ├── (auth)/login.tsx         # e-posta + Google/Apple SSO
│   └── (tabs)/
│       ├── index.tsx            # Keşfet (salon listesi)
│       ├── appointments.tsx     # Randevularım
│       └── profile.tsx          # Profil + sadakat puanı + çıkış
├── src/
│   ├── lib/
│   │   ├── supabase.ts          # AsyncStorage destekli Supabase client
│   │   ├── slotCalculator.ts    # KRİTİK: slot hesaplama algoritması
│   │   └── onboarding.ts
│   ├── store/                   # Zustand: auth, theme, booking
│   ├── components/{onboarding,booking}/
│   └── types/database.ts
├── app.json                     # AdMob app id, push notification plugin, deep link scheme
└── package.json
```

### Slot Hesaplama Algoritması (`src/lib/slotCalculator.ts`)

- `calculateFinalDuration(baseDuration, speedMultiplier)`: Temel Süre × Hız Çarpanı, en yakın 5 dakikaya yuvarlanır (örn. 30dk × 1.5 çırak = 45dk, 30dk × 0.8 usta = 25dk).
- `generateDailySlots(...)`: Salon çalışma saatleri (veya berbere özel saatler) içinde, mevcut randevuların üstüne **tampon süresini (buffer)** ekleyerek çakışan slotları pasif (dolu) işaretler; boş slotlar dinamik olarak hesaplanan süreye göre seçilebilir kalır.

Kurulum:

```bash
cd mobile
npm install
npx expo start
```

`app.json` içindeki `extra.supabaseUrl` / `extra.supabaseAnonKey` ve AdMob app id'lerini doldurman gerekiyor.

Sıradaki adım: Push notification (randevudan 2 saat önce hatırlatma) ve AdMob banner/interstitial entegrasyon kodları.
