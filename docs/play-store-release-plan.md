# Play Store Release Plan

## Phase 1: Date Safety

- [x] Store new date-only values as ISO `YYYY-MM-DD`.
- [x] Keep legacy `MM-DD-YY` data readable during the transition.
- [x] Add a migration that converts existing legacy dates to ISO.
- [ ] Run `20260827_property_background_color.sql` and `20260828_normalize_date_formats.sql` in Supabase.

## Phase 2: Guest Access

- [x] Give each guest device a unique identifier.
- [x] Remove the guest sign-in button from the production login screen.
- [ ] Do not re-enable guest cloud access for the Play Store build.

## Phase 3: Reminder Endpoint

- [x] Require POST requests and a server-only `REMINDER_CRON_SECRET` header.
- [x] Remove browser CORS access from the function.
- [x] Configure the function to use its dedicated secret instead of Supabase JWT verification.
- [x] Add `REMINDER_CRON_SECRET` in Supabase and deploy the function.
- [x] Verify requests without the secret return `401 Unauthorized`.
- [ ] Update or create the scheduled job to send the `x-reminder-cron-secret` header.

## Phase 4: Private Data Access

- [x] Move the app client to Supabase Auth sessions.
- [x] Enable Google sign-in in Supabase and verify the OAuth redirect configuration.
- [ ] Test Google sign-in in a preview APK.
- [ ] Apply `20260905_household_auth_rpcs.sql` and test household create/join.
- [x] Remove Apple sign-in from the Android release until its provider is configured.
- [ ] Migrate existing Rork account IDs and household memberships to the chosen identity provider.
- [ ] Enable RLS on household, portfolio, and profile tables with membership-based policies.
- [ ] Change the three media buckets to private.
- [ ] Replace public media URLs with short-lived signed URLs from a trusted backend.
- [ ] Test with two accounts in separate households: each must be unable to read, change, or download the other's data.

## Phase 5: Play Store Release

- [x] Remove duplicate and unused Android permissions.
- [ ] Create or confirm the Google Play Console app record.
- [ ] Complete the Data safety form and publish a privacy policy.
- [ ] Verify EAS account access in a fresh terminal.
- [ ] Build the `production` Android App Bundle with EAS.
- [ ] Upload the AAB to the Play internal-testing track.
- [ ] Test sign-in, media access, reminders, date handling, and a clean install before production rollout.

## Supabase Actions You Will Perform

### 1. Apply the included database migrations

In Supabase Dashboard, open **SQL Editor**, choose **New query**, and run the contents of these files in order:

1. `supabase/migrations/20260827_property_background_color.sql`
2. `supabase/migrations/20260828_normalize_date_formats.sql`

### 2. Set the reminder scheduler secret

In Supabase Dashboard:

1. Open **Project Settings**.
2. Select **Edge Functions** or **Vault/Secrets**.
3. Add a secret named `REMINDER_CRON_SECRET`.
4. Generate a long random value using a password manager and save it. Do not place it in the app or this repository.
5. Use that same value only in the scheduled job's `x-reminder-cron-secret` request header.
6. Deploy the function from a fresh terminal:

```powershell
npx eas-cli@latest --version
npx supabase@latest functions deploy dispatch-reminders
```

### 3. Enable Google sign-in and test it

Do this before running the RLS migration. It lets us verify the app now obtains a real Supabase user identity.

1. In Supabase Dashboard, open **Authentication** then **URL Configuration**.
2. Add this exact URL under **Redirect URLs**:

```text
rork-7qnyyg8myr2908b1ajb2f://auth/callback
```

3. Open **Authentication** then **Providers**.
4. Select **Google** and turn it on.
5. Google requires a Client ID and Client Secret. Create these in Google Cloud Console by following Supabase's Google provider instructions, then paste them into the Google provider form and save.
6. Build a new **preview** APK after the Google provider is saved. Install it on one test phone.
7. Press **Continue with Google**, complete sign-in, and confirm the app opens to the dashboard.
8. In Supabase Dashboard, open **Authentication** then **Users**. Confirm your Google account appears there.

To replace the long Supabase project name on Google's consent screen:

1. Open Google Cloud Console, then **Google Auth Platform** → **Branding**.
2. Set **App name** to `PadCommand`.
3. Add the PadCommand logo, user support email, homepage, privacy policy, and developer contact email.
4. Save the branding changes and publish the OAuth app when Google makes that option available.

Google may still show the Supabase hostname in technical disclosure text because Supabase handles the OAuth callback. Replacing that hostname everywhere requires a custom Supabase domain and a domain you control.

### 3a. Install atomic household setup

In Supabase Dashboard, open **SQL Editor** → **New query**, paste the complete contents of:

```text
supabase/migrations/20260905_household_auth_rpcs.sql
```

Click **Run**. This makes household creation and invite-code joining atomic and ties both operations to the signed-in Supabase user. It is safe to run before the full RLS migration.

Do not run `20260901_production_rls_policies.sql` yet. Existing tester rows use old Rork user IDs, while Supabase Auth produces new UUID user IDs. Applying RLS first would lock the existing data out. After the Google sign-in test succeeds, we will map the tester accounts and their existing household rows to the new Supabase IDs, then enable RLS safely.

### 4. Apple sign-in (only if you want it in the Play Store release)

Apple sign-in is optional for an Android-only Play Store release. If you keep the Apple button, configure the Apple provider in Supabase before releasing. If you do not need it yet, I can remove the button temporarily so users are not offered a login method that has not been configured.
