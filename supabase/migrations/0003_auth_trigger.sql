-- ============================================================================
-- auth.users içine yeni kayıt girince otomatik public.users satırı oluştur
-- Google/Apple SSO dahil tüm provider'lar için çalışır.
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (auth_id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'customer'
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
