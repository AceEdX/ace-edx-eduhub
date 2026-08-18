drop policy if exists "media member read" on storage.objects;
create policy "media member read" on storage.objects for select to authenticated using (bucket_id = 'media');

drop policy if exists "media admin write" on storage.objects;
create policy "media admin write" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));

drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));

drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));

alter table public.media_assets add column if not exists source_url text;
alter table public.media_assets add column if not exists clip_start_sec integer;
alter table public.media_assets add column if not exists clip_end_sec integer;
alter table public.social_publications add column if not exists error text;