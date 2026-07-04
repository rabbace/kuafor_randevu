-- ============================================================================
-- Kuaför / Berber Randevu Sistemi — İlk Şema
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUM TİPLERİ
-- ----------------------------------------------------------------------------
create type user_role as enum ('customer', 'salon_owner', 'barber');
create type gender_type as enum ('male', 'female');
create type salon_target_gender as enum ('male', 'female', 'unisex');
create type appointment_status as enum ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show');
create type waitlist_status as enum ('waiting', 'notified', 'converted', 'expired');

-- ----------------------------------------------------------------------------
-- USERS  (auth.users tablosunu genişletir)
-- ----------------------------------------------------------------------------
create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  gender gender_type,
  full_name text,
  phone text,
  avatar_url text,
  loyalty_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SALONS
-- ----------------------------------------------------------------------------
create table public.salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  target_gender salon_target_gender not null default 'unisex',
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  logo_url text,
  theme_primary_color text default '#6D28D9',
  theme_secondary_color text default '#F472B6',
  start_time time not null default '09:00',
  end_time time not null default '20:00',
  buffer_time_minutes integer not null default 10,
  working_days int[] not null default '{1,2,3,4,5,6}', -- 0=Pazar .. 6=Cumartesi
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- BARBERS (Salon çalışanları)
-- ----------------------------------------------------------------------------
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text default 'Berber',
  speed_multiplier numeric(4,2) not null default 1.00, -- 0.8 = hızlı usta, 1.5 = yavaş çırak
  auto_approve_appointments boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (salon_id, user_id)
);

-- ----------------------------------------------------------------------------
-- BARBER WORKING HOURS (Çalışana özel saatler, salon saatlerini override edebilir)
-- ----------------------------------------------------------------------------
create table public.barber_schedules (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_off boolean not null default false,
  unique (barber_id, day_of_week)
);

-- ----------------------------------------------------------------------------
-- SERVICES
-- ----------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null,
  description text,
  base_duration_minutes integer not null check (base_duration_minutes > 0),
  price numeric(10,2) not null default 0,
  target_gender salon_target_gender not null default 'unisex',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Hangi berber hangi hizmeti verebiliyor (M2M)
create table public.barber_services (
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- ----------------------------------------------------------------------------
-- APPOINTMENTS
-- ----------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users(id) on delete cascade,
  salon_id uuid not null references public.salons(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_after_start check (end_time > start_time)
);

-- Aynı berbere çakışan randevu girilmesini DB seviyesinde engelle
create extension if not exists "btree_gist";
alter table public.appointments
  add constraint no_overlapping_appointments
  exclude using gist (
    barber_id with =,
    tstzrange(start_time, end_time) with &&
  )
  where (status in ('pending', 'confirmed'));

create index idx_appointments_barber_start on public.appointments (barber_id, start_time);
create index idx_appointments_customer on public.appointments (customer_id);
create index idx_appointments_salon_start on public.appointments (salon_id, start_time);

-- ----------------------------------------------------------------------------
-- WAITLIST (Yedek Liste)
-- ----------------------------------------------------------------------------
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users(id) on delete cascade,
  salon_id uuid not null references public.salons(id) on delete cascade,
  barber_id uuid references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  desired_date date not null,
  desired_start_time time,
  desired_end_time time,
  status waitlist_status not null default 'waiting',
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_waitlist_salon_date on public.waitlist (salon_id, desired_date, status);

-- ----------------------------------------------------------------------------
-- LOYALTY (Sadakat sistemi geçmişi)
-- ----------------------------------------------------------------------------
create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users(id) on delete cascade,
  salon_id uuid not null references public.salons(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  points_change integer not null, -- +1 tamamlanan randevu, -10 ödül kullanımı vb.
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.loyalty_rules (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade unique,
  points_per_visit integer not null default 1,
  free_visit_threshold integer not null default 10 -- 10. ziyarette 1 bedava
);

-- ----------------------------------------------------------------------------
-- updated_at otomatik güncelleme tetikleyicisi
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_salons_updated_at before update on public.salons
  for each row execute function public.set_updated_at();
create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Randevu tamamlandığında otomatik sadakat puanı ekle
-- ----------------------------------------------------------------------------
create or replace function public.handle_appointment_completed()
returns trigger as $$
declare
  v_points integer;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    select coalesce(points_per_visit, 1) into v_points
    from public.loyalty_rules where salon_id = new.salon_id;

    insert into public.loyalty_transactions (customer_id, salon_id, appointment_id, points_change, reason)
    values (new.customer_id, new.salon_id, new.id, coalesce(v_points, 1), 'appointment_completed');

    update public.users
      set loyalty_points = loyalty_points + coalesce(v_points, 1)
      where id = new.customer_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_appointment_completed
  after update on public.appointments
  for each row execute function public.handle_appointment_completed();
