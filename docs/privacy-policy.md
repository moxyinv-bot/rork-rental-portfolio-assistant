# Privacy Policy for PadCommand

**Effective Date:** September 12, 2026  
**Last Updated:** September 15, 2026

PadCommand ("we," "our," or "us") provides a real estate and rental property management application designed to help owners, property managers, and households organize property details, track finances, manage leases and receipts, and schedule maintenance reminders.

This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the PadCommand mobile application (the "App") and associated services.

---

## 1. Information We Collect

### A. Information You Provide Directly
* **Account Information:** When you register or sign in using Google Sign-In or email/password authentication, we collect your email address, name, and profile picture (if provided by Google OAuth).
* **Property & Portfolio Data:** Property addresses, purchase details, valuation, rental income, mortgage and insurance policies, appliance records, paint colors, and notes.
* **Financial & Transaction Records:** Income and expense transactions, payment dates, amounts, categories, and tags.
* **Documents, Receipts, and Photos:** Uploaded lease agreements, receipts, invoices, and property photos selected from your device camera, photo library, or file storage.
* **Contacts & Team Members:** Names, phone numbers, email addresses, and company details for contractors, tenants, insurance agents, and team contacts that you add.
* **Reminders & Calendar Entries:** Reminder titles, renewal dates, property tax due dates, and maintenance schedules.

### B. Device Permissions We Request
We only request permissions strictly necessary for app features:
* **Camera (`android.permission.CAMERA`):** Required to capture receipts, document scans, and property photos directly within the app.
* **Photos / Media (`android.permission.READ_MEDIA_IMAGES`, `android.permission.READ_MEDIA_VISUAL_USER_SELECTED`):** Required to allow you to select and upload existing receipts, lease files, or photos from your gallery.
* **Calendar (`android.permission.READ_CALENDAR`, `android.permission.WRITE_CALENDAR`):** Used strictly when you choose to sync mortgage, insurance, or lease renewal reminders to your device's calendar.
* **Internet (`android.permission.INTERNET`):** Required for cloud synchronization and secure data backup with our backend database.
* **Vibrate (`android.permission.VIBRATE`):** Used for standard notification alerts.
* **Storage (legacy, `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE`, older Android versions only):** Used only on older Android versions to attach existing files; not used on modern Android versions, which use the Photos/Media permission instead.

### C. Information We Do NOT Collect or Access
PadCommand does **not** request or access:
* Precise or approximate device location (GPS)
* Microphone or audio recordings
* Your device's phone contacts list (contacts you add in "My Team" are typed manually and stored only in your household's private database)
* SMS, call logs, or phone state
* Background location or device sensors
* Advertising identifiers for third-party ad networks

---

## 2. How We Use Your Information

We use the collected information solely to provide, operate, and maintain PadCommand features:
* Authenticate your identity and secure your account.
* Sync your property portfolio data across your authenticated devices and authorized household members.
* Calculate financial analytics, metrics, cash flow, and tax summaries.
* Generate and export PDF/CSV transaction reports and lease documents.
* Deliver local notification reminders for upcoming mortgage, lease, insurance, or property tax deadlines.
* Provide user support and respond to inquiries sent to `moxyinv@gmail.com`.

We **do not** sell, rent, monetize, or trade your personal or financial data to third-party advertisers or data brokers. PadCommand contains **no advertising**, **no ad networks**, and **no third-party analytics/tracking SDKs**.

---

## 3. Data Storage, Security, and Cloud Infrastructure

* **Data Encryption:** All data transmitted between the App and our backend servers is encrypted in transit using Transport Layer Security (TLS/HTTPS).
* **Database & Storage Provider:** Data is securely hosted using Supabase (PostgreSQL with Row Level Security (RLS) enabled on all household, property, financial, document, contact, and reminder-delivery tables).
* **Access Control:** User data and media files are strictly partitioned by authenticated household membership using database-enforced policies. Unauthorized users, including other PadCommand account holders outside your household, cannot access your property data or uploaded files.
* **Authentication Security:** Sessions use secure token storage (encrypted device keychain/secure storage) and industry-standard OAuth 2.0 / PKCE flow for sign-in.
* **Data Location:** Data is stored on Supabase's managed cloud infrastructure. We do not operate our own physical servers.

---

## 4. Third-Party Services

PadCommand utilizes reputable third-party services for essential app infrastructure:
* **Google Sign-In / Supabase Auth:** For user authentication and session verification.
* **Supabase Cloud Storage:** For secure storage of uploaded receipts, lease PDFs, and property photos.

Each third-party provider processes data in accordance with their respective privacy policies and industry security standards.

---

## 5. Data Retention and Account Deletion

### Retention
We retain your information for as long as your account is active or as necessary to provide you with the App services.

### Account & Data Deletion
You have the right to request deletion of your account and all associated personal and portfolio data at any time:
1. **In-App:** You may delete individual properties, transactions, documents, receipts, and photos at any time directly in the app.
2. **Account Deletion Request:** To permanently delete your entire account, household records, and all uploaded media from our servers, send an email to **`moxyinv@gmail.com`** with the subject **"Account Deletion Request"** using the email address associated with your PadCommand account. All personal and portfolio records will be permanently removed within 30 days.

---

## 6. Children’s Privacy

PadCommand is intended for general audiences and property owners/managers. We do not knowingly collect or solicit personal information from children under the age of 13. If we discover that a child under 13 has provided us with personal information, we will delete such information immediately.

---

## 7. Your Privacy Rights

Depending on your location, you may have the right to:
* Access the personal information we hold about you.
* Request correction of inaccurate information (editable directly in-app).
* Request deletion of your personal information and account (see Section 5).
* Withdraw consent for optional features such as calendar sync at any time.

To exercise any of these rights, contact us at `moxyinv@gmail.com`.

---

## 8. Changes to This Privacy Policy

We may update our Privacy Policy periodically to reflect changes in legal requirements or app features. Any changes will be posted on this page with an updated "Effective Date."

---

## 9. Contact Us

If you have questions, feedback, or privacy-related requests regarding this Privacy Policy or your personal data, please contact us at:

* **Email:** `moxyinv@gmail.com`  
* **Application:** PadCommand  
* **Android Package Name:** `pad.command_release`  
