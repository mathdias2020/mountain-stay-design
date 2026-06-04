
-- 1. is_admin() helper
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  )
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. properties: drop permissive auth policies, recreate admin-only
drop policy if exists properties_auth_insert on public.properties;
drop policy if exists properties_auth_update on public.properties;
drop policy if exists properties_auth_delete on public.properties;
create policy properties_admin_insert on public.properties for insert to authenticated with check (public.is_admin());
create policy properties_admin_update on public.properties for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy properties_admin_delete on public.properties for delete to authenticated using (public.is_admin());

-- 3. property_photos
drop policy if exists photos_auth_insert on public.property_photos;
drop policy if exists photos_auth_update on public.property_photos;
drop policy if exists photos_auth_delete on public.property_photos;
create policy photos_admin_insert on public.property_photos for insert to authenticated with check (public.is_admin());
create policy photos_admin_update on public.property_photos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy photos_admin_delete on public.property_photos for delete to authenticated using (public.is_admin());

-- 4. blocked_dates
drop policy if exists blocked_auth_insert on public.blocked_dates;
drop policy if exists blocked_auth_update on public.blocked_dates;
drop policy if exists blocked_auth_delete on public.blocked_dates;
create policy blocked_admin_insert on public.blocked_dates for insert to authenticated with check (public.is_admin());
create policy blocked_admin_update on public.blocked_dates for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy blocked_admin_delete on public.blocked_dates for delete to authenticated using (public.is_admin());

-- 5. reservations: keep public insert; admin-only select/update/delete
drop policy if exists reservations_auth_select on public.reservations;
drop policy if exists reservations_auth_update on public.reservations;
drop policy if exists reservations_auth_delete on public.reservations;
create policy reservations_admin_select on public.reservations for select to authenticated using (public.is_admin());
create policy reservations_admin_update on public.reservations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reservations_admin_delete on public.reservations for delete to authenticated using (public.is_admin());

-- 6. reservation_documents
drop policy if exists resdocs_auth_all on public.reservation_documents;
create policy resdocs_admin_select on public.reservation_documents for select to authenticated using (public.is_admin());
create policy resdocs_admin_insert on public.reservation_documents for insert to authenticated with check (public.is_admin());
create policy resdocs_admin_update on public.reservation_documents for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy resdocs_admin_delete on public.reservation_documents for delete to authenticated using (public.is_admin());

-- 7. reservation_status_history: trigger inserts under caller; keep INSERT permissive (anon+auth) for public reserva flow; admin-only read/update/delete
drop policy if exists reshistory_auth_all on public.reservation_status_history;
create policy reshistory_trigger_insert on public.reservation_status_history for insert to anon, authenticated with check (true);
create policy reshistory_admin_select on public.reservation_status_history for select to authenticated using (public.is_admin());
create policy reshistory_admin_update on public.reservation_status_history for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reshistory_admin_delete on public.reservation_status_history for delete to authenticated using (public.is_admin());

-- 8. site_settings
drop policy if exists settings_auth_all on public.site_settings;
create policy settings_admin_select on public.site_settings for select to authenticated using (public.is_admin());
create policy settings_admin_insert on public.site_settings for insert to authenticated with check (public.is_admin());
create policy settings_admin_update on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_admin_delete on public.site_settings for delete to authenticated using (public.is_admin());

-- 9. user_roles: keep self-read; explicit admin-only writes
create policy user_roles_admin_insert on public.user_roles for insert to authenticated with check (public.is_admin());
create policy user_roles_admin_update on public.user_roles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy user_roles_admin_delete on public.user_roles for delete to authenticated using (public.is_admin());

-- 10. storage: property-photos (public read kept) + reservation-docs (admin-only)
drop policy if exists property_photos_auth_insert on storage.objects;
drop policy if exists property_photos_auth_update on storage.objects;
drop policy if exists property_photos_auth_delete on storage.objects;
create policy property_photos_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'property-photos' and public.is_admin());
create policy property_photos_admin_update on storage.objects for update to authenticated using (bucket_id = 'property-photos' and public.is_admin()) with check (bucket_id = 'property-photos' and public.is_admin());
create policy property_photos_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'property-photos' and public.is_admin());

drop policy if exists reservation_docs_auth_all on storage.objects;
drop policy if exists reservation_docs_auth_select on storage.objects;
drop policy if exists reservation_docs_auth_insert on storage.objects;
drop policy if exists reservation_docs_auth_update on storage.objects;
drop policy if exists reservation_docs_auth_delete on storage.objects;
create policy reservation_docs_admin_select on storage.objects for select to authenticated using (bucket_id = 'reservation-docs' and public.is_admin());
create policy reservation_docs_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'reservation-docs' and public.is_admin());
create policy reservation_docs_admin_update on storage.objects for update to authenticated using (bucket_id = 'reservation-docs' and public.is_admin()) with check (bucket_id = 'reservation-docs' and public.is_admin());
create policy reservation_docs_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'reservation-docs' and public.is_admin());
