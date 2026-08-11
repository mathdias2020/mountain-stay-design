-- ============================================================
-- Fase 1: estrutura do motor de precificação
-- ============================================================

-- 1. Campos novos na propriedade
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS base_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS included_guests integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_guest_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pet_fee_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pet_fee_mode text NOT NULL DEFAULT 'per_reservation',
  ADD COLUMN IF NOT EXISTS pet_fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleaning_fee_short numeric,
  ADD COLUMN IF NOT EXISTS cleaning_fee_short_max_nights integer;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_pet_fee_mode_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_pet_fee_mode_check
  CHECK (pet_fee_mode IN ('per_reservation','per_night','per_pet','per_pet_night'));

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_base_price_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_base_price_check CHECK (base_price >= 0);

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_included_guests_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_included_guests_check CHECK (included_guests >= 1);

-- 2. Preço por dia da semana (0 = domingo ... 6 = sábado)
CREATE TABLE IF NOT EXISTS public.property_weekday_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  price numeric NOT NULL CHECK (price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_weekday_prices TO authenticated;
GRANT ALL ON public.property_weekday_prices TO service_role;
ALTER TABLE public.property_weekday_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage weekday prices" ON public.property_weekday_prices
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_property_weekday_prices_updated BEFORE UPDATE ON public.property_weekday_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Override manual por data
CREATE TABLE IF NOT EXISTS public.property_date_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date date NOT NULL,
  price numeric CHECK (price IS NULL OR price >= 0),
  min_nights integer CHECK (min_nights IS NULL OR min_nights >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, date)
);
CREATE INDEX IF NOT EXISTS idx_property_date_prices_prop_date
  ON public.property_date_prices (property_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_date_prices TO authenticated;
GRANT ALL ON public.property_date_prices TO service_role;
ALTER TABLE public.property_date_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage date prices" ON public.property_date_prices
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_property_date_prices_updated BEFORE UPDATE ON public.property_date_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Regras sazonais
CREATE TABLE IF NOT EXISTS public.property_seasonal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price_fixed numeric CHECK (price_fixed IS NULL OR price_fixed >= 0),
  adjust_percent numeric CHECK (adjust_percent IS NULL OR adjust_percent BETWEEN -100 AND 500),
  min_nights integer CHECK (min_nights IS NULL OR min_nights >= 1),
  max_nights integer CHECK (max_nights IS NULL OR max_nights >= 1),
  priority integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (price_fixed IS NOT NULL OR adjust_percent IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_property_seasonal_rules_prop
  ON public.property_seasonal_rules (property_id, start_date, end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_seasonal_rules TO authenticated;
GRANT ALL ON public.property_seasonal_rules TO service_role;
ALTER TABLE public.property_seasonal_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage seasonal rules" ON public.property_seasonal_rules
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_property_seasonal_rules_updated BEFORE UPDATE ON public.property_seasonal_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Promoções por período
CREATE TABLE IF NOT EXISTS public.property_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  discount_percent numeric NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_property_promotions_prop
  ON public.property_promotions (property_id, start_date, end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_promotions TO authenticated;
GRANT ALL ON public.property_promotions TO service_role;
ALTER TABLE public.property_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage promotions" ON public.property_promotions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_property_promotions_updated BEFORE UPDATE ON public.property_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Desconto por duração
CREATE TABLE IF NOT EXISTS public.property_length_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  min_nights integer NOT NULL CHECK (min_nights >= 2),
  discount_percent numeric NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, min_nights)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_length_discounts TO authenticated;
GRANT ALL ON public.property_length_discounts TO service_role;
ALTER TABLE public.property_length_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage length discounts" ON public.property_length_discounts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_property_length_discounts_updated BEFORE UPDATE ON public.property_length_discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Desconto de última hora
CREATE TABLE IF NOT EXISTS public.property_lastminute_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  days_before integer NOT NULL CHECK (days_before >= 0),
  discount_percent numeric NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, days_before)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_lastminute_discounts TO authenticated;
GRANT ALL ON public.property_lastminute_discounts TO service_role;
ALTER TABLE public.property_lastminute_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage lastminute discounts" ON public.property_lastminute_discounts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_property_lastminute_updated BEFORE UPDATE ON public.property_lastminute_discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Taxas adicionais
CREATE TABLE IF NOT EXISTS public.property_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  calc_mode text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_fees_calc_mode_check CHECK (calc_mode IN (
    'fixed_per_reservation','per_night','per_guest','per_guest_night',
    'per_pet','per_pet_night','percent_of_lodging'
  ))
);
CREATE INDEX IF NOT EXISTS idx_property_fees_prop ON public.property_fees (property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_fees TO authenticated;
GRANT ALL ON public.property_fees TO service_role;
ALTER TABLE public.property_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage fees" ON public.property_fees
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_property_fees_updated BEFORE UPDATE ON public.property_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Impostos
CREATE TABLE IF NOT EXISTS public.property_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate_percent numeric CHECK (rate_percent IS NULL OR (rate_percent >= 0 AND rate_percent <= 100)),
  fixed_amount numeric CHECK (fixed_amount IS NULL OR fixed_amount >= 0),
  base_lodging boolean NOT NULL DEFAULT true,
  base_cleaning boolean NOT NULL DEFAULT false,
  base_pet boolean NOT NULL DEFAULT false,
  base_extra_guests boolean NOT NULL DEFAULT false,
  base_fees boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (rate_percent IS NOT NULL OR fixed_amount IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_property_taxes_prop ON public.property_taxes (property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_taxes TO authenticated;
GRANT ALL ON public.property_taxes TO service_role;
ALTER TABLE public.property_taxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage taxes" ON public.property_taxes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_property_taxes_updated BEFORE UPDATE ON public.property_taxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 10. Migração dos dados existentes
-- ============================================================

-- preço-base = preço de dia de semana atual
UPDATE public.properties SET base_price = price_weekday WHERE base_price = 0;

-- hóspedes incluídos: por padrão todos (sem cobrança extra)
UPDATE public.properties SET included_guests = GREATEST(1, max_guests) WHERE included_guests = 1;

-- taxa de pet herdada: nenhuma cobrança configurada hoje
-- sexta (5) e sábado (6) recebem o preço de fim de semana quando diferente do base
INSERT INTO public.property_weekday_prices (property_id, weekday, price)
SELECT p.id, w.weekday, p.price_weekend
FROM public.properties p
CROSS JOIN (VALUES (5::smallint), (6::smallint)) AS w(weekday)
WHERE p.price_weekend IS DISTINCT FROM p.price_weekday
ON CONFLICT (property_id, weekday) DO NOTHING;

-- alta temporada atual (jsonb) -> regras sazonais com preço fixo
INSERT INTO public.property_seasonal_rules
  (property_id, name, start_date, end_date, price_fixed, priority, active)
SELECT
  p.id,
  'Alta temporada',
  (r->>'start')::date,
  (r->>'end')::date,
  p.price_high_season,
  10,
  true
FROM public.properties p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(p.high_season_dates) = 'array' THEN p.high_season_dates ELSE '[]'::jsonb END
) AS r
WHERE p.price_high_season IS NOT NULL
  AND (r->>'start') IS NOT NULL
  AND (r->>'end') IS NOT NULL
  AND (r->>'end')::date >= (r->>'start')::date;