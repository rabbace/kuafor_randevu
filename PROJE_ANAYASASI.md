# Kuaför / Berber Randevu Sistemi — Proje Anayasası

> Bu dosya, projeye dair tüm istenen özelliklerin canlı kaydıdır. Yeni bir özellik istendiğinde bu dosya güncellenir; buradaki maddeler projenin "anayasası" sayılır ve geliştirme bu maddelere göre yürütülür.

## 1. Genel Kapsam

- **Platformlar:** Mobil (iOS/Android, Expo + React Native + TypeScript) ve Web Yönetim Paneli (Next.js App Router + Tailwind CSS).
- **Backend:** Supabase (PostgreSQL, Row Level Security, Google/Apple SSO + e-posta/şifre).
- **State yönetimi (mobil):** Zustand.
- **Birincil platform mobildir** — yeni özellik geliştirmede öncelik mobil uygulamadadır, web paneli ikinci planda tutulur.

## 2. Kullanıcı Rolleri

- **Müşteri (customer):** Randevu alır, salon/berber arar, sadakat puanı kazanır, berbere WhatsApp/SMS ile yazabilir.
- **Salon Sahibi (salon_owner):** Salonunu, çalışanlarını, hizmetlerini yönetir; randevuları onaylar/reddeder.
- **Berber / Çalışan (barber):** Kendi randevularını görür, kendi adresini/konumunu ve WhatsApp numarasını tanımlar, uygulama dışından (telefonla/elden) gelen randevu taleplerini sisteme elle girebilir.

## 3. Kayıt (Registration) Kuralları

- **Telefon numarası zorunludur** — hem müşteri hem berber kayıt formunda telefon numarası girmek zorundadır (`mobile/app/(auth)/register.tsx`).
- Kayıt formunda: Ad Soyad, Telefon, E-posta, Şifre, Rol seçimi (Müşteri / Berber).
- Kayıt sonrası `public.users` tablosuna `full_name`, `phone`, `role` yazılır.

## 4. Berber Adres / Konum

- Berberler kendi adreslerini ve harita üzerindeki konumlarını tanımlayabilir (`barbers.address`, `barbers.latitude`, `barbers.longitude`).
- Bu konum, müşteri tarafında "Keşfet" ekranında harita (react-native-maps) üzerinde gösterilir.
- Berber, profil ekranından haritada pin'i sürükleyerek konumunu güncelleyebilir.

## 5. İletişim (WhatsApp / SMS)

- Müşteri, berbere doğrudan **WhatsApp** veya **SMS** üzerinden yazabilir.
- Her berber kartında "WhatsApp'tan Yaz" ve "SMS Gönder" butonları bulunur (`mobile/src/components/contact/ContactButtons.tsx`).
- WhatsApp yönlendirmesi `https://wa.me/<numara>` formatını kullanır; SMS `sms:<numara>` deep-link'i kullanır.
- Berberin WhatsApp numarası `barbers.whatsapp_phone` alanında saklanır.

## 6. Uygulama Dışı (Elden) Randevu Girişi

- Berberler / salon sahipleri, telefonla veya yüz yüze gelen randevu taleplerini uygulamaya **elle** girebilir.
- Bu randevularda müşteri hesabı zorunlu değildir: `appointments.is_manual_entry = true`, `manual_customer_name`, `manual_customer_phone` alanları kullanılır; `customer_id` bu durumda `null` olabilir.
- Elle girilen randevular hem mobil (`Randevularım` ekranında "+ Dışarıdan Randevu Ekle") hem web panelinde ("Elden Girildi" etiketiyle) görünür.
- DB seviyesinde `manual_entry_requires_name` kısıtı: `is_manual_entry = false` ise `customer_id` zorunlu; `is_manual_entry = true` ise `manual_customer_name` zorunlu.
- RLS: elle randevu ekleme yetkisi sadece o salonun sahibine veya berberine aittir.

## 7. Karanlık Tema (Dark Mode)

- Mobil uygulamada **Açık / Karanlık / Sistem** temaları desteklenir (`mobile/src/store/useThemeStore.ts`, `mobile/src/theme/colors.ts`).
- Tema seçimi profil ekranından değiştirilebilir, sistem teması değiştiğinde otomatik güncellenir.
- Salonun marka renkleri (`primaryColor` / `secondaryColor`) karanlık/açık temadan bağımsız olarak özelleştirilebilir kalır.

## 8. Kritik İş Mantığı (Değişmedi)

- **Dinamik slot hesaplama:** `Temel Süre × Hız Çarpanı`, en yakın 5 dakikaya yuvarlanır (`calculateFinalDuration`).
- **Buffer time:** Her randevunun bitişine salonun `buffer_time_minutes` değeri eklenir, sıradaki slotlar buna göre kapatılır.
- **Onay mekanizması:** Berber bazında otomatik onay (`auto_approve_appointments`) veya manuel onay.
- **Çakışma engeli:** PostgreSQL `EXCLUDE USING GIST` kısıtı ile aynı berbere çakışan (pending/confirmed) randevu engellenir.
- **Sadakat puanı:** Randevu `completed` durumuna geçtiğinde otomatik puan eklenir (trigger).
- **Bekleme listesi (waitlist):** İstenen tarih/berber için randevu açılırsa müşteri bilgilendirilir.

## 9. Veritabanı Şeması — Özet (güncel)

| Tablo | Önemli Alanlar |
|---|---|
| `users` | `role`, `phone` (zorunlu girilir), `gender`, `loyalty_points` |
| `salons` | `address`, `latitude`, `longitude`, `theme_primary_color/secondary_color`, çalışma saatleri, `buffer_time_minutes` |
| `barbers` | `speed_multiplier`, `auto_approve_appointments`, **`address`, `latitude`, `longitude`, `whatsapp_phone`** (yeni) |
| `services` | `base_duration_minutes`, `price` |
| `appointments` | `status`, **`is_manual_entry`, `manual_customer_name`, `manual_customer_phone`** (yeni), `customer_id` artık nullable |
| `waitlist` | bekleme listesi kayıtları |
| `loyalty_transactions` / `loyalty_rules` | sadakat puanı geçmişi ve kuralları |

Migration geçmişi: `0001_init.sql` → `0002_rls.sql` → `0003_auth_trigger.sql` → `0004_push_tokens.sql` → `0005_contact_manual_appointments.sql`.

## 10. Tasarım Sistemi

- **Web paneli:** Sidebar + Topbar dashboard layout, `Logo`/`Button`/`Card`/`Badge` bileşenleri, avatar baş harfleri, durum etiketleri (Badge renkleri).
- **Mobil:** Merkezi renk paleti (`src/theme/colors.ts`), tema store üzerinden tüm ekranlara uygulanır.

## 11. Özel Modüller

- Onboarding swipe ekranları.
- Push bildirim: randevudan 2 saat önce hatırlatma (Supabase Edge Function, cron tetikli).
- Waitlist bildirimi (webhook tetikli Edge Function).
- Sadakat puanı sistemi.
- AdMob reklam entegrasyonu (banner + interstitial).

## 12. Planlanan (Henüz Geliştirilmedi)

- **Berber puanlama / değerlendirme sistemi:** Uygulama gerçek kullanıcılarla çalışmaya başladıktan sonra eklenecek. Müşteri, tamamlanan randevu sonrası berbere puan (örn. 1-5 yıldız) ve yorum verebilecek. Henüz DB şemasına veya ekranlara eklenmedi — sıradaki büyük özellik adayı.

## 13. Güncelleme Kuralı

> Yeni bir özellik istendiğinde bu dosyaya ilgili madde eklenir veya güncellenir. Bu dosya kod ile birlikte commit edilir.
