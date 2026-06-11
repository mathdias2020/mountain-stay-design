
-- 1. Table
CREATE TABLE public.instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path TEXT NOT NULL,
  caption TEXT,
  post_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.instagram_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_posts TO authenticated;
GRANT ALL ON public.instagram_posts TO service_role;

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active instagram posts"
  ON public.instagram_posts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can read all instagram posts"
  ON public.instagram_posts FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert instagram posts"
  ON public.instagram_posts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update instagram posts"
  ON public.instagram_posts FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete instagram posts"
  ON public.instagram_posts FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE TRIGGER trg_instagram_posts_updated_at
  BEFORE UPDATE ON public.instagram_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX instagram_posts_active_order_idx
  ON public.instagram_posts (is_active, sort_order, created_at DESC);

-- 2. Storage policies for bucket 'instagram-photos' (admin-only writes; reads via signed URL)
CREATE POLICY "Admins can upload instagram photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'instagram-photos' AND public.is_admin());

CREATE POLICY "Admins can read instagram photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'instagram-photos' AND public.is_admin());

CREATE POLICY "Admins can update instagram photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'instagram-photos' AND public.is_admin());

CREATE POLICY "Admins can delete instagram photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'instagram-photos' AND public.is_admin());
