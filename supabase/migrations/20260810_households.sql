-- Households and membership model for shared portfolio access

create extension if not exists pgcrypto;

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  output text := '';
  i int;
begin
  for i in 1..6 loop
    output := output || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return output;
end;
$$;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default public.generate_invite_code(),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index if not exists households_created_by_idx
  on public.households (created_by);

create index if not exists household_members_user_id_idx
  on public.household_members (user_id);

create index if not exists household_members_household_id_idx
  on public.household_members (household_id);

-- Keep invite codes uppercase and fixed-length
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'households_invite_code_format_chk'
  ) then
    alter table public.households
      add constraint households_invite_code_format_chk
      check (invite_code = upper(invite_code) and length(invite_code) = 6);
  end if;
end $$;

-- Auto-update updated_at
create or replace function public.set_households_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists households_set_updated_at on public.households;
create trigger households_set_updated_at
before update on public.households
for each row execute function public.set_households_updated_at();

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- Users can create households for themselves
drop policy if exists households_insert_own on public.households;
create policy households_insert_own
on public.households
for insert
to authenticated
with check (created_by = auth.uid());

-- Users can view households they are a member of
drop policy if exists households_select_member on public.households;
create policy households_select_member
on public.households
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
  )
);

-- Users can update a household only if they are owner
drop policy if exists households_update_owner on public.households;
create policy households_update_owner
on public.households
for update
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  )
);

-- Users can delete a household only if they are owner
drop policy if exists households_delete_owner on public.households;
create policy households_delete_owner
on public.households
for delete
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  )
);

-- Members can view all members in their household(s)
drop policy if exists household_members_select_member on public.household_members;
create policy household_members_select_member
on public.household_members
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_members.household_id
      and hm.user_id = auth.uid()
  )
);

-- Users can insert their own membership rows (join flow)
drop policy if exists household_members_insert_self on public.household_members;
create policy household_members_insert_self
on public.household_members
for insert
to authenticated
with check (user_id = auth.uid());

-- Users can delete their own membership rows (leave flow)
drop policy if exists household_members_delete_self on public.household_members;
create policy household_members_delete_self
on public.household_members
for delete
to authenticated
using (user_id = auth.uid());

-- Owners can remove any member from their own household
drop policy if exists household_members_delete_owner on public.household_members;
create policy household_members_delete_owner
on public.household_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_members.household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  )
);

-- Optional compatibility columns on profiles table
alter table public.profiles
  add column if not exists household_id uuid;

-- No FK here because this column is optional and not required by current app logic.
