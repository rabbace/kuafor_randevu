-- ============================================================================
-- Sakin saat indirimleri (Happy Hour): salon sahibi belirli gün/saat
-- aralıklarına yüzde indirim tanımlar; müşteri o slotları indirimli görür.
-- ============================================================================
create table if not exists public.salon_discounts (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Pazar
  start_time time not null,
  end_time time not null,
  discount_percent integer not null check (discount_percent between 1 and 90),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (start_time < end_time)
);

alter table public.salon_discounts enable row level security;

drop policy if exists "salon_discounts_select_public" on public.salon_discounts;
drop policy if exists "salon_discounts_manage_owner" on public.salon_discounts;

-- Müşteriler indirimli saatleri görebilmeli
create policy "salon_discounts_select_public" on public.salon_discounts
  for select using (true);

-- Yalnızca salon sahibi yönetir
create policy "salon_discounts_manage_owner" on public.salon_discounts
  for all using (public.is_salon_owner(salon_id))
  with check (public.is_salon_owner(salon_id));
