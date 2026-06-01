-- Slice 9, Step B: web push subscriptions
-- One row per device/browser. A single user can have many rows.
-- Paste this into the Supabase SQL Editor and click Run.

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh_key  text not null,
  auth_key    text not null,
  created_at  timestamptz not null default now()
);

-- Speeds up "find all subscriptions for this user" (the cron + test endpoint do this a lot).
create index push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- Turn on row-level security. This flips the default to DENY-ALL until policies are added.
alter table public.push_subscriptions enable row level security;

-- A user may read their own subscriptions.
create policy "Users can view their own push subscriptions"
  on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

-- A user may add a subscription, but only one that belongs to themselves.
create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions
  for insert
  with check (auth.uid() = user_id);

-- A user may delete their own subscriptions (e.g. when turning notifications off).
create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions
  for delete
  using (auth.uid() = user_id);
