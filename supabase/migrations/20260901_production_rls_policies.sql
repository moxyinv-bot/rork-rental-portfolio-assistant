-- PRODUCTION SECURITY POLICY PACKAGE
-- Do not run this file until all active users can sign in with Supabase Auth
-- and existing portfolio rows have been assigned to the new auth.users UUIDs.
--
-- This migration protects all household data using the authenticated Supabase
-- user ID. It expects user_id and created_by columns to contain auth UID text.

create or replace function public.is_household_member(target_household_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()::text
  );
$$;

grant execute on function public.is_household_member(text) to authenticated;

-- A user can always see their own membership record. This keeps the membership
-- check usable even after RLS is enabled on household_members.
alter table if exists public.households enable row level security;
alter table if exists public.household_members enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.properties enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.receipts enable row level security;
alter table if exists public.reminders enable row level security;
alter table if exists public.lease_folders enable row level security;
alter table if exists public.lease_documents enable row level security;
alter table if exists public.property_photos enable row level security;

-- Remove the temporary testing-era policies, if they exist.
drop policy if exists households_insert_own on public.households;
drop policy if exists households_select_member on public.households;
drop policy if exists households_update_owner on public.households;
drop policy if exists households_delete_owner on public.households;
drop policy if exists household_members_select_member on public.household_members;
drop policy if exists household_members_insert_self on public.household_members;
drop policy if exists household_members_delete_self on public.household_members;
drop policy if exists household_members_delete_owner on public.household_members;

create policy households_select_member on public.households for select to authenticated
using (public.is_household_member(id));
create policy households_insert_own on public.households for insert to authenticated
with check (created_by = auth.uid()::text);
create policy households_update_owner on public.households for update to authenticated
using (exists (select 1 from public.household_members hm where hm.household_id = households.id and hm.user_id = auth.uid()::text and hm.role = 'owner'))
with check (exists (select 1 from public.household_members hm where hm.household_id = households.id and hm.user_id = auth.uid()::text and hm.role = 'owner'));
create policy households_delete_owner on public.households for delete to authenticated
using (exists (select 1 from public.household_members hm where hm.household_id = households.id and hm.user_id = auth.uid()::text and hm.role = 'owner'));

create policy household_members_select_member on public.household_members for select to authenticated
using (user_id = auth.uid()::text or public.is_household_member(household_id));
create policy household_members_insert_owner_or_self on public.household_members for insert to authenticated
with check (
  user_id = auth.uid()::text
  or exists (select 1 from public.household_members hm where hm.household_id = household_members.household_id and hm.user_id = auth.uid()::text and hm.role = 'owner')
);
create policy household_members_delete_owner_or_self on public.household_members for delete to authenticated
using (
  user_id = auth.uid()::text
  or exists (select 1 from public.household_members hm where hm.household_id = household_members.household_id and hm.user_id = auth.uid()::text and hm.role = 'owner')
);

create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = auth.uid()::text);
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()::text) with check (id = auth.uid()::text);

-- Household-scoped portfolio tables.
do $$
declare
  target_table text;
  policy_prefix text;
  target_tables text[] := array['properties', 'transactions', 'receipts', 'reminders', 'lease_folders', 'lease_documents'];
begin
  foreach target_table in array target_tables loop
    if to_regclass('public.' || target_table) is not null then
      policy_prefix := target_table || '_household';
      execute format('create policy %I on public.%I for select to authenticated using (public.is_household_member(household_id))', policy_prefix || '_select', target_table);
      execute format('create policy %I on public.%I for insert to authenticated with check (public.is_household_member(household_id) and user_id = auth.uid()::text)', policy_prefix || '_insert', target_table);
      execute format('create policy %I on public.%I for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id))', policy_prefix || '_update', target_table);
      execute format('create policy %I on public.%I for delete to authenticated using (public.is_household_member(household_id))', policy_prefix || '_delete', target_table);
    end if;
  end loop;
end $$;

-- Property photos inherit access through their parent property.
create policy property_photos_select_member on public.property_photos for select to authenticated
using (exists (select 1 from public.properties p where p.id = property_photos.property_id and public.is_household_member(p.household_id)));
create policy property_photos_insert_member on public.property_photos for insert to authenticated
with check (exists (select 1 from public.properties p where p.id = property_photos.property_id and public.is_household_member(p.household_id)));
create policy property_photos_update_member on public.property_photos for update to authenticated
using (exists (select 1 from public.properties p where p.id = property_photos.property_id and public.is_household_member(p.household_id)))
with check (exists (select 1 from public.properties p where p.id = property_photos.property_id and public.is_household_member(p.household_id)));
create policy property_photos_delete_member on public.property_photos for delete to authenticated
using (exists (select 1 from public.properties p where p.id = property_photos.property_id and public.is_household_member(p.household_id)));

-- Storage policies expect each object key to begin with household_id/.
-- First make property-photos, receipt-images, and lease-documents private in
-- Supabase Storage Dashboard, then run these policies.
drop policy if exists portfolio_media_select on storage.objects;
drop policy if exists portfolio_media_insert on storage.objects;
drop policy if exists portfolio_media_update on storage.objects;
drop policy if exists portfolio_media_delete on storage.objects;

create policy portfolio_media_select on storage.objects for select to authenticated
using (
  bucket_id in ('property-photos', 'receipt-images', 'lease-documents')
  and public.is_household_member((storage.foldername(name))[1])
);
create policy portfolio_media_insert on storage.objects for insert to authenticated
with check (
  bucket_id in ('property-photos', 'receipt-images', 'lease-documents')
  and public.is_household_member((storage.foldername(name))[1])
);
create policy portfolio_media_update on storage.objects for update to authenticated
using (
  bucket_id in ('property-photos', 'receipt-images', 'lease-documents')
  and public.is_household_member((storage.foldername(name))[1])
)
with check (
  bucket_id in ('property-photos', 'receipt-images', 'lease-documents')
  and public.is_household_member((storage.foldername(name))[1])
);
create policy portfolio_media_delete on storage.objects for delete to authenticated
using (
  bucket_id in ('property-photos', 'receipt-images', 'lease-documents')
  and public.is_household_member((storage.foldername(name))[1])
);
