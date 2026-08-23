-- Reminder delivery log for automated SMS/email dispatch deduplication

create extension if not exists pgcrypto;

create table if not exists public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  -- Keep this as text without a FK because existing reminders.id may not be uuid/unique.
  reminder_id text not null,
  household_id uuid,
  channel text not null check (channel in ('sms', 'email')),
  recipient text not null,
  scheduled_for date not null,
  status text not null check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create unique index if not exists reminder_deliveries_dedupe_idx
  on public.reminder_deliveries (reminder_id, channel, recipient, scheduled_for);

create index if not exists reminder_deliveries_scheduled_for_idx
  on public.reminder_deliveries (scheduled_for);

-- Optional operational columns for quick status checks in app/admin tooling.
alter table public.reminders
  add column if not exists last_notified_at timestamptz;

alter table public.reminders
  add column if not exists last_notification_error text;
