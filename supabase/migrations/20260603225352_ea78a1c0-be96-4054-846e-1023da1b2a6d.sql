
-- property-photos: leitura pública, escrita autenticada
CREATE POLICY "property_photos_public_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'property-photos');

CREATE POLICY "property_photos_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "property_photos_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-photos') WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "property_photos_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-photos');

-- reservation-docs: tudo autenticado
CREATE POLICY "reservation_docs_auth_all"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'reservation-docs') WITH CHECK (bucket_id = 'reservation-docs');
