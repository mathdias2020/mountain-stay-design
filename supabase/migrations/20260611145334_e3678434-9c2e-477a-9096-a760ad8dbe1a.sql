CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_path TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  button_label TEXT NOT NULL DEFAULT 'Ver hospedagens',
  button_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT events_date_range_chk CHECK (end_date >= start_date)
);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active events"
  ON public.events FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX events_active_dates_idx ON public.events (is_active, end_date, sort_order);

-- Storage policies for event-photos bucket (bucket created via storage tool)
CREATE POLICY "Public can read event photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

CREATE POLICY "Admins can upload event photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update event photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete event photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-photos' AND public.has_role(auth.uid(), 'admin'));
