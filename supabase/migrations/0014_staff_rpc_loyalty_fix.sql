-- ============================================================================
-- 1) Elden girilen randevu tamamlanınca loyalty trigger'ı customer_id NULL
--    olduğu için patlıyor, güncelleme "Güncellenemedi" hatasıyla düşüyordu.
--    Ayrıca salonun loyalty_enabled tercihi artık dikkate alınıyor.
-- ============================================================================
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

    update public.users
      set loyalty_points = loyalty_points + coalesce(v_points, 1)
      where id = new.customer_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 2) Berber profilleri herkese okunabilir olsun: keşfet listesindeki isimler
--    ve puanlama ekranı bu join'e muhtaç (users_select_own tek başına engel).
-- ============================================================================
drop policy if exists "users_select_barber_profiles" on public.users;
create policy "users_select_barber_profiles" on public.users
  for select using (role in ('barber', 'salon_owner'));

-- ============================================================================
-- 3) Çalışan ekleme/çıkarma RPC'leri: RLS'e takılmadan (security definer),
--    telefonu normalize ederek (son 10 hane) arar; barbers satırı yoksa açar.
-- ============================================================================
create or replace function public.assign_barber_by_phone(p_phone text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_owner uuid := public.current_user_id();
  v_salon uuid;
  v_user_id uuid;
  v_user_name text;
  v_barber_id uuid;
  v_barber_salon uuid;
  v_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
begin
  select id into v_salon from public.salons where owner_id = v_owner limit 1;
  if v_salon is null then
    return json_build_object('ok', false, 'error', 'no_salon');
  end if;
  if length(v_phone) < 10 then
    return json_build_object('ok', false, 'error', 'bad_phone');
  end if;

  select id, full_name into v_user_id, v_user_name
  from public.users
  where right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = v_phone
    and role in ('barber', 'salon_owner')
  limit 1;

  if v_user_id is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_user_id = v_owner then
    return json_build_object('ok', false, 'error', 'self');
  end if;

  select id, salon_id into v_barber_id, v_barber_salon
  from public.barbers where user_id = v_user_id limit 1;

  if v_barber_id is not null then
    if v_barber_salon = v_salon then
      return json_build_object('ok', false, 'error', 'already');
    end if;
    if v_barber_salon is not null then
      return json_build_object('ok', false, 'error', 'other_salon');
    end if;
    update public.barbers set salon_id = v_salon where id = v_barber_id;
  else
    insert into public.barbers (salon_id, user_id, title, speed_multiplier)
    values (v_salon, v_user_id, 'Berber', 1.0);
  end if;

  return json_build_object('ok', true, 'name', v_user_name);
end;
$$;

create or replace function public.remove_barber_from_salon(p_barber_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_owner uuid := public.current_user_id();
begin
  update public.barbers b
  set salon_id = null
  where b.id = p_barber_id
    and exists (
      select 1 from public.salons s
      where s.id = b.salon_id and s.owner_id = v_owner
    );
  return found;
end;
$$;
