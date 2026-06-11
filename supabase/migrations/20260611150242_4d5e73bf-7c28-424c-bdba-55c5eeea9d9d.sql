CREATE TYPE public.attraction_category AS ENUM ('atracao', 'restaurante', 'passeio');

CREATE TABLE public.attractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category public.attraction_category NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,
  city TEXT NOT NULL,
  external_url TEXT,
  cover_image_path TEXT NOT NULL,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, slug)
);

GRANT SELECT ON public.attractions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attractions TO authenticated;
GRANT ALL ON public.attractions TO service_role;

ALTER TABLE public.attractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active attractions"
  ON public.attractions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all attractions"
  ON public.attractions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert attractions"
  ON public.attractions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update attractions"
  ON public.attractions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete attractions"
  ON public.attractions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Slug auto-generation
CREATE OR REPLACE FUNCTION public.attractions_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  i INT := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title AND NEW.slug = OLD.slug) THEN
    base := public.slugify(NEW.title);
    candidate := base;
    WHILE EXISTS (
      SELECT 1 FROM public.attractions
      WHERE category = NEW.category AND slug = candidate
        AND id <> COALESCE(NEW.id, gen_random_uuid())
    ) LOOP
      i := i + 1;
      candidate := base || '-' || i;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER attractions_set_slug_trigger
  BEFORE INSERT OR UPDATE ON public.attractions
  FOR EACH ROW EXECUTE FUNCTION public.attractions_set_slug();

CREATE TRIGGER update_attractions_updated_at
  BEFORE UPDATE ON public.attractions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX attractions_category_active_idx ON public.attractions (category, is_active, sort_order);

-- Storage policies for attraction-photos bucket (bucket created via storage tool)
CREATE POLICY "Public can read attraction photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attraction-photos');

CREATE POLICY "Admins can upload attraction photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attraction-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update attraction photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'attraction-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete attraction photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'attraction-photos' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for home-assets bucket (bucket created via storage tool)
CREATE POLICY "Public can read home assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'home-assets');

CREATE POLICY "Admins can upload home assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'home-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update home assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'home-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete home assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'home-assets' AND public.has_role(auth.uid(), 'admin'));
