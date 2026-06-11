
-- Enum for legal document types
DO $$ BEGIN
  CREATE TYPE public.legal_doc_type AS ENUM ('terms', 'privacy');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type public.legal_doc_type NOT NULL,
  version INT NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_type, version)
);

CREATE UNIQUE INDEX legal_documents_current_unique
  ON public.legal_documents (doc_type) WHERE is_current = true;

CREATE INDEX legal_documents_type_version_idx
  ON public.legal_documents (doc_type, version DESC);

GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Public can only see the current version of each doc
CREATE POLICY "Public can read current legal docs"
  ON public.legal_documents FOR SELECT
  USING (is_current = true);

CREATE POLICY "Admins can read all legal docs"
  ON public.legal_documents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert legal docs"
  ON public.legal_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update legal docs"
  ON public.legal_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete legal docs"
  ON public.legal_documents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for legal-documents bucket
-- Reading is via signed URLs generated server-side; only admins can list/manage
CREATE POLICY "Admins can read legal-documents objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'legal-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload legal-documents objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'legal-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update legal-documents objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'legal-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete legal-documents objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'legal-documents' AND public.has_role(auth.uid(), 'admin'));
