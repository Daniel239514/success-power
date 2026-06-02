-- Slice 10, Step D: let admins manage files in the `audio` Storage bucket.
--
-- The episode upload happens straight from the admin's BROWSER to Supabase
-- Storage (big files can't go through our serverless functions). That browser
-- upload runs with the admin's own login, so Storage needs a rule that says
-- "a logged-in admin is allowed to write to the audio bucket." Without this you
-- get a row-level-security error the moment you try to upload.
--
-- Files (the audio) are stored in storage.objects. These policies check two
-- things: the file is in the 'audio' bucket, AND the person is an admin.
--
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

-- Re-runnable: drop old copies first.
drop policy if exists "Admins can upload audio" on storage.objects;
drop policy if exists "Admins can update audio" on storage.objects;
drop policy if exists "Admins can delete audio" on storage.objects;

-- A small helper so we don't repeat the admin check three times. Returns true
-- only if the currently logged-in user's profile role is 'admin'.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- INSERT = uploading a new file.
create policy "Admins can upload audio"
on storage.objects for insert
to authenticated
with check (bucket_id = 'audio' and public.is_admin());

-- UPDATE = overwriting an existing file (we upload with "upsert", so re-uploading
-- the same day's audio replaces it).
create policy "Admins can update audio"
on storage.objects for update
to authenticated
using (bucket_id = 'audio' and public.is_admin())
with check (bucket_id = 'audio' and public.is_admin());

-- DELETE = removing a file (used in Step E when an episode is deleted).
create policy "Admins can delete audio"
on storage.objects for delete
to authenticated
using (bucket_id = 'audio' and public.is_admin());
