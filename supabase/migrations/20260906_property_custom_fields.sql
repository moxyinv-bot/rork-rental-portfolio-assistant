-- Store up to 10 user-defined label/value rows for each property.
alter table if exists public.properties
  add column if not exists custom_fields jsonb not null default '[]'::jsonb;

do $$
begin
  if to_regclass('public.properties') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'properties_custom_fields_array_check'
      and conrelid = 'public.properties'::regclass
  ) then
    alter table public.properties
      add constraint properties_custom_fields_array_check
      check (jsonb_typeof(custom_fields) = 'array' and jsonb_array_length(custom_fields) <= 10)
      not valid;
  end if;
end $$;

do $$
begin
  if to_regclass('public.properties') is not null and exists (
    select 1
    from pg_constraint
    where conname = 'properties_custom_fields_array_check'
      and conrelid = 'public.properties'::regclass
      and not convalidated
  ) then
    alter table public.properties validate constraint properties_custom_fields_array_check;
  end if;
end $$;