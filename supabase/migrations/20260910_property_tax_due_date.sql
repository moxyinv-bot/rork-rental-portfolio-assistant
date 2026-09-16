ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_tax_due_date date;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS receipt_name text;
