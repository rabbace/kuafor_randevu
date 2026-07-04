-- ============================================================================
-- Sadakat ödülünü berber tanımlar: TL indirim ya da serbest metin ödül
-- (ör. "1 sakal tıraşı bedava", "1 kaş/bıyık alma bedava").
-- reward_type: 'discount' -> loyalty_redeem_amount TL indirim
--              'custom'   -> loyalty_reward_text içeriği (fiyat değişmez,
--                            randevu notuna işlenir)
-- ============================================================================
alter table public.salons
  add column if not exists loyalty_reward_type text not null default 'discount'
    check (loyalty_reward_type in ('discount', 'custom'));

alter table public.salons
  add column if not exists loyalty_reward_text text;
