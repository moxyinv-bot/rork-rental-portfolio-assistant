-- Align portfolio table access with current app auth model.
-- The app uses external auth (not Supabase Auth JWT), so strict RLS blocks writes.

do $$
declare
	target_table text;
	target_tables text[] := array[
		'properties',
		'transactions',
		'receipts',
		'reminders',
		'lease_folders',
		'lease_documents',
		'property_photos',
		'profiles'
	];
begin
	foreach target_table in array target_tables
	loop
		if to_regclass('public.' || target_table) is not null then
			execute format('alter table public.%I disable row level security', target_table);
			execute format('grant select, insert, update, delete on table public.%I to anon, authenticated, service_role', target_table);
		end if;
	end loop;
end $$;
