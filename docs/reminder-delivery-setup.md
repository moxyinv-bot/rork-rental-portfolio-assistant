# Automated Reminder Delivery Setup

This project now includes starter infrastructure for timed reminder delivery via Supabase Edge Functions.

## What Was Added

- Migration: `supabase/migrations/20260809_reminder_delivery.sql`
- Edge Function: `supabase/functions/dispatch-reminders/index.ts`

The function:
- Reads incomplete reminders due today
- Deduplicates delivery per reminder/channel/recipient/day
- Sends SMS (Twilio) and email (Resend)
- Logs outcomes to `reminder_deliveries`

## 1) Apply Database Migration

Run in your Supabase project SQL editor or via CLI:

```sql
-- file: supabase/migrations/20260809_reminder_delivery.sql
```

## 2) Deploy Edge Function

From project root:

```bash
supabase functions deploy dispatch-reminders
```

## 3) Configure Function Secrets

Set these in Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `RESEND_API_KEY`
- `REMINDER_FROM_EMAIL`

Example:

```bash
supabase secrets set SUPABASE_URL="https://<project>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set TWILIO_ACCOUNT_SID="AC..."
supabase secrets set TWILIO_AUTH_TOKEN="..."
supabase secrets set TWILIO_FROM_NUMBER="+1..."
supabase secrets set RESEND_API_KEY="re_..."
supabase secrets set REMINDER_FROM_EMAIL="reminders@yourdomain.com"
```

## 4) Test Manually (Dry Run)

```bash
curl -i \
  -X POST "https://<project-ref>.functions.supabase.co/dispatch-reminders" \
  -H "Authorization: Bearer <anon-or-service-token>" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

## 5) Send for Real

```bash
curl -i \
  -X POST "https://<project-ref>.functions.supabase.co/dispatch-reminders" \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

## 6) Schedule It

Use Supabase cron (or any external scheduler) to call the function periodically (for example every 15 minutes).

Recommended:
- Keep function idempotent (already done via `reminder_deliveries` unique index)
- Schedule in UTC and be explicit about reminder timezone requirements in a later phase

## Current Limitations (Phase 1)

- Due date uses day-level matching (no time-of-day delivery yet)
- Timezone per household/user is not implemented yet
- Retries/backoff policy is not implemented yet

## Suggested Phase 2

- Add `due_time` and `timezone` fields
- Add retry strategy and dead-letter handling
- Add provider webhooks for final delivery status
