-- Slice 10, Step A: admin roles.
--
-- Adds a `role` column to profiles ('user' for everyone, 'admin' for the team)
-- and locks it down so a normal logged-in user CANNOT promote themselves to
-- admin, even though they ARE allowed to update other fields on their own
-- profile row (notification toggles, timezone, etc.).
--
-- Paste this whole file into the Supabase SQL Editor and Run.

-- 1) The column. Defaults to 'user', so every existing and future row is a
--    normal user until we deliberately flip someone to 'admin'. The check
--    constraint stops typos / garbage values from ever landing here.
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));


-- 2) The self-promotion lock.
--
--    Your existing RLS lets a user UPDATE their own profile row (that's how the
--    notification toggles save from the browser). Plain RLS can't say "...but
--    not THIS one column" because an RLS policy can't compare the row's OLD
--    value to its NEW value. A trigger can. So we add a guard that runs on
--    every update and rejects any attempt to CHANGE the role unless the person
--    making the change is already an admin.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer            -- runs as the function owner, so the SELECT below
set search_path = public    -- bypasses RLS (no infinite recursion on profiles)
as $$
begin
  -- Role isn't changing? Nothing to guard — let the update through.
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Role IS changing. The Supabase dashboard / server service-role connection
  -- has no logged-in user (auth.uid() is null) and we trust it, so allow that.
  if auth.uid() is null then
    return new;
  end if;

  -- Otherwise a logged-in app user is trying to change a role. Only allow it
  -- if THEY are already an admin. A normal user fails this check and is blocked.
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    return new;
  end if;

  raise exception 'Only admins can change a user role';
end;
$$;

drop trigger if exists trg_guard_profile_role on public.profiles;

create trigger trg_guard_profile_role
  before update on public.profiles
  for each row
  execute function public.guard_profile_role();
