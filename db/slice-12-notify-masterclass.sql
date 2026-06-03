-- Slice 12, Step H: a third per-user notification switch for masterclass /
-- announcement pushes. Same pattern as notify_daily / notify_streak (Slice 9):
-- a boolean column on profiles, default TRUE so users are opted in. There's no
-- masterclass cron yet — this flag is stored now so it's ready when that
-- feature ships.
-- Paste into the Supabase SQL Editor and Run.

alter table public.profiles
  add column if not exists notify_masterclass boolean not null default true;
