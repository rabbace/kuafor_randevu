-- ============================================================================
-- 0019 — Bildirim otomasyonu (sunucu tarafı, Edge Function'sız)
-- 1) get_appointment_party_tokens: randevunun KARŞI tarafının push token'ları
--    (müşteri → berber, berber → müşteri). Yalnızca randevunun tarafları çağırabilir.
-- 2) send_expo_push: pg_net ile veritabanından Expo Push API'ye gönderim.
-- 3) Randevu hatırlatmaları: pg_cron 15 dk'da bir; 24 saat ve 1 saat pencereleri.
-- 4) Bekleme listesi: randevu iptal/red olunca eşleşen ilk bekleyene bildirim.
-- ============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ----------------------------------------------------------------------------
-- 1) Karşı tarafın token'ları
-- ----------------------------------------------------------------------------
create or replace function public.get_appointment_party_tokens(p_appointment_id uuid)
returns table (token text)
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := public.current_user_id();
  v_customer uuid;
  v_barber_user uuid;
begin
  select a.customer_id, b.user_id
    into v_customer, v_barber_user
  from public.appointments a
  join public.barbers b on b.id = a.barber_id
  where a.id = p_appointment_id;

  if v_me is null or (v_me is distinct from v_customer and v_me is distinct from v_barber_user) then
    return; -- randevunun tarafı değil: boş döner
  end if;

  if v_me = v_customer then
    return query select pt.token from public.push_tokens pt where pt.user_id = v_barber_user;
  else
    if v_customer is null then return; end if; -- elle girilen randevu
    return query select pt.token from public.push_tokens pt where pt.user_id = v_customer;
  end if;
end;
$$;

revoke all on function public.get_appointment_party_tokens(uuid) from anon;

-- ----------------------------------------------------------------------------
-- 2) Veritabanından Expo push gönderimi
-- ----------------------------------------------------------------------------
create or replace function public.send_expo_push(p_tokens text[], p_title text, p_body text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_messages jsonb;
begin
  if p_tokens is null or array_length(p_tokens, 1) is null then
    return;
  end if;
  select jsonb_agg(jsonb_build_object('to', t, 'title', p_title, 'body', p_body, 'sound', 'default'))
    into v_messages
  from unnest(p_tokens) as t;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := v_messages
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 3) Randevu hatırlatmaları (24 saat + 1 saat)
--    appointment_reminders_sent tek türlüydü; kind kolonu eklenir.
-- ----------------------------------------------------------------------------
alter table public.appointment_reminders_sent
  add column if not exists kind text not null default '24h';

do $$
begin
  alter table public.appointment_reminders_sent
    drop constraint if exists appointment_reminders_sent_pkey;
  alter table public.appointment_reminders_sent
    add primary key (appointment_id, kind);
exception when others then null; -- zaten dönüştürülmüşse geç
end $$;

create or replace function public.send_appointment_reminders()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  v_time text;
begin
  for r in
    select a.id, a.start_time, s.name as salon_name,
           case
             when a.start_time between now() + interval '23 hours' and now() + interval '25 hours' then '24h'
             when a.start_time between now() + interval '45 minutes' and now() + interval '75 minutes' then '1h'
           end as kind,
           array_agg(pt.token) as tokens
    from public.appointments a
    join public.salons s on s.id = a.salon_id
    join public.push_tokens pt on pt.user_id = a.customer_id
    where a.status = 'confirmed'
      and a.customer_id is not null
      and (a.start_time between now() + interval '23 hours' and now() + interval '25 hours'
        or a.start_time between now() + interval '45 minutes' and now() + interval '75 minutes')
    group by a.id, a.start_time, s.name
  loop
    if r.kind is null then continue; end if;
    if exists (
      select 1 from public.appointment_reminders_sent
      where appointment_id = r.id and kind = r.kind
    ) then continue; end if;

    v_time := to_char(r.start_time at time zone 'Europe/Istanbul', 'HH24:MI');
    perform public.send_expo_push(
      r.tokens,
      case when r.kind = '24h' then 'Yarın randevun var 📅' else 'Randevun yaklaşıyor ⏰' end,
      r.salon_name || ' — saat ' || v_time ||
        case when r.kind = '24h'
          then '. Gelemeyeceksen uygulamadan iptal edebilirsin.'
          else '. Görüşmek üzere!' end
    );

    insert into public.appointment_reminders_sent (appointment_id, kind)
    values (r.id, r.kind)
    on conflict do nothing;
  end loop;
end;
$$;

-- Cron: 15 dakikada bir (idempotent kurulum)
do $$
begin
  perform cron.unschedule('appointment-reminders');
exception when others then null;
end $$;
select cron.schedule('appointment-reminders', '*/15 * * * *', 'select public.send_appointment_reminders()');

-- ----------------------------------------------------------------------------
-- 4) Bekleme listesi: slot boşalınca ilk bekleyene bildirim
-- ----------------------------------------------------------------------------
create or replace function public.notify_waitlist_on_slot_free()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  w record;
  v_tokens text[];
  v_salon text;
begin
  if new.status not in ('cancelled', 'rejected') or old.status = new.status then
    return new;
  end if;

  select * into w
  from public.waitlist
  where salon_id = new.salon_id
    and (barber_id is null or barber_id = new.barber_id)
    and desired_date = (new.start_time at time zone 'Europe/Istanbul')::date
    and status = 'waiting'
  order by created_at
  limit 1;

  if w.id is null then return new; end if;

  select array_agg(token) into v_tokens
  from public.push_tokens where user_id = w.customer_id;

  select name into v_salon from public.salons where id = new.salon_id;

  update public.waitlist
  set status = 'notified', notified_at = now()
  where id = w.id;

  perform public.send_expo_push(
    v_tokens,
    'Yer açıldı! 🎉',
    coalesce(v_salon, 'Salon') || ' için beklediğin günde bir randevu boşaldı. Hemen uygulamadan yerini al!'
  );

  return new;
end;
$$;

drop trigger if exists appointments_notify_waitlist on public.appointments;
create trigger appointments_notify_waitlist
  after update on public.appointments
  for each row
  execute function public.notify_waitlist_on_slot_free();
