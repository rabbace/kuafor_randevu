-- ============================================================================
-- Randevu toplam fiyatı: elle girilen randevular ve sadakat indirimi
-- hesaplamalarında kullanılır.
-- ============================================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS total_price numeric(10,2);
