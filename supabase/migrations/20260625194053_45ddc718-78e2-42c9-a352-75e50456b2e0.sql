
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cities_public_read_active"
  ON public.cities FOR SELECT
  USING (active = true);

CREATE POLICY "cities_admin_read_all"
  ON public.cities FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cities_admin_insert"
  ON public.cities FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cities_admin_update"
  ON public.cities FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cities_admin_delete"
  ON public.cities FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed das 5 cidades padrão
INSERT INTO public.cities (name, slug, sort_order) VALUES
  ('Domingos Martins',         public.slugify('Domingos Martins'),         10),
  ('Pedra Azul',               public.slugify('Pedra Azul'),               20),
  ('Marechal Floriano',        public.slugify('Marechal Floriano'),        30),
  ('Venda Nova do Imigrante',  public.slugify('Venda Nova do Imigrante'),  40),
  ('Paraju',                   public.slugify('Paraju'),                   50)
ON CONFLICT (name) DO NOTHING;

-- Cobre qualquer cidade extra já usada em propriedades existentes
INSERT INTO public.cities (name, slug, sort_order)
SELECT DISTINCT p.city, public.slugify(p.city), 100
FROM public.properties p
WHERE p.city IS NOT NULL
  AND btrim(p.city) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.cities c WHERE c.name = p.city)
ON CONFLICT (name) DO NOTHING;
