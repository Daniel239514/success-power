-- Slice 9, Step H: store each user's IANA time zone on their profile so the
-- hourly cron can tell when it's 6 AM for them. Nullable — it gets filled in
-- by the browser (TimezoneSync) the next time the user opens the app.
-- Paste into the Supabase SQL Editor and Run.

alter table public.profiles
  add column if not exists timezone text;
