-- Support external auth user IDs (e.g. usr_...) across portfolio tables.

DO $$
DECLARE
  policy_name text;
  policy_table text;
  fk_record record;
  target_table text;
  target_tables text[] := array[
    'properties',
    'transactions',
    'receipts',
    'reminders',
    'lease_folders',
    'lease_documents',
    'property_photos'
  ];
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    -- Drop existing policies that can depend on user_id type.
    FOR policy_table, policy_name IN
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = ANY(target_tables)
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, policy_table);
    END LOOP;

    -- Drop FKs that depend on user_id UUID semantics.
    FOR fk_record IN
      SELECT c.conname, cl.relname AS table_name
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      WHERE c.contype = 'f'
        AND ns.nspname = 'public'
        AND pg_get_constraintdef(c.oid) ILIKE '%user_id%'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', fk_record.table_name, fk_record.conname);
    END LOOP;

    -- Convert user_id columns from uuid -> text when needed.
    FOREACH target_table IN ARRAY target_tables
    LOOP
      IF to_regclass('public.' || target_table) IS NOT NULL THEN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = target_table
            AND column_name = 'user_id'
            AND data_type = 'uuid'
        ) THEN
          EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id TYPE text USING user_id::text', target_table);
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;
