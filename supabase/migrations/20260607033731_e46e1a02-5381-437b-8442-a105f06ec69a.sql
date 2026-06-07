
CREATE POLICY "submission_photos_public_insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'submission-photos');

CREATE POLICY "submission_photos_admin_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'submission-photos' AND public.is_admin());

CREATE POLICY "submission_photos_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'submission-photos' AND public.is_admin());
