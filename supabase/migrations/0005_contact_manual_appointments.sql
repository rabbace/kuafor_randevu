-- ============================================================================
-- Telefon zorunluluğu, berber adres/konum, WhatsApp ve elle girilen randevular
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BARBERS: kendi adresi / konumu / WhatsApp numarası (salon adresinden farklı olabilir)
-- ----------------------------------------------------------------------------
alter table public.barbers
  add column address text,
  add column latitude double precision,
  add column longitude double precision,
  add column whatsapp_phone text;

-- ----------------------------------------------------------------------------
-- APPOINTMENTS: uygulama dışından (telefon/elden) gelen randevuları berber girebilsin
-- ----------------------------------------------------------------------------
alter table public.appointments
  alter column customer_id drop not null,
  add column is_manual_entry boolean not null default false,
  add column manual_customer_name text,
  add column manual_customer_phone text;

alter table public.appointments
  add constraint manual_entry_requires_name check (
    (is_manual_entry = false and customer_id is not null)
    or (is_manual_entry = true and manual_customer_name is not null)
  );

-- ----------------------------------------------------------------------------
-- RLS: berber/salon sahibi kendi salonuna elle randevu girebilsin
-- ----------------------------------------------------------------------------
drop policy if exists "appointments_insert_customer" on public.appointments;

create policy "appointments_insert_customer" on public.appointments
  for insert with check (
    (is_manual_entry = false and customer_id = public.current_user_id())
    or (
      is_manual_entry = true
      and customer_id is null
      and (public.is_salon_owner(salon_id) or public.is_salon_barber(salon_id))
    )
  );
