-- Public, non-sensitive release metadata used by clients to report whether
-- their installed build is current. Only service_role may modify rows.

create table if not exists public.app_releases (
  platform text primary key check (platform in ('android', 'ios')),
  version_name text not null,
  version_code integer not null check (version_code > 0),
  minimum_supported_code integer not null default 1 check (minimum_supported_code > 0),
  release_notes text,
  updated_at timestamptz not null default now()
);

alter table public.app_releases enable row level security;

drop policy if exists app_releases_public_read on public.app_releases;
create policy app_releases_public_read
on public.app_releases
for select
to anon, authenticated
using (true);

revoke insert, update, delete on public.app_releases from anon, authenticated;
grant select on public.app_releases to anon, authenticated;
grant all on public.app_releases to service_role;

insert into public.app_releases (
  platform,
  version_name,
  version_code,
  minimum_supported_code,
  release_notes,
  updated_at
)
values (
  'android',
  '1.0.3',
  5,
  4,
  'Shared household gallery and account consolidation fixes.',
  now()
)
on conflict (platform) do update set
  version_name = excluded.version_name,
  version_code = excluded.version_code,
  minimum_supported_code = excluded.minimum_supported_code,
  release_notes = excluded.release_notes,
  updated_at = excluded.updated_at;
