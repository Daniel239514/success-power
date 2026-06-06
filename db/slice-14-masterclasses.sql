-- Slice 14, Step A: masterclasses table.
--
-- Stores upcoming, live, and past masterclass events. Any logged-in user can
-- see upcoming/live events and any past event with a published replay.
-- Only admins can create/edit/delete.
--
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Safe to re-run (drops policies/trigger first).

create table if not exists public.masterclasses (
  id                uuid primary key default gen_random_uuid(),

  title             text not null,
  description       text not null default '',

  -- When the live event is / was scheduled. Stored with timezone so it can be
  -- displayed correctly in any region.
  event_date        timestamptz not null,

  duration_minutes  int not null default 60,

  -- Two prices so the admin can advertise a members discount.
  -- members_price is shown to active subscribers; general_price to everyone else.
  members_price     numeric(10,2) not null default 0,
  general_price     numeric(10,2) not null default 0,

  currency          text not null default 'NGN'
                      check (currency in ('NGN', 'USD')),

  -- Paste the Paystack or Stripe payment link URL here.
  checkout_url      text not null default '',

  -- Added after the event; null until the admin uploads/links the recording.
  replay_url        text,

  -- Flipped to true by the admin when the replay is ready for subscribers.
  replay_published  boolean not null default false,

  -- Lifecycle badge shown in the admin list and on the subscriber screen.
  status            text not null default 'upcoming'
                      check (status in ('upcoming', 'live', 'past')),

  thumbnail_url     text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Subscriber screen most often asks: "what upcoming/live events exist, sorted by date?"
create index if not exists masterclasses_status_date_idx
  on public.masterclasses (status, event_date desc);

-- Replay library query: past + published, reverse date order.
create index if not exists masterclasses_replay_idx
  on public.masterclasses (replay_published, event_date desc);

-- set_updated_at already exists if slice-13-posts.sql ran, but create or replace
-- is idempotent so it's safe to include here too.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_masterclasses_updated_at on public.masterclasses;

create trigger trg_masterclasses_updated_at
  before update on public.masterclasses
  for each row
  execute function public.set_updated_at();


-- Row-level security.
alter table public.masterclasses enable row level security;

-- Re-runnable: drop old copies first.
drop policy if exists "Authenticated users can read visible masterclasses" on public.masterclasses;
drop policy if exists "Admins can read all masterclasses" on public.masterclasses;
drop policy if exists "Admins can insert masterclasses" on public.masterclasses;
drop policy if exists "Admins can update masterclasses" on public.masterclasses;
drop policy if exists "Admins can delete masterclasses" on public.masterclasses;

-- READ: any logged-in user sees upcoming/live events (so they can register),
-- plus past events where the admin has flipped replay_published = true.
-- Free-plan users can see this too — they need to pay separately anyway.
create policy "Authenticated users can read visible masterclasses"
  on public.masterclasses
  for select
  to authenticated
  using (
    status in ('upcoming', 'live')
    or (status = 'past' and replay_published = true)
  );

-- READ (admins): see everything — past events with unpublished replays, drafts, etc.
create policy "Admins can read all masterclasses"
  on public.masterclasses
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert masterclasses"
  on public.masterclasses
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update masterclasses"
  on public.masterclasses
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete masterclasses"
  on public.masterclasses
  for delete
  to authenticated
  using (public.is_admin());
