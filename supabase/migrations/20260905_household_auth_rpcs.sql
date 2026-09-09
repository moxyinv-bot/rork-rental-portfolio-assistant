-- Atomic, authenticated household create/join operations.
-- These functions are safe with RLS because they derive the user identity from
-- the Supabase JWT and never accept a caller-provided user ID.

create or replace function public.create_household_for_current_user(household_name text)
returns setof public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id text := auth.uid()::text;
  created_household public.households%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a household.' using errcode = '28000';
  end if;

  if nullif(trim(household_name), '') is null then
    raise exception 'Household name is required.' using errcode = '22023';
  end if;

  insert into public.households (name, created_by)
  values (trim(household_name), current_user_id)
  returning * into created_household;

  insert into public.household_members (household_id, user_id, role)
  values (created_household.id, current_user_id, 'owner')
  on conflict (household_id, user_id)
  do update set role = 'owner';

  return next created_household;
end;
$$;

create or replace function public.join_household_by_invite(invite_code_input text)
returns setof public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id text := auth.uid()::text;
  matched_household public.households%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a household.' using errcode = '28000';
  end if;

  if nullif(trim(invite_code_input), '') is null then
    raise exception 'Invite code is required.' using errcode = '22023';
  end if;

  select *
  into matched_household
  from public.households
  where invite_code = upper(trim(invite_code_input));

  if not found then
    raise exception 'That invite code was not found.' using errcode = 'P0002';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (matched_household.id, current_user_id, 'member')
  on conflict (household_id, user_id) do nothing;

  return next matched_household;
end;
$$;

revoke all on function public.create_household_for_current_user(text) from public, anon;
revoke all on function public.join_household_by_invite(text) from public, anon;
grant execute on function public.create_household_for_current_user(text) to authenticated;
grant execute on function public.join_household_by_invite(text) to authenticated;
