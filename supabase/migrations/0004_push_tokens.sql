-- ============================================================================
-- Push Notification Token Kaydı
-- ============================================================================

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);

create index idx_push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens_manage_own" on public.push_tokens
  for all using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- Aynı randevu için hatırlatmanın birden fazla kez gönderilmesini önler.
create table public.appointment_reminders_sent (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  sent_at timestamptz not null default now()
);

-- Edge Function'ların (service_role) hatırlatma sorguları için, randevu + müşteri + token
-- birleşimini tek seferde çekebileceği view.
create view public.appointment_reminder_targets as
select
  a.id as appointment_id,
  a.start_time,
  a.salon_id,
  s.name as salon_name,
  pt.token as push_token,
  pt.platform
from public.appointments a
join public.push_tokens pt on pt.user_id = a.customer_id
join public.salons s on s.id = a.salon_id
where a.status = 'confirmed';
