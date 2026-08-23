-- Ensure properties table has household_id for household-scoped queries/inserts.

DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'properties'
        AND column_name = 'household_id'
    ) THEN
      ALTER TABLE public.properties ADD COLUMN household_id text;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'properties'
        AND indexname = 'idx_properties_household_id'
    ) THEN
      CREATE INDEX idx_properties_household_id ON public.properties(household_id);
    END IF;
  END IF;
END $$;
