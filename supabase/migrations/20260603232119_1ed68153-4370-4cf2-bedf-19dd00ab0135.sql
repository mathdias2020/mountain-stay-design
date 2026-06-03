
-- Triggers de reservations
DROP TRIGGER IF EXISTS trg_reservations_generate_code ON public.reservations;
CREATE TRIGGER trg_reservations_generate_code
BEFORE INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.reservations_generate_code();

DROP TRIGGER IF EXISTS trg_reservations_log_status_change ON public.reservations;
CREATE TRIGGER trg_reservations_log_status_change
AFTER INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.reservations_log_status_change();

-- Storage policies para o bucket privado reservation-docs
DROP POLICY IF EXISTS "reservation_docs_auth_select" ON storage.objects;
CREATE POLICY "reservation_docs_auth_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reservation-docs');

DROP POLICY IF EXISTS "reservation_docs_auth_insert" ON storage.objects;
CREATE POLICY "reservation_docs_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reservation-docs');

DROP POLICY IF EXISTS "reservation_docs_auth_update" ON storage.objects;
CREATE POLICY "reservation_docs_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reservation-docs')
WITH CHECK (bucket_id = 'reservation-docs');

DROP POLICY IF EXISTS "reservation_docs_auth_delete" ON storage.objects;
CREATE POLICY "reservation_docs_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reservation-docs');
