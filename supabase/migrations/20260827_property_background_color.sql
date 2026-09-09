-- Persist the user-selected dashboard color for each property.
alter table if exists public.properties
  add column if not exists background_color text;
