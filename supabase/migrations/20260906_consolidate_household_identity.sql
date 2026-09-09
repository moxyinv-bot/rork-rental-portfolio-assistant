-- Consolidate legacy Rork membership rows into the current Supabase Auth user.
-- Matching is limited to the authenticated user's verified email address.

create or replace function public.consolidate_current_user_memberships()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id text := auth.uid()::text;
  current_email text;
  legacy_membership record;
  existing_role text;
  migrated_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  select lower(trim(email)) into current_email
  from auth.users
  where id = auth.uid();

  if current_email is null or current_email = '' then
    return 0;
  end if;

  for legacy_membership in
    select hm.id, hm.household_id, hm.user_id, hm.role
    from public.household_members hm
    join public.profiles p on p.id = hm.user_id
    where hm.user_id <> current_user_id
      and lower(trim(p.email)) = current_email
  loop
    select role into existing_role
    from public.household_members
    where household_id = legacy_membership.household_id
      and user_id = current_user_id;

    if existing_role is null then
      update public.household_members
      set user_id = current_user_id
      where id = legacy_membership.id;
    else
      if legacy_membership.role = 'owner' and existing_role <> 'owner' then
        update public.household_members
        set role = 'owner'
        where household_id = legacy_membership.household_id
          and user_id = current_user_id;
      end if;

      delete from public.household_members
      where id = legacy_membership.id;
    end if;

    update public.households
    set created_by = current_user_id
    where id = legacy_membership.household_id
      and created_by = legacy_membership.user_id;

    migrated_count := migrated_count + 1;
  end loop;

  insert into public.profiles (id, email, name, avatar_url, updated_at)
  select
    auth.uid()::text,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
    now()
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.profiles.name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = excluded.updated_at;

  return migrated_count;
end;
$$;

revoke all on function public.consolidate_current_user_memberships() from public, anon;
grant execute on function public.consolidate_current_user_memberships() to authenticated;
