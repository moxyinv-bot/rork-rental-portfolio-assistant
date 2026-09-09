-- Persist a household's custom dashboard order for properties.
alter table if exists public.properties
  add column if not exists display_order integer;

create index if not exists properties_household_display_order_idx
  on public.properties (household_id, display_order);