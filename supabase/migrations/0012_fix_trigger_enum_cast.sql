-- ============================================================================
-- 0008'deki trigger, text tipindeki v_role değişkenini enum tipindeki
-- users.role kolonuna cast'siz insert etmeye çalışıyordu; PostgreSQL bunu
-- reddedince her signup HTTP 500 (unexpected_failure) ile düşüyordu.
-- Düzeltme: explicit ::user_role cast + hata olursa signup'ı asla bozmayan
-- exception guard.
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
  if v_role not in ('customer', 'barber', 'salon_owner') then
    v_role := 'customer';
  end if;

  begin
    insert into public.users (auth_id, full_name, phone, avatar_url, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'avatar_url',
      v_role::public.user_role
    )
    on conflict (auth_id) do nothing;
  exception when others then
    -- Profil satırı oluşturulamasa bile auth kaydı tamamlansın;
    -- hata Postgres loglarına düşer, signup 500 dönmez.
    raise warning 'handle_new_auth_user failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
