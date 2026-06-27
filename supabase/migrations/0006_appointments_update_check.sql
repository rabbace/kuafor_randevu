-- ============================================================================
-- appointments_update politikası WITH CHECK içermiyordu: bir müşteri kendi
-- randevusunun status alanını (ör. "completed" yaparak sadakat puanı
-- tetiklemek, ya da "confirmed" yaparak onay akışını atlamak) ya da diğer
-- alanlarını (barber_id, start_time, end_time...) doğrudan Supabase client
-- üzerinden değiştirebiliyordu. RLS'in WITH CHECK ifadesi yalnızca yeni
-- satırı görür, eski satırla karşılaştırma yapamaz; bu yüzden alan bazlı
-- değişmezlik bir BEFORE UPDATE trigger ile uygulanıyor.
-- ============================================================================

drop policy if exists "appointments_update" on public.appointments;

create policy "appointments_update_staff" on public.appointments
  for update using (
    public.is_salon_owner(salon_id) or public.is_salon_barber(salon_id)
  ) with check (
    public.is_salon_owner(salon_id) or public.is_salon_barber(salon_id)
  );

create policy "appointments_update_customer_cancel" on public.appointments
  for update using (
    customer_id = public.current_user_id()
    and status in ('pending', 'confirmed')
  ) with check (
    customer_id = public.current_user_id()
  );

-- Salon sahibi/berber olmayan (müşteri) bir kullanıcı sadece kendi randevusunu
-- "cancelled" durumuna çekebilir; başka hiçbir alanı değiştiremez.
create or replace function public.enforce_customer_cancel_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_salon_owner(new.salon_id) or public.is_salon_barber(new.salon_id) then
    return new;
  end if;

  if new.status is distinct from 'cancelled'
    or old.salon_id is distinct from new.salon_id
    or old.barber_id is distinct from new.barber_id
    or old.service_id is distinct from new.service_id
    or old.customer_id is distinct from new.customer_id
    or old.start_time is distinct from new.start_time
    or old.end_time is distinct from new.end_time
    or old.is_manual_entry is distinct from new.is_manual_entry
    or old.manual_customer_name is distinct from new.manual_customer_name
    or old.manual_customer_phone is distinct from new.manual_customer_phone
  then
    raise exception 'Müşteriler yalnızca kendi randevularını iptal edebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_enforce_customer_cancel on public.appointments;

create trigger appointments_enforce_customer_cancel
  before update on public.appointments
  for each row
  execute function public.enforce_customer_cancel_only();
