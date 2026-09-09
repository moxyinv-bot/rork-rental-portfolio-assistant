-- Shared household phonebook contacts.
create extension if not exists pgcrypto;

create table if not exists public.household_contacts (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  user_id text not null,
  name text not null,
  category text not null default 'other',
  phone_numbers jsonb not null default '[]'::jsonb,
  company text,
  email text,
  address text,
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_contacts_category_check check (category in ('contractor', 'insurance', 'tenant', 'buyer-seller', 'lead', 'other')),
  constraint household_contacts_phone_numbers_array_check check (jsonb_typeof(phone_numbers) = 'array')
);

alter table if exists public.household_contacts
  add column if not exists company text;

create index if not exists household_contacts_household_id_idx
  on public.household_contacts (household_id);

create index if not exists household_contacts_name_idx
  on public.household_contacts (lower(name));

create index if not exists household_contacts_category_idx
  on public.household_contacts (category);

create or replace function public.set_household_contacts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists household_contacts_set_updated_at on public.household_contacts;
create trigger household_contacts_set_updated_at
before update on public.household_contacts
for each row execute function public.set_household_contacts_updated_at();

alter table public.household_contacts enable row level security;

grant select, insert, update, delete on table public.household_contacts to authenticated;

drop policy if exists household_contacts_select_member on public.household_contacts;
create policy household_contacts_select_member
on public.household_contacts
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_contacts.household_id
      and hm.user_id = auth.uid()::text
  )
);

drop policy if exists household_contacts_insert_member on public.household_contacts;
create policy household_contacts_insert_member
on public.household_contacts
for insert
to authenticated
with check (
  user_id = auth.uid()::text
  and exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_contacts.household_id
      and hm.user_id = auth.uid()::text
  )
);

drop policy if exists household_contacts_update_member on public.household_contacts;
create policy household_contacts_update_member
on public.household_contacts
for update
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_contacts.household_id
      and hm.user_id = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_contacts.household_id
      and hm.user_id = auth.uid()::text
  )
);

drop policy if exists household_contacts_delete_member on public.household_contacts;
create policy household_contacts_delete_member
on public.household_contacts
for delete
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_contacts.household_id
      and hm.user_id = auth.uid()::text
  )
);