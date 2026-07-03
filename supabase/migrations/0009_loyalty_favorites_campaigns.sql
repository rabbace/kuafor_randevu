-- Salon loyalty toggle
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT true;

-- Customer favorite barbers
CREATE TABLE IF NOT EXISTS public.favorite_barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, barber_id)
);
ALTER TABLE public.favorite_barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_manage_customer" ON public.favorite_barbers
  FOR ALL USING (customer_id = public.current_user_id())
  WITH CHECK (customer_id = public.current_user_id());
CREATE POLICY "favorites_select_barber" ON public.favorite_barbers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND b.user_id = public.current_user_id())
  );

-- Campaign notifications
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'favorites', -- 'favorites' | 'all_customers'
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_manage_owner" ON public.campaigns
  FOR ALL USING (public.is_salon_owner(salon_id))
  WITH CHECK (public.is_salon_owner(salon_id));
