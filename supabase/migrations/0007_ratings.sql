-- ============================================================================
-- Berber puanlama sistemi + eksik RLS politikaları
-- ============================================================================

create table public.barber_ratings (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  customer_id uuid not null references public.users(id),
  barber_id uuid not null references public.barbers(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (appointment_id)
);

alter table public.barber_ratings enable row level security;

create policy "ratings_insert_customer" on public.barber_ratings
  for insert with check (customer_id = public.current_user_id());

create policy "ratings_select_all" on public.barber_ratings
  for select using (true);

-- Ortalama puan görünümü
create view public.barber_avg_ratings as
select
  barber_id,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(*) as total_ratings
from public.barber_ratings
group by barber_id;

-- ----------------------------------------------------------------------------
-- Berber kendi çalışma saatlerini yönetebilsin (mevcut politika yalnızca
-- salon sahibine izin veriyordu).
-- ----------------------------------------------------------------------------
create policy "barber_schedules_manage_self" on public.barber_schedules
  for all using (
    exists (
      select 1 from public.barbers b
      where b.id = barber_id and b.user_id = public.current_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.barbers b
      where b.id = barber_id and b.user_id = public.current_user_id()
    )
  );

-- ----------------------------------------------------------------------------
-- Müşteri kendi bekleme listesi kaydını silebilsin
-- ----------------------------------------------------------------------------
create policy "waitlist_delete_customer" on public.waitlist
  for delete using (customer_id = public.current_user_id());

-- ----------------------------------------------------------------------------
-- Salon iletişim telefonu
-- ----------------------------------------------------------------------------
alter table public.salons add column phone text;
