-- Slice 12: profile pictures.
--
-- Users upload their avatar straight from the BROWSER to Supabase Storage
-- (same approach as the admin audio upload in Slice 10). Unlike audio — which
-- only admins may touch — ANY logged-in user may upload, but ONLY into a folder
-- named after their own user id. That keeps one user from overwriting another's
-- picture. The `avatars` bucket is public-read so <img> tags can show it.
--
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

-- 1. Where we store the picture's URL on the profile.
alter table public.profiles
  add column if not exists avatar_url text;

-- 2. The public bucket (created here so you don't have to click through the UI).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Write rules: a user may only manage files inside a folder matching their
--    own id, e.g. "<their-uid>/avatar-123.jpg". (storage.foldername(name))[1] is
--    that first folder segment.
drop policy if exists "Users manage own avatar (insert)" on storage.objects;
drop policy if exists "Users manage own avatar (update)" on storage.objects;
drop policy if exists "Users manage own avatar (delete)" on storage.objects;

create policy "Users manage own avatar (insert)"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users manage own avatar (update)"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users manage own avatar (delete)"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
