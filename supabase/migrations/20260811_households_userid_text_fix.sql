-- Fix household schema to support external auth user IDs like usr-...
-- and allow app access when not using Supabase Auth JWTs.

-- Remove RLS policies that depend on auth.uid() UUID semantics.
drop policy if exists households_insert_own on public.households;
drop policy if exists households_select_member on public.households;
drop policy if exists households_update_owner on public.households;
drop policy if exists households_delete_owner on public.households;

drop policy if exists household_members_select_member on public.household_members;
drop policy if exists household_members_insert_self on public.household_members;
drop policy if exists household_members_delete_self on public.household_members;
drop policy if exists household_members_delete_owner on public.household_members;

-- Convert households.created_by from uuid -> text when needed.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'households'
      and column_name = 'created_by'
      and data_type = 'uuid'
  ) then
    alter table public.households
      alter column created_by type text using created_by::text;
  end if;
end $$;

-- Convert household_members.user_id from uuid -> text when needed.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_members'
      and column_name = 'user_id'
      and data_type = 'uuid'
  ) then
    alter table public.household_members
      alter column user_id type text using user_id::text;
  end if;
end $$;

-- Disable RLS for these tables so app-level auth can function.
alter table if exists public.households disable row level security;
alter table if exists public.household_members disable row level security;

-- Ensure API roles can access these tables.
grant select, insert, update, delete on table public.households to anon, authenticated, service_role;
grant select, insert, update, delete on table public.household_members to anon, authenticated, service_role;
