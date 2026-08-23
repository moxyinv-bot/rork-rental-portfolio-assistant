-- Support external auth IDs (usr_...) in profiles.id and remove incompatible UUID-linked FKs.

DO $$
DECLARE
  fk_record record;
  policy_name text;
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- Drop policies that depend on profiles.id type.
    FOR policy_name IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'profiles'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_name);
    END LOOP;

    -- Drop foreign keys that reference profiles(id) so id type can be changed safely.
    FOR fk_record IN
      SELECT c.conname, cl.relname AS table_name
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      WHERE c.contype = 'f'
        AND ns.nspname = 'public'
        AND c.confrelid = 'public.profiles'::regclass
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', fk_record.table_name, fk_record.conname);
    END LOOP;

    -- Drop FKs defined on profiles.id itself (often profiles_id_fkey -> auth.users).
    FOR fk_record IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      WHERE c.contype = 'f'
        AND ns.nspname = 'public'
        AND cl.relname = 'profiles'
        AND pg_get_constraintdef(c.oid) ILIKE '%(id)%'
    LOOP
      EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', fk_record.conname);
    END LOOP;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
      ALTER TABLE public.profiles ALTER COLUMN id TYPE text USING id::text;
    END IF;
  END IF;
END $$;
