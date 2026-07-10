-- ============================================================================
-- Bekleme listesinde çoklu hizmet: service_id (tekil, FK) geriye uyumluluk
-- için ilk seçilen hizmeti tutmaya devam eder; tüm seçim service_ids'e yazılır.
-- ============================================================================
alter table public.waitlist
  add column if not exists service_ids uuid[];
