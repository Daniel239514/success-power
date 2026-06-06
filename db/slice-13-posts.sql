-- Slice 13, Step A: newsletter posts.
--
-- One row per newsletter post. An admin writes these in the rich-text editor;
-- every logged-in user can READ the published ones at /newsletter (no paywall).
--
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Safe to re-run (drops policies/trigger first).

create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),

  title         text not null,

  -- The URL-friendly version of the title, e.g. "Sam's Big Week" -> "sams-big-week".
  -- UNIQUE so two posts can never share a URL. This is what /newsletter/[slug] uses.
  slug          text not null unique,

  -- The rendered HTML from the TipTap editor (Step D). The whole formatted post
  -- lives in this one column as an HTML string.
  body_html     text not null default '',

  -- Optional audio clip in the existing `audio` Storage bucket. Null = no audio.
  audio_url     text,

  -- Lifecycle. 'draft' = work in progress (hidden). 'scheduled' = will auto-publish
  -- at publish_at via the cron (Step K). 'published' = live + emailed.
  status        text not null default 'draft'
                  check (status in ('draft', 'scheduled', 'published')),

  -- WHEN a scheduled post should go live. Only meaningful while status='scheduled'.
  publish_at    timestamptz,

  -- WHEN it actually went live. Set the moment status flips to 'published'.
  -- This is what we sort the public list by (reverse chronological).
  published_at  timestamptz,

  -- Who wrote it. references auth.users so it ties to a real account.
  author_id     uuid references auth.users (id),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The public list shows newest-published first; this index makes that fast.
create index if not exists posts_published_at_idx
  on public.posts (published_at desc);

-- The cron (Step K) repeatedly asks "any scheduled posts whose time has come?".
create index if not exists posts_scheduled_idx
  on public.posts (status, publish_at);


-- Keep updated_at honest: bump it automatically on every UPDATE so we never
-- have to remember to set it from app code.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_posts_updated_at on public.posts;

create trigger trg_posts_updated_at
  before update on public.posts
  for each row
  execute function public.set_updated_at();


-- Row-level security. Flips to DENY-ALL until the policies below allow things.
alter table public.posts enable row level security;

-- Re-runnable: clear old copies first.
drop policy if exists "Anyone authenticated can read published posts" on public.posts;
drop policy if exists "Admins can read all posts" on public.posts;
drop policy if exists "Admins can insert posts" on public.posts;
drop policy if exists "Admins can update posts" on public.posts;
drop policy if exists "Admins can delete posts" on public.posts;

-- READ: any logged-in user sees PUBLISHED posts (this powers /newsletter).
-- Drafts and scheduled posts stay hidden from normal users.
create policy "Anyone authenticated can read published posts"
  on public.posts
  for select
  to authenticated
  using (status = 'published');

-- READ (admins): admins see EVERYTHING — drafts and scheduled included — so the
-- /admin/posts table can list them. public.is_admin() comes from Slice 10.
create policy "Admins can read all posts"
  on public.posts
  for select
  to authenticated
  using (public.is_admin());

-- WRITE: only admins can create / edit / delete posts.
create policy "Admins can insert posts"
  on public.posts
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update posts"
  on public.posts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete posts"
  on public.posts
  for delete
  to authenticated
  using (public.is_admin());
