-- Slice 14, Step A: course_products table.
--
-- Stores one-off course products for sale. is_active = true = visible to subscribers.
-- Deactivating hides the course without deleting it or any purchase history.
--
-- IMPORTANT: run slice-14-masterclasses.sql first — it creates set_updated_at().
--
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Safe to re-run (drops policies/trigger first).

create table if not exists public.course_products (
  id            uuid primary key default gen_random_uuid(),

  title         text not null,
  description   text not null default '',

  price         numeric(10,2) not null default 0,
  currency      text not null default 'NGN'
                  check (currency in ('NGN', 'USD')),

  -- Paste the Paystack or Stripe payment link URL here.
  checkout_url  text not null default '',

  thumbnail_url text,

  -- Set to false to hide from subscribers without deleting the row.
  is_active     boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Subscriber course grid: active courses, newest first.
create index if not exists course_products_active_idx
  on public.course_products (is_active, created_at desc);

drop trigger if exists trg_course_products_updated_at on public.course_products;

create trigger trg_course_products_updated_at
  before update on public.course_products
  for each row
  execute function public.set_updated_at();


-- Row-level security.
alter table public.course_products enable row level security;

-- Re-runnable: drop old copies first.
drop policy if exists "Authenticated users can read active courses" on public.course_products;
drop policy if exists "Admins can read all courses" on public.course_products;
drop policy if exists "Admins can insert courses" on public.course_products;
drop policy if exists "Admins can update courses" on public.course_products;
drop policy if exists "Admins can delete courses" on public.course_products;

-- READ: any logged-in user sees active courses.
create policy "Authenticated users can read active courses"
  on public.course_products
  for select
  to authenticated
  using (is_active = true);

-- READ (admins): see all courses including deactivated ones.
create policy "Admins can read all courses"
  on public.course_products
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert courses"
  on public.course_products
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update courses"
  on public.course_products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete courses"
  on public.course_products
  for delete
  to authenticated
  using (public.is_admin());
