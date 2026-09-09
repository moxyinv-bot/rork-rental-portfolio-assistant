-- Normalize legacy date-only text values to ISO "YYYY-MM-DD".
-- Converts "MM-DD-YY" and "MM-DD-YYYY" rows written by earlier app versions.
-- Safe to run more than once: rows already in ISO form are skipped.

do $$
declare
  target record;
  targets constant text[][] := array[
    ['properties', 'purchase_date'],
    ['properties', 'lease_start'],
    ['properties', 'lease_end'],
    ['properties', 'mortgage_renewal_date'],
    ['properties', 'insurance_renewal_date'],
    ['transactions', 'tx_date'],
    ['transactions', 'date'],
    ['receipts', 'receipt_date'],
    ['receipts', 'date'],
    ['reminders', 'due_date'],
    ['lease_documents', 'date_of_document']
  ];
  i int;
  tbl text;
  col text;
begin
  for i in 1 .. array_length(targets, 1) loop
    tbl := targets[i][1];
    col := targets[i][2];

    if to_regclass('public.' || tbl) is null then
      continue;
    end if;

    -- Only touch text-like columns; real date columns are already unambiguous.
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = tbl
        and column_name = col
        and data_type in ('text', 'character varying')
    ) then
      continue;
    end if;

    execute format(
      'update public.%I
         set %I = to_char(to_date(%I, ''MM-DD-YY''), ''YYYY-MM-DD'')
       where %I ~ ''^[0-9]{2}-[0-9]{2}-[0-9]{2}$''',
      tbl, col, col, col
    );

    execute format(
      'update public.%I
         set %I = to_char(to_date(%I, ''MM-DD-YYYY''), ''YYYY-MM-DD'')
       where %I ~ ''^[0-9]{2}-[0-9]{2}-[0-9]{4}$''',
      tbl, col, col, col
    );
  end loop;
end $$;
