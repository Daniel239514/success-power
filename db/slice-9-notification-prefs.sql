-- Slice 9, Step J: per-user notification on/off switches.
-- Both default TRUE so existing users stay opted in (Postgres backfills
-- existing rows with the default). Crons check these before sending.
-- Paste into the Supabase SQL Editor and Run.

alter table public.profiles
  add column if not exists notify_daily  boolean not null default true,
  add column if not exists notify_streak boolean not null default true;
