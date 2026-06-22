
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_method TEXT
  CHECK (payment_method IN ('pix','card'));

INSERT INTO public.site_settings (key, value) VALUES
  ('pix_key', '37.412.135/0001-74'),
  ('pix_beneficiary', 'SARAH PETERLI KUNERT'),
  ('pix_qr_code_path', '')
ON CONFLICT (key) DO NOTHING;
