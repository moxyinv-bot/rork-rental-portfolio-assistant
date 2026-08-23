# Supabase Preflight Checks

Run these checks after `supabase db push` and before mobile testing.

## 1) Verify migration status

```bash
npx supabase migration list --linked --workdir C:\app\rork\main\expo
```

Look for pending migrations. If any are pending, push again before app testing.

## 2) Verify required table existence (run in SQL editor)

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'households',
    'household_members',
    'properties',
    'transactions',
    'receipts',
    'reminders',
    'lease_folders',
    'lease_documents',
    'property_photos'
  )
order by table_name;
```

## 3) Verify critical column types (external auth compatibility)

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'households' and column_name in ('id', 'created_by', 'invite_code'))
    or (table_name = 'household_members' and column_name in ('household_id', 'user_id', 'role'))
  )
order by table_name, column_name;
```

Expected for current app model:
- `households.created_by` = `text`
- `household_members.user_id` = `text`

## 4) Verify RLS status (for current non-Supabase-auth flow)

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'households', 'household_members',
    'properties', 'transactions', 'receipts', 'reminders',
    'lease_folders', 'lease_documents', 'property_photos', 'profiles'
  )
order by tablename;
```

For current setup, these should be `rowsecurity = false`.

## 5) Verify grants for API roles

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'households', 'household_members',
    'properties', 'transactions', 'receipts', 'reminders',
    'lease_folders', 'lease_documents', 'property_photos', 'profiles'
  )
order by table_name, grantee, privilege_type;
```

Ensure `anon`/`authenticated` have `SELECT, INSERT, UPDATE, DELETE` where needed.

## 6) Smoke-test inserts in SQL editor

```sql
-- should succeed
insert into public.households (name, created_by) values ('Preflight Test', 'usr-test') returning id;
```

If this fails, app create household will fail too.

## 7) Known migration pitfalls

- Migration version collisions: two files starting with same numeric prefix (e.g., `20260810_*`) will fail.
- `create policy if not exists` is not accepted in some Postgres environments; use `drop policy if exists` + `create policy`.
- Grants on non-existent tables fail unless guarded with `to_regclass` or `if exists` logic.
