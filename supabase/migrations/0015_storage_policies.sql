-- ============================================================================
-- salon-photos bucket'ı için Storage politikaları. Bucket oluşturmak tek
-- başına yetmez: storage.objects üzerinde policy yoksa her yükleme
-- "row-level security" hatasıyla reddedilir.
-- ============================================================================

drop policy if exists "salon_photos_read" on storage.objects;
drop policy if exists "salon_photos_insert" on storage.objects;
drop policy if exists "salon_photos_update" on storage.objects;
drop policy if exists "salon_photos_delete" on storage.objects;

-- Herkes okuyabilir (public bucket zaten; tutarlılık için policy de ekli)
create policy "salon_photos_read" on storage.objects
  for select using (bucket_id = 'salon-photos');

-- Giriş yapmış kullanıcılar yükleyebilir/güncelleyebilir/silebilir
create policy "salon_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'salon-photos');

create policy "salon_photos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'salon-photos')
  with check (bucket_id = 'salon-photos');

create policy "salon_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'salon-photos');

-- ============================================================================
-- Sadakat: 100 puanın TL karşılığını berber belirler (varsayılan 20 TL).
-- ============================================================================
alter table public.salons
  add column if not exists loyalty_redeem_amount numeric(10,2) not null default 20;
