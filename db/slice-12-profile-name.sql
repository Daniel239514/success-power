-- Slice 12, Step A: store the subscriber's display name on their profile so
-- the Profile screen can show it and let them edit it. Nullable — existing
-- users have no name until they type one on /profile.
-- Paste into the Supabase SQL Editor and Run.

alter table public.profiles
  add column if not exists full_name text;
