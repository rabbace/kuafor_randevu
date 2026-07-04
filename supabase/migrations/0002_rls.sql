-- ============================================================================
-- Row Level Security (RLS) Politikaları
-- ============================================================================

alter table public.users enable row level security;
alter table public.salons enable row level security;
alter table public.barbers enable row level security;
alter table public.barber_schedules enable row level security;
alter table public.services enable row level security;
alter table public.barber_services enable row level security;
alter table public.appointments enable row level security;
alter table public.waitlist enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.loyalty_rules enable row level security;

-- ----------------------------------------------------------------------------
-- Yardımcı fonksiyonlar: oturum açan kullanıcının public.users.id'sini ve rolünü al
-- ----------------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid as $$
  select id from public.users where auth_id = auth.uid();
$$ language sql stable security definer;

create or replace function public.is_salon_owner(p_salon_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.salons s
    where s.id = p_salon_id and s.owner_id = public.current_user_id()
  );
$$ language sql stable security definer;

create or replace function public.is_salon_barber(p_salon_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.barbers b
    where b.salon_id = p_salon_id and b.user_id = public.current_user_id()
  );
$$ language sql stable security definer;

-- ----------------------------------------------------------------------------
-- USERS: herkes kendi profilini okuyup güncelleyebilir
-- ----------------------------------------------------------------------------
create policy "users_select_own" on public.users
  for select using (auth_id = auth.uid());

create policy "users_update_own" on public.users
  for update using (auth_id = auth.uid());

create policy "users_insert_own" on public.users
  for insert with check (auth_id = auth.uid());

-- ----------------------------------------------------------------------------
-- SALONS: herkes aktif salonları görebilir (public liste/arama),
-- sadece sahibi düzenleyebilir
-- ----------------------------------------------------------------------------
create policy "salons_select_public" on public.salons
  for select using (is_active = true or owner_id = public.current_user_id());

create policy "salons_insert_owner" on public.salons
  for insert with check (owner_id = public.current_user_id());

create policy "salons_update_owner" on public.salons
  for update using (owner_id = public.current_user_id());

create policy "salons_delete_owner" on public.salons
  for delete using (owner_id = public.current_user_id());

-- ----------------------------------------------------------------------------
-- BARBERS: herkes görebilir (public profil), sadece salon sahibi yönetir
-- ----------------------------------------------------------------------------
create policy "barbers_select_public" on public.barbers
  for select using (true);

create policy "barbers_manage_owner" on public.barbers
  for all using (public.is_salon_owner(salon_id))
  with check (public.is_salon_owner(salon_id));

-- ----------------------------------------------------------------------------
-- BARBER SCHEDULES
-- ----------------------------------------------------------------------------
create policy "barber_schedules_select_public" on public.barber_schedules
  for select using (true);

create policy "barber_schedules_manage_owner" on public.barber_schedules
  for all using (
    exists (select 1 from public.barbers b where b.id = barber_id and public.is_salon_owner(b.salon_id))
  )
  with check (
    exists (select 1 from public.barbers b where b.id = barber_id and public.is_salon_owner(b.salon_id))
  );

-- ----------------------------------------------------------------------------
-- SERVICES
-- ----------------------------------------------------------------------------
create policy "services_select_public" on public.services
  for select using (true);

create policy "services_manage_owner" on public.services
  for all using (public.is_salon_owner(salon_id))
  with check (public.is_salon_owner(salon_id));

create policy "barber_services_select_public" on public.barber_services
  for select using (true);

create policy "barber_services_manage_owner" on public.barber_services
  for all using (
    exists (select 1 from public.barbers b where b.id = barber_id and public.is_salon_owner(b.salon_id))
  )
  with check (
    exists (select 1 from public.barbers b where b.id = barber_id and public.is_salon_owner(b.salon_id))
  );

-- ----------------------------------------------------------------------------
-- APPOINTMENTS: müşteri kendi randevularını, berber/sahip salonun randevularını görür
-- ----------------------------------------------------------------------------
create policy "appointments_select" on public.appointments
  for select using (
    customer_id = public.current_user_id()
    or public.is_salon_owner(salon_id)
    or public.is_salon_barber(salon_id)
  );

create policy "appointments_insert_customer" on public.appointments
  for insert with check (customer_id = public.current_user_id());

create policy "appointments_update" on public.appointments
  for update using (
    customer_id = public.current_user_id()
    or public.is_salon_owner(salon_id)
    or public.is_salon_barber(salon_id)
  );

-- ----------------------------------------------------------------------------
-- WAITLIST
-- ----------------------------------------------------------------------------
create policy "waitlist_select" on public.waitlist
  for select using (
    customer_id = public.current_user_id()
    or public.is_salon_owner(salon_id)
    or public.is_salon_barber(salon_id)
  );

create policy "waitlist_insert_customer" on public.waitlist
  for insert with check (customer_id = public.current_user_id());

create policy "waitlist_update" on public.waitlist
  for update using (
    customer_id = public.current_user_id()
    or public.is_salon_owner(salon_id)
  );

-- ----------------------------------------------------------------------------
-- LOYALTY
-- ----------------------------------------------------------------------------
create policy "loyalty_transactions_select" on public.loyalty_transactions
  for select using (
    customer_id = public.current_user_id()
    or public.is_salon_owner(salon_id)
  );

create policy "loyalty_rules_select_public" on public.loyalty_rules
  for select using (true);

create policy "loyalty_rules_manage_owner" on public.loyalty_rules
  for all using (public.is_salon_owner(salon_id))
  with check (public.is_salon_owner(salon_id));
