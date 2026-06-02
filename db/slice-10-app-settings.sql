-- Slice 10, Step I: global app settings (a single row of on/off switches).
--
-- The cron jobs read these before sending notifications, so an admin can
-- globally silence a whole notification type (e.g. turn off streak reminders
-- for everyone) without touching code.
--
-- Design: ONE row, identified by id = 1. The check constraint guarantees the
-- table can never hold more than that single row.
--
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

create table if not exists public.app_settings (
  id                      int primary key default 1,
  notify_daily_enabled    boolean not null default true,
  notify_streak_enabled   boolean not null default true,
  notify_renewal_enabled  boolean not null default true,
  constraint app_settings_single_row check (id = 1)
);

-- Make sure the single row exists (does nothing if it's already there).
insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

-- Lock it down. With RLS ON and NO policies, normal logged-in users can neither
-- read nor write this table through the public API. The only things that touch
-- it are: the cron jobs and the admin settings page — both of which use the
-- service-role key, which bypasses RLS. So no policy is needed.
alter table public.app_settings enable row level security;
