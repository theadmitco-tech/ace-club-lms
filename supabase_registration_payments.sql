-- Registration + Razorpay payments for public Ace Club cohort checkout.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 8 CHECK (capacity > 0),
  ADD COLUMN IF NOT EXISTS price_amount INTEGER NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_note TEXT;

CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  target_gmat_date DATE,
  consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'failed', 'expired', 'cancelled')),
  reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE NOT NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS registrations_course_status_idx ON public.registrations(course_id, status);
CREATE INDEX IF NOT EXISTS registrations_email_idx ON public.registrations(LOWER(email));
CREATE INDEX IF NOT EXISTS registrations_reserved_until_idx ON public.registrations(reserved_until);
CREATE INDEX IF NOT EXISTS payments_registration_idx ON public.payments(registration_id);
CREATE INDEX IF NOT EXISTS payments_order_idx ON public.payments(razorpay_order_id);

CREATE OR REPLACE FUNCTION public.set_registration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_registrations_updated_at ON public.registrations;
CREATE TRIGGER set_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_registration_updated_at();

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_registration_updated_at();

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage registrations" ON public.registrations;
CREATE POLICY "Admins can manage registrations" ON public.registrations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Public registration writes and payment verification use service-role API routes.
