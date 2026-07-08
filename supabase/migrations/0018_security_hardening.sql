-- ============================================================================
-- 0018 — Güvenlik sertleştirme ve eksik sunucu tarafı akışlar
--
-- 1) Sadakat puanı KULLANIMI sunucu tarafında hiç işlenmiyordu:
--    loyalty_transactions'a INSERT policy'si yok (istemci eklemesi sessizce
--    reddediliyordu) ve users.loyalty_points hiçbir yerde DÜŞÜLMÜYORDU.
--    Yani müşteri indirimi alıyor ama puanı hiç harcanmıyordu (sınırsız
--    indirim açığı). Çözüm: security definer RPC redeem_loyalty_points.
--
-- 2) Kampanya bildirimleri hiç gönderilemiyordu: push_tokens RLS'i yalnızca
--    kendi token'ını okutur, salon sahibi müşterilerin token'larını çekemez.
--    Çözüm: yalnızca salon sahibine, yalnızca kendi müşterilerinin token'larını
--    veren RPC get_campaign_push_tokens.
--
-- 3) Kampanya hız limiti yalnızca istemcideydi (atlatılabilir). Çözüm:
--    campaigns INSERT trigger'ı (7 günde en fazla 2, aralarında en az 48 saat).
--
-- 4) appointments.total_price istemciden geliyor; en azından negatif değer
--    engellenir (fiyatın kendisi berber onayında görünür — kabul edilen risk).
--
-- 5) salon-photos storage politikaları bucket genelindeydi: herhangi bir
--    giriş yapmış kullanıcı BAŞKA salonun fotoğrafını ezebiliyor/silebiliyordu.
--    Çözüm: yol tabanlı sahiplik ({salon_id}/... klasörü yalnızca o salonun
--    sahibi tarafından yazılabilir).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Sadakat puanı kullanımı (redeem)
-- ----------------------------------------------------------------------------
create or replace function public.redeem_loyalty_points(
  p_salon_id uuid,
  p_points integer,
  p_reason text default 'Randevuda indirim kullanıldı',
  p_appointment_id uuid default null
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := public.current_user_id();
  v_balance integer;
begin
  if v_user is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_points is null or p_points < 100 or p_points % 100 <> 0 or p_points > 100000 then
    return json_build_object('ok', false, 'error', 'bad_points');
  end if;
  if not exists (
    select 1 from public.salons s
    where s.id = p_salon_id and coalesce(s.loyalty_enabled, true)
  ) then
    return json_build_object('ok', false, 'error', 'loyalty_disabled');
  end if;
  -- Randevu belirtildiyse bu kullanıcıya ve bu salona ait olmalı.
  if p_appointment_id is not null and not exists (
    select 1 from public.appointments a
    where a.id = p_appointment_id
      and a.customer_id = v_user
      and a.salon_id = p_salon_id
  ) then
    return json_build_object('ok', false, 'error', 'bad_appointment');
  end if;

  -- Puan güncelleme korumasını bu işlem için aç (aşağıdaki 6. bölüm).
  perform set_config('app.allow_loyalty_update', '1', true);

  -- Bakiyeyi kilitleyerek oku (çifte harcamayı önler).
  select loyalty_points into v_balance
  from public.users where id = v_user for update;

  if coalesce(v_balance, 0) < p_points then
    return json_build_object('ok', false, 'error', 'insufficient_points');
  end if;

  insert into public.loyalty_transactions
    (customer_id, salon_id, appointment_id, points_change, reason)
  values
    (v_user, p_salon_id, p_appointment_id, -p_points, coalesce(p_reason, 'Randevuda indirim kullanıldı'));

  update public.users
    set loyalty_points = loyalty_points - p_points
    where id = v_user;

  return json_build_object('ok', true, 'remaining', v_balance - p_points);
end;
$$;

revoke all on function public.redeem_loyalty_points(uuid, integer, text, uuid) from anon;

-- ----------------------------------------------------------------------------
-- 2) Kampanya alıcı token'ları (yalnızca salon sahibi, yalnızca kendi müşterileri)
-- ----------------------------------------------------------------------------
create or replace function public.get_campaign_push_tokens(p_target text)
returns table (token text)
language plpgsql security definer set search_path = public
as $$
declare
  v_owner uuid := public.current_user_id();
  v_salon uuid;
begin
  select id into v_salon from public.salons where owner_id = v_owner limit 1;
  if v_salon is null then
    return; -- salon sahibi değil: boş döner
  end if;

  if p_target = 'favorites' then
    return query
      select distinct pt.token
      from public.favorite_barbers fb
      join public.barbers b on b.id = fb.barber_id and b.salon_id = v_salon
      join public.push_tokens pt on pt.user_id = fb.customer_id;
  else
    return query
      select distinct pt.token
      from public.appointments a
      join public.push_tokens pt on pt.user_id = a.customer_id
      where a.salon_id = v_salon and a.customer_id is not null;
  end if;
end;
$$;

revoke all on function public.get_campaign_push_tokens(text) from anon;

-- ----------------------------------------------------------------------------
-- 3) Kampanya hız limiti sunucu tarafında
-- ----------------------------------------------------------------------------
create or replace function public.enforce_campaign_rate_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
  v_last timestamptz;
begin
  select count(*), max(sent_at) into v_count, v_last
  from public.campaigns
  where salon_id = new.salon_id
    and sent_at >= now() - interval '7 days';

  if v_count >= 2 then
    raise exception 'campaign_rate_limit: 7 gün içinde en fazla 2 kampanya gönderilebilir.';
  end if;
  if v_last is not null and v_last > now() - interval '48 hours' then
    raise exception 'campaign_rate_limit: son kampanyanın üzerinden 48 saat geçmeden yeni kampanya gönderilemez.';
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_rate_limit on public.campaigns;
create trigger campaigns_rate_limit
  before insert on public.campaigns
  for each row
  execute function public.enforce_campaign_rate_limit();

-- ----------------------------------------------------------------------------
-- 4) total_price negatif olamaz
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_total_price_nonnegative'
  ) then
    alter table public.appointments
      add constraint appointments_total_price_nonnegative
      check (total_price is null or total_price >= 0);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 5) salon-photos: yol tabanlı sahiplik ({salon_id}/dosya.jpg)
-- ----------------------------------------------------------------------------
drop policy if exists "salon_photos_insert" on storage.objects;
drop policy if exists "salon_photos_update" on storage.objects;
drop policy if exists "salon_photos_delete" on storage.objects;

create policy "salon_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = public.current_user_id()
    )
  );

create policy "salon_photos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = public.current_user_id()
    )
  )
  with check (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = public.current_user_id()
    )
  );

create policy "salon_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = public.current_user_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 6) users.loyalty_points istemciden değiştirilemez.
--    users_update_own policy'si kolon kısıtlamaz: bir müşteri loyalty_points'i
--    doğrudan 999999 yapabilirdi. Puan değişikliği yalnızca sunucu tarafı
--    fonksiyonlardan (kazanım trigger'ı + redeem RPC) geçebilir; bunlar
--    app.allow_loyalty_update GUC'unu işaretler.
-- ----------------------------------------------------------------------------
create or replace function public.protect_loyalty_points()
returns trigger
language plpgsql
as $$
begin
  if new.loyalty_points is distinct from old.loyalty_points
     and coalesce(current_setting('app.allow_loyalty_update', true), '') <> '1'
     and auth.uid() is not null -- service_role/SQL Editor etkilenmez
  then
    raise exception 'loyalty_points doğrudan güncellenemez.';
  end if;
  return new;
end;
$$;

drop trigger if exists users_protect_loyalty_points on public.users;
create trigger users_protect_loyalty_points
  before update on public.users
  for each row
  execute function public.protect_loyalty_points();

-- Kazanım trigger'ı da GUC'u işaretleyecek şekilde yeniden tanımlanır (0014 üstüne).
create or replace function public.handle_appointment_completed()
returns trigger as $$
declare
  v_points integer;
begin
  if new.status = 'completed'
     and old.status <> 'completed'
     and new.customer_id is not null
     and exists (
       select 1 from public.salons s
       where s.id = new.salon_id and coalesce(s.loyalty_enabled, true)
     )
  then
    select coalesce(points_per_visit, 1) into v_points
    from public.loyalty_rules where salon_id = new.salon_id;

    insert into public.loyalty_transactions (customer_id, salon_id, appointment_id, points_change, reason)
    values (new.customer_id, new.salon_id, new.id, coalesce(v_points, 1), 'appointment_completed');

    perform set_config('app.allow_loyalty_update', '1', true);
    update public.users
      set loyalty_points = loyalty_points + coalesce(v_points, 1)
      where id = new.customer_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;
