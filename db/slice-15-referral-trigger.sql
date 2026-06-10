-- Slice 15, Step B: auto-generate a referral code on new user signup.
--
-- What a Postgres trigger is:
--   A trigger is a function that the database calls automatically when a
--   specific event happens on a table. Here we say: "after every INSERT into
--   auth.users, run this function". It runs inside the database — before the
--   signup response even returns to the browser — so it is faster and more
--   reliable than generating the code in the app (no race conditions, no
--   missing codes if the frontend crashes).
--
-- Code format:
--   If the user has a display_name/full_name: "[NAME]-[4 chars]", e.g. "ADA-K3P9"
--   Otherwise: "REF-[6 chars]"
--
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Safe to re-run (drops the trigger and function first).

drop trigger   if exists trg_create_referral_code on auth.users;
drop function  if exists public.create_referral_code();

create or replace function public.create_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code   text;
  v_prefix text;
  v_suffix text;
  v_chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i        int;
begin
  -- Try to get the raw_user_meta_data display name that some OAuth providers
  -- set. For email-only signups this will be null/blank.
  v_prefix := upper(trim(
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    )
  ));

  -- Strip everything that isn't A-Z, keep first 8 chars so long names don't
  -- produce unwieldy codes.
  v_prefix := regexp_replace(v_prefix, '[^A-Z]', '', 'g');
  v_prefix := left(v_prefix, 8);

  if v_prefix = '' then
    v_prefix := 'REF';
  end if;

  -- Generate the random suffix. We loop until we get a unique code (extremely
  -- rare to collide but the UNIQUE constraint guarantees correctness).
  loop
    v_suffix := '';
    for i in 1..(case when v_prefix = 'REF' then 6 else 4 end) loop
      v_suffix := v_suffix || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    end loop;

    v_code := v_prefix || '-' || v_suffix;

    begin
      insert into public.referral_codes (user_id, code)
      values (new.id, v_code);
      -- Insert succeeded → unique, exit loop.
      exit;
    exception when unique_violation then
      -- Code already exists, try again.
      null;
    end;
  end loop;

  return new;
exception when others then
  -- Never block a signup because of referral code generation.
  return new;
end;
$$;

-- Fire AFTER insert so new.id is committed and the foreign key to auth.users
-- is already satisfied.
create trigger trg_create_referral_code
  after insert on auth.users
  for each row
  execute function public.create_referral_code();
