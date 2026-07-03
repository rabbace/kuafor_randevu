-- Salon sahibinin çalışan ataması yapabilmesi için RLS politikası.
-- Salon sahibi (salon_owner rolündeki kullanıcı), kendi salonuna ait barber
-- kayıtlarının salon_id alanını güncelleyebilir.
-- Aynı zamanda salon_id = NULL olan berberleri de kendi salonuna bağlayabilir.

-- barbers tablosunda UPDATE yetkisi: yalnızca salon sahibi
create policy "salon_owner_can_assign_barbers"
  on public.barbers
  for update
  using (
    -- Güncellemeye izin ver: ya zaten bu salonun berberi ya da henüz atanmamış
    exists (
      select 1
      from public.barbers owner_barber
      join public.users u on u.id = owner_barber.user_id
      where owner_barber.user_id = auth.uid()
        and u.role = 'salon_owner'
        and (
          public.barbers.salon_id = owner_barber.salon_id
          or public.barbers.salon_id is null
        )
    )
  )
  with check (
    -- Atanan değer ya kendi salon_id'si ya da NULL (çıkarma) olmalı
    exists (
      select 1
      from public.barbers owner_barber
      join public.users u on u.id = owner_barber.user_id
      where owner_barber.user_id = auth.uid()
        and u.role = 'salon_owner'
        and (
          public.barbers.salon_id = owner_barber.salon_id
          or public.barbers.salon_id is null
        )
    )
  );

-- barbers: SELECT — salon sahibi kendi salonundaki tüm berberleri görebilir
create policy "salon_owner_can_read_staff"
  on public.barbers
  for select
  using (
    -- Kendi kaydı
    user_id = auth.uid()
    or
    -- Kendi salonundaki berberler
    exists (
      select 1
      from public.barbers owner_barber
      join public.users u on u.id = owner_barber.user_id
      where owner_barber.user_id = auth.uid()
        and u.role = 'salon_owner'
        and public.barbers.salon_id = owner_barber.salon_id
    )
    or
    -- Herkese açık (keşfet sayfası için zaten açık olmalı)
    true
  );
