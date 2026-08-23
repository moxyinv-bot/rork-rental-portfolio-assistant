-- Backfill the live portfolio schema to match the current app contract.
-- The app uses external auth IDs like usr_... and stores household-scoped data in text columns.
-- This migration makes the database resilient to the column drift that caused PGRST204 errors.

DO $$
DECLARE
  fk_record record;
BEGIN
  FOR fk_record IN
    SELECT c.conname, cl.relname AS table_name
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    WHERE c.contype = 'f'
      AND ns.nspname = 'public'
      AND cl.relname IN (
        'transactions',
        'receipts',
        'reminders',
        'lease_folders',
        'lease_documents',
        'property_photos'
      )
      AND pg_get_constraintdef(c.oid) ILIKE ANY (ARRAY['%property_id%', '%folder_id%', '%household_id%', '%user_id%'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', fk_record.table_name, fk_record.conname);
  END LOOP;

  IF to_regclass('public.households') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'households'
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.households ALTER COLUMN id TYPE text USING id::text;
    END IF;
  END IF;

  IF to_regclass('public.household_members') IS NOT NULL THEN
    ALTER TABLE public.household_members DROP CONSTRAINT IF EXISTS household_members_household_id_fkey;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'household_members'
        AND column_name = 'household_id'
        AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.household_members ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'household_members'
        AND column_name = 'user_id'
        AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.household_members ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
  END IF;

  IF to_regclass('public.properties') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'properties'
        AND column_name = 'household_id'
        AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.properties ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'properties'
        AND column_name = 'user_id'
        AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.properties ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'household_id') THEN
      ALTER TABLE public.properties ADD COLUMN household_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'user_id') THEN
      ALTER TABLE public.properties ADD COLUMN user_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'image_uri') THEN
      ALTER TABLE public.properties ADD COLUMN image_uri text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'created_at') THEN
      ALTER TABLE public.properties ADD COLUMN created_at timestamptz default now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'updated_at') THEN
      ALTER TABLE public.properties ADD COLUMN updated_at timestamptz default now();
    END IF;
  END IF;

  IF to_regclass('public.transactions') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.transactions ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'household_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.transactions ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'property_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.transactions ALTER COLUMN property_id TYPE text USING property_id::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'user_id') THEN
      ALTER TABLE public.transactions ADD COLUMN user_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'household_id') THEN
      ALTER TABLE public.transactions ADD COLUMN household_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'property_id') THEN
      ALTER TABLE public.transactions ADD COLUMN property_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'tx_date') THEN
      ALTER TABLE public.transactions ADD COLUMN tx_date text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'date') THEN
      ALTER TABLE public.transactions ADD COLUMN date text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'tags') THEN
      ALTER TABLE public.transactions ADD COLUMN tags jsonb default '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'created_at') THEN
      ALTER TABLE public.transactions ADD COLUMN created_at timestamptz default now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'updated_at') THEN
      ALTER TABLE public.transactions ADD COLUMN updated_at timestamptz default now();
    END IF;
  END IF;

  IF to_regclass('public.receipts') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.receipts ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'household_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.receipts ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'property_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.receipts ALTER COLUMN property_id TYPE text USING property_id::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'user_id') THEN
      ALTER TABLE public.receipts ADD COLUMN user_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'household_id') THEN
      ALTER TABLE public.receipts ADD COLUMN household_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'property_id') THEN
      ALTER TABLE public.receipts ADD COLUMN property_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'receipt_date') THEN
      ALTER TABLE public.receipts ADD COLUMN receipt_date text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'date') THEN
      ALTER TABLE public.receipts ADD COLUMN date text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'tags') THEN
      ALTER TABLE public.receipts ADD COLUMN tags jsonb default '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'created_at') THEN
      ALTER TABLE public.receipts ADD COLUMN created_at timestamptz default now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'updated_at') THEN
      ALTER TABLE public.receipts ADD COLUMN updated_at timestamptz default now();
    END IF;
  END IF;

  IF to_regclass('public.reminders') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.reminders ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'household_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.reminders ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'property_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.reminders ALTER COLUMN property_id TYPE text USING property_id::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'user_id') THEN
      ALTER TABLE public.reminders ADD COLUMN user_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'household_id') THEN
      ALTER TABLE public.reminders ADD COLUMN household_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'property_id') THEN
      ALTER TABLE public.reminders ADD COLUMN property_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'due_date') THEN
      ALTER TABLE public.reminders ADD COLUMN due_date text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'completed') THEN
      ALTER TABLE public.reminders ADD COLUMN completed boolean default false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'created_at') THEN
      ALTER TABLE public.reminders ADD COLUMN created_at timestamptz default now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'updated_at') THEN
      ALTER TABLE public.reminders ADD COLUMN updated_at timestamptz default now();
    END IF;
  END IF;

  IF to_regclass('public.lease_folders') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_folders' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.lease_folders ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_folders' AND column_name = 'household_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.lease_folders ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_folders' AND column_name = 'property_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.lease_folders ALTER COLUMN property_id TYPE text USING property_id::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_folders' AND column_name = 'user_id') THEN
      ALTER TABLE public.lease_folders ADD COLUMN user_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_folders' AND column_name = 'household_id') THEN
      ALTER TABLE public.lease_folders ADD COLUMN household_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_folders' AND column_name = 'property_id') THEN
      ALTER TABLE public.lease_folders ADD COLUMN property_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_folders' AND column_name = 'color') THEN
      ALTER TABLE public.lease_folders ADD COLUMN color text default '#3B82F6';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_folders' AND column_name = 'created_at') THEN
      ALTER TABLE public.lease_folders ADD COLUMN created_at timestamptz default now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_folders' AND column_name = 'updated_at') THEN
      ALTER TABLE public.lease_folders ADD COLUMN updated_at timestamptz default now();
    END IF;
  END IF;

  IF to_regclass('public.lease_documents') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.lease_documents ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'household_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.lease_documents ALTER COLUMN household_id TYPE text USING household_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'property_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.lease_documents ALTER COLUMN property_id TYPE text USING property_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'folder_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.lease_documents ALTER COLUMN folder_id TYPE text USING folder_id::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'user_id') THEN
      ALTER TABLE public.lease_documents ADD COLUMN user_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'household_id') THEN
      ALTER TABLE public.lease_documents ADD COLUMN household_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'property_id') THEN
      ALTER TABLE public.lease_documents ADD COLUMN property_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'folder_id') THEN
      ALTER TABLE public.lease_documents ADD COLUMN folder_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'type') THEN
      ALTER TABLE public.lease_documents ADD COLUMN type text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'title') THEN
      ALTER TABLE public.lease_documents ADD COLUMN title text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'content') THEN
      ALTER TABLE public.lease_documents ADD COLUMN content text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'original_image_uri') THEN
      ALTER TABLE public.lease_documents ADD COLUMN original_image_uri text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'tags') THEN
      ALTER TABLE public.lease_documents ADD COLUMN tags jsonb default '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'tenant_name') THEN
      ALTER TABLE public.lease_documents ADD COLUMN tenant_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'date_of_document') THEN
      ALTER TABLE public.lease_documents ADD COLUMN date_of_document text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'notes') THEN
      ALTER TABLE public.lease_documents ADD COLUMN notes text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'created_at') THEN
      ALTER TABLE public.lease_documents ADD COLUMN created_at timestamptz default now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lease_documents' AND column_name = 'updated_at') THEN
      ALTER TABLE public.lease_documents ADD COLUMN updated_at timestamptz default now();
    END IF;
  END IF;

  IF to_regclass('public.property_photos') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_photos' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.property_photos ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_photos' AND column_name = 'property_id' AND data_type = 'uuid') THEN
      ALTER TABLE public.property_photos ALTER COLUMN property_id TYPE text USING property_id::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_photos' AND column_name = 'user_id') THEN
      ALTER TABLE public.property_photos ADD COLUMN user_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_photos' AND column_name = 'property_id') THEN
      ALTER TABLE public.property_photos ADD COLUMN property_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_photos' AND column_name = 'caption') THEN
      ALTER TABLE public.property_photos ADD COLUMN caption text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_photos' AND column_name = 'created_at') THEN
      ALTER TABLE public.property_photos ADD COLUMN created_at timestamptz default now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_photos' AND column_name = 'updated_at') THEN
      ALTER TABLE public.property_photos ADD COLUMN updated_at timestamptz default now();
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_properties_household_id ON public.properties(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household_id ON public.transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property_id ON public.transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_receipts_household_id ON public.receipts(household_id);
CREATE INDEX IF NOT EXISTS idx_receipts_property_id ON public.receipts(property_id);
CREATE INDEX IF NOT EXISTS idx_reminders_household_id ON public.reminders(household_id);
CREATE INDEX IF NOT EXISTS idx_reminders_property_id ON public.reminders(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_folders_household_id ON public.lease_folders(household_id);
CREATE INDEX IF NOT EXISTS idx_lease_documents_household_id ON public.lease_documents(household_id);
CREATE INDEX IF NOT EXISTS idx_property_photos_property_id ON public.property_photos(property_id);
CREATE INDEX IF NOT EXISTS idx_property_photos_user_id ON public.property_photos(user_id);
