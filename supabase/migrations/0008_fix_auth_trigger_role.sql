-- Trigger'ı güncelle: signUp sırasında gönderilen rol ve isim meta verisini oku.
-- Önceki versiyon her zaman 'customer' yazıyordu.

create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  v_role text;
begin
  -- signUp options.data içinden rol oku; geçerli değilse 'customer' kullan
  v_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
  if v_role not in ('customer', 'barber', 'salon_owner') then
    v_role := 'customer';
  end if;

  insert into public.users (auth_id, full_name, phone, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    v_role
  )
  on conflict (auth_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
