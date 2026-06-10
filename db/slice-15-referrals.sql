-- Slice 15, Step A: referral system tables.
--
-- Two tables:
--   referral_codes  — one unique shareable code per user
--   referrals       — tracks each referral relationship and its status
--
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Safe to re-run (drops policies first).

-- ─── referral_codes ──────────────────────────────────────────────────────────

create table if not exists public.referral_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  code        text not null,
  created_at  timestamptz not null default now(),

  constraint referral_codes_user_id_key unique (user_id),
  constraint referral_codes_code_key    unique (code)
);

-- ─── referrals ───────────────────────────────────────────────────────────────

create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references auth.users (id) on delete cascade,
  referred_id   uuid not null references auth.users (id) on delete cascade,

  -- 'pending'   = signed up but not yet paid
  -- 'converted' = became a paying subscriber
  -- 'credited'  = referrer has been rewarded (free month added)
  status        text not null default 'pending'
                  check (status in ('pending', 'converted', 'credited')),

  created_at    timestamptz not null default now(),
  converted_at  timestamptz,
  credited_at   timestamptz,

  -- A user can only be referred once.
  constraint referrals_referred_id_key unique (referred_id)
);

-- Speeds up the "find all referrals by referrer" query on the profile screen.
create index if not exists referrals_referrer_id_idx
  on public.referrals (referrer_id);

-- ─── Row-level security ───────────────────────────────────────────────────────

alter table public.referral_codes enable row level security;
alter table public.referrals       enable row level security;

-- Drop old policies so this file is safe to re-run.
drop policy if exists "Users can read own referral code"  on public.referral_codes;
drop policy if exists "Users can read own referrals sent" on public.referrals;
drop policy if exists "Admins can read all referral codes" on public.referral_codes;
drop policy if exists "Admins can read all referrals"     on public.referrals;

-- Any logged-in user can see their own referral code.
create policy "Users can read own referral code"
  on public.referral_codes
  for select
  to authenticated
  using (user_id = auth.uid());

-- Any logged-in user can see the referrals they sent (as referrer).
create policy "Users can read own referrals sent"
  on public.referrals
  for select
  to authenticated
  using (referrer_id = auth.uid());

-- Admins can see everything (needed for /admin/referrals page in Step F).
create policy "Admins can read all referral codes"
  on public.referral_codes
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can read all referrals"
  on public.referrals
  for select
  to authenticated
  using (public.is_admin());

-- No INSERT/UPDATE policies for normal users on referrals.
-- All writes happen server-side via the service-role key, which bypasses RLS.
