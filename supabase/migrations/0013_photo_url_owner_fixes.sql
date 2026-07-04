-- ============================================================================
-- 1) salons.photo_url: uygulama bu kolonu okuyor/yazıyordu ama şemada yoktu.
--    Kolonun yokluğu PostgREST sorgusunu düşürünce müşteri keşfet listesi
--    tamamen boş dönüyordu.
-- ============================================================================
alter table public.salons add column if not exists photo_url text;

-- ============================================================================
-- 2) Çalışan atama RLS'i rol yerine salon sahipliğine baksın: salonu uygulama
--    içinden kuran kullanıcıların rolü 'barber' kalmış olabilir.
-- ============================================================================
drop policy if exists "salon_owner_can_assign_barbers" on public.barbers;

create policy "salon_owner_can_assign_barbers" on public.barbers
  for update
  using (
    exists (
      select 1 from public.salons s
      where s.owner_id = public.current_user_id()
        and (public.barbers.salon_id = s.id or public.barbers.salon_id is null)
    )
  )
  with check (
    exists (
      select 1 from public.salons s
      where s.owner_id = public.current_user_id()
        and (public.barbers.salon_id = s.id or public.barbers.salon_id is null)
    )
  );

-- ============================================================================
-- 3) Salon sahibi olan ama rolü hâlâ 'barber'/'customer' kalan hesapları düzelt.
-- ============================================================================
update public.users u
set role = 'salon_owner'
where u.role <> 'salon_owner'
  and exists (select 1 from public.salons s where s.owner_id = u.id);
