CREATE TABLE public.property_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  city text NOT NULL,
  house_description text NOT NULL,
  bedrooms integer NOT NULL,
  max_guests integer NOT NULL,
  desired_daily_rate numeric(10,2) NOT NULL,
  photo_url text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pendente',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_submissions_status_check
    CHECK (status IN ('pendente','em_analise','aprovada','recusada','arquivada'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_submissions TO authenticated;
GRANT INSERT ON public.property_submissions TO anon;
GRANT ALL ON public.property_submissions TO service_role;

ALTER TABLE public.property_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_public_insert"
  ON public.property_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "submissions_admin_select"
  ON public.property_submissions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "submissions_admin_update"
  ON public.property_submissions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "submissions_admin_delete"
  ON public.property_submissions FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE TRIGGER property_submissions_set_updated_at
  BEFORE UPDATE ON public.property_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_property_submissions_status ON public.property_submissions(status);
CREATE INDEX idx_property_submissions_created ON public.property_submissions(created_at DESC);