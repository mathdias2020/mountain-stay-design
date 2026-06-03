
-- ============================================
-- HELPERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Slugify (lowercase, sem acento, hífens)
CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s TEXT;
BEGIN
  s := lower(input);
  -- Remove acentos comuns
  s := translate(s,
    'áàâãäåāăąçćčđďéèêëēĕėęěğģĥíìîïĩīĭįıĵķĺļľŀłńņňŉóòôõöōŏőøŕŗřśŝşšţťŧúùûüũūŭůűųŵýÿŷźżžÁÀÂÃÄÅĀĂĄÇĆČĐĎÉÈÊËĒĔĖĘĚĞĢĤÍÌÎÏĨĪĬĮİĴĶĹĻĽĿŁŃŅŇŊÓÒÔÕÖŌŎŐØŔŖŘŚŜŞŠŢŤŦÚÙÛÜŨŪŬŮŰŲŴÝŸŶŹŻŽñÑ',
    'aaaaaaaaacccddeeeeeeeeegghiiiiiiiiijklllllnnnnoooooooooorrrsssssttuuuuuuuuuuwyyyzzzaaaaaaaaacccddeeeeeeeeegghiiiiiiiiijklllllnnnnoooooooooorrrsssssttuuuuuuuuuuwyyyzzznn');
  -- Remove qualquer caractere que não seja a-z, 0-9, espaço ou hífen
  s := regexp_replace(s, '[^a-z0-9\s-]', '', 'g');
  -- Espaços/underscores -> hífen
  s := regexp_replace(s, '[\s_]+', '-', 'g');
  -- Múltiplos hífens -> um só
  s := regexp_replace(s, '-+', '-', 'g');
  s := trim(both '-' from s);
  IF s = '' OR s IS NULL THEN
    s := 'imovel';
  END IF;
  RETURN s;
END;
$$;

-- ============================================
-- TABLE: properties
-- ============================================

CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  city TEXT NOT NULL,
  address_detail TEXT,
  google_maps_url TEXT,
  max_guests INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  parking_spots INTEGER NOT NULL DEFAULT 0,
  price_weekday NUMERIC(10,2) NOT NULL,
  price_weekend NUMERIC(10,2) NOT NULL,
  price_high_season NUMERIC(10,2),
  cleaning_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_nights_weekday INTEGER NOT NULL DEFAULT 1,
  min_nights_weekend INTEGER NOT NULL DEFAULT 2,
  high_season_dates JSONB,
  amenities JSONB,
  house_rules TEXT,
  checkin_time TEXT NOT NULL DEFAULT '14:00',
  checkout_time TEXT NOT NULL DEFAULT '11:00',
  accepts_pets BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT properties_city_check CHECK (city IN ('Domingos Martins','Pedra Azul','Marechal Floriano','Venda Nova do Imigrante','Paraju','Outro')),
  CONSTRAINT properties_status_check CHECK (status IN ('active','inactive','maintenance')),
  CONSTRAINT properties_capacity_check CHECK (max_guests > 0 AND bedrooms >= 0 AND bathrooms >= 0 AND parking_spots >= 0),
  CONSTRAINT properties_prices_check CHECK (price_weekday >= 0 AND price_weekend >= 0 AND cleaning_fee >= 0)
);

GRANT SELECT ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_public_read" ON public.properties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "properties_auth_insert" ON public.properties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "properties_auth_update" ON public.properties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "properties_auth_delete" ON public.properties FOR DELETE TO authenticated USING (true);

-- Slug auto-gen + uniqueness
CREATE OR REPLACE FUNCTION public.properties_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  i INT := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name AND NEW.slug = OLD.slug) THEN
    base := public.slugify(NEW.name);
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.properties WHERE slug = candidate AND id <> COALESCE(NEW.id, gen_random_uuid())) LOOP
      i := i + 1;
      candidate := base || '-' || i;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_properties_set_slug
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.properties_set_slug();

CREATE TRIGGER trg_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TABLE: property_photos
-- ============================================

CREATE TABLE public.property_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_photos_property ON public.property_photos(property_id);
CREATE INDEX idx_property_photos_cover ON public.property_photos(property_id, is_cover) WHERE is_cover = true;

GRANT SELECT ON public.property_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_photos TO authenticated;
GRANT ALL ON public.property_photos TO service_role;

ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photos_public_read" ON public.property_photos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "photos_auth_insert" ON public.property_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "photos_auth_update" ON public.property_photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "photos_auth_delete" ON public.property_photos FOR DELETE TO authenticated USING (true);

-- ============================================
-- TABLE: blocked_dates
-- ============================================

CREATE TABLE public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT blocked_dates_range_check CHECK (end_date >= start_date)
);

CREATE INDEX idx_blocked_dates_property_range ON public.blocked_dates(property_id, start_date, end_date);

GRANT SELECT ON public.blocked_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_dates TO authenticated;
GRANT ALL ON public.blocked_dates TO service_role;

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_public_read" ON public.blocked_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blocked_auth_insert" ON public.blocked_dates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "blocked_auth_update" ON public.blocked_dates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "blocked_auth_delete" ON public.blocked_dates FOR DELETE TO authenticated USING (true);

-- ============================================
-- TABLE: reservations
-- ============================================

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_code TEXT NOT NULL UNIQUE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  guest_name TEXT NOT NULL,
  guest_whatsapp TEXT NOT NULL,
  guest_email TEXT,
  guest_city TEXT,
  how_found TEXT,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  num_adults INTEGER NOT NULL,
  num_children INTEGER NOT NULL DEFAULT 0,
  num_pets INTEGER NOT NULL DEFAULT 0,
  num_vehicles INTEGER NOT NULL DEFAULT 0,
  total_nights INTEGER NOT NULL,
  price_breakdown JSONB,
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  guest_message TEXT,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reservations_status_check CHECK (status IN ('pending','confirmed','cancelled','completed')),
  CONSTRAINT reservations_date_range_check CHECK (checkout_date > checkin_date),
  CONSTRAINT reservations_adults_check CHECK (num_adults BETWEEN 1 AND 20),
  CONSTRAINT reservations_children_check CHECK (num_children BETWEEN 0 AND 20),
  CONSTRAINT reservations_pets_check CHECK (num_pets BETWEEN 0 AND 10),
  CONSTRAINT reservations_vehicles_check CHECK (num_vehicles BETWEEN 0 AND 10),
  CONSTRAINT reservations_nights_check CHECK (total_nights > 0),
  CONSTRAINT reservations_total_check CHECK (total_price >= 0),
  CONSTRAINT reservations_how_found_check CHECK (how_found IS NULL OR how_found IN ('Instagram','Indicação','Google','Outro')),
  CONSTRAINT reservations_whatsapp_check CHECK (guest_whatsapp ~ '^[0-9]{10,15}$'),
  CONSTRAINT reservations_terms_check CHECK (terms_accepted = true)
);

CREATE INDEX idx_reservations_property_dates ON public.reservations(property_id, checkin_date, checkout_date);
CREATE INDEX idx_reservations_status ON public.reservations(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT INSERT ON public.reservations TO anon;
GRANT ALL ON public.reservations TO service_role;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_public_insert" ON public.reservations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "reservations_auth_select" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "reservations_auth_update" ON public.reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reservations_auth_delete" ON public.reservations FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: gerar reservation_code com sequence anual
CREATE OR REPLACE FUNCTION public.reservations_generate_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  yr INT;
  seq_name TEXT;
  next_val BIGINT;
BEGIN
  IF NEW.reservation_code IS NOT NULL AND NEW.reservation_code <> '' THEN
    RETURN NEW;
  END IF;
  yr := EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::INT;
  seq_name := format('reservation_seq_%s', yr);
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND c.relname = seq_name AND n.nspname = 'public'
  ) THEN
    EXECUTE format('CREATE SEQUENCE public.%I START 1', seq_name);
  END IF;
  EXECUTE format('SELECT nextval(''public.%I'')', seq_name) INTO next_val;
  NEW.reservation_code := format('RES-%s-%s', yr, lpad(next_val::TEXT, 4, '0'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservations_generate_code
BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.reservations_generate_code();

-- ============================================
-- TABLE: reservation_documents
-- ============================================

CREATE TABLE public.reservation_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resdocs_reservation ON public.reservation_documents(reservation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_documents TO authenticated;
GRANT ALL ON public.reservation_documents TO service_role;

ALTER TABLE public.reservation_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resdocs_auth_all" ON public.reservation_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- TABLE: reservation_status_history
-- ============================================

CREATE TABLE public.reservation_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

CREATE INDEX idx_reshistory_reservation ON public.reservation_status_history(reservation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_status_history TO authenticated;
GRANT ALL ON public.reservation_status_history TO service_role;

ALTER TABLE public.reservation_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reshistory_auth_all" ON public.reservation_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger: registra histórico em mudanças de status
CREATE OR REPLACE FUNCTION public.reservations_log_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.reservation_status_history(reservation_id, old_status, new_status)
    VALUES (NEW.id, NULL, NEW.status);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.reservation_status_history(reservation_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservations_status_history
AFTER INSERT OR UPDATE OF status ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.reservations_log_status_change();

-- ============================================
-- TABLE: site_settings
-- ============================================

CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_auth_all" ON public.site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.site_settings (key, value, description) VALUES
  ('block_on_request', 'false', 'Se true, bloqueia datas ao receber solicitação. Se false, bloqueia apenas ao confirmar.'),
  ('admin_whatsapp', '27999999999', 'Número WhatsApp do admin para receber notificações (somente números com DDD)'),
  ('request_expiry_hours', '0', 'Horas para expirar solicitação pendente automaticamente. 0 = nunca expira automaticamente.');
