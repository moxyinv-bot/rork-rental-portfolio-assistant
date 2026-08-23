-- Resilience patch:
-- 1) Prevent property writes from failing on user_id null drift
-- 2) Backfill profile rows for household members so member labels resolve

DO $$
DECLARE
  user_id_is_pk boolean := false;
  household_id_is_pk boolean := false;
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'properties'
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'user_id'
    ) INTO user_id_is_pk;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'properties'
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'household_id'
    ) INTO household_id_is_pk;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'properties'
        AND column_name = 'user_id'
    ) AND NOT user_id_is_pk THEN
      -- Keep user_id support, but do not hard-fail writes if some clients
      -- temporarily miss this value.
      ALTER TABLE public.properties ALTER COLUMN user_id DROP NOT NULL;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'properties'
        AND column_name = 'household_id'
    ) AND NOT household_id_is_pk THEN
      ALTER TABLE public.properties ALTER COLUMN household_id DROP NOT NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND to_regclass('public.household_members') IS NOT NULL THEN

    -- Backfill missing profile rows using household membership IDs.
    -- This avoids "Unknown" member rows even before all devices refresh.
    INSERT INTO public.profiles (id, name, updated_at)
    SELECT
      hm.user_id,
      CASE
        WHEN hm.user_id LIKE 'usr_%' THEN 'Member ' || substr(hm.user_id, 5, 6)
        WHEN hm.user_id LIKE 'guest%' THEN 'Guest Member'
        ELSE 'Member'
      END,
      now()
    FROM public.household_members hm
    LEFT JOIN public.profiles p ON p.id = hm.user_id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
