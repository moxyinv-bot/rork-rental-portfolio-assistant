# Google Play Store: Complete Submission & App Content Guide

This document contains all the copy-paste answers, store listing copy, and setup requirements needed to submit **PadCommand** to the Google Play Console.

---

## 1. Main Store Listing

### App Details
* **App Name:** `PadCommand` (or `PadCommand - Rental Manager`)
* **Short Description** (up to 80 chars):
  ```text
  Your command center for managing rental properties, leases, expenses, & team.
  ```
* **Full Description** (up to 4000 chars):
  ```text
  Meet PadCommand — your complete command center for managing rental properties, real estate portfolios, and everything you own.

  Designed for landlords, real estate investors, property managers, and households, PadCommand keeps all your properties, financial records, tenant leases, and maintenance schedules organized in one secure place.

  KEY FEATURES:
  • Property Command Center: Track purchase prices, market valuations, square footage, property taxes, appliance details, and interior/exterior paint colors.
  • Income & Expense Tracking: Log income, rent collections, and operating expenses with custom categories, tags, and date filtering.
  • Lease & Document Management: Securely upload and store lease agreements, addendums, and PDF documents. In-app preview, native device viewing, and instant printing.
  • Receipt Scanner & Upload: Capture receipts with your camera or upload from device storage / Google Drive.
  • Renewal & Tax Reminders: Automatic reminders for mortgage renewals, insurance expirations, lease ends, and property tax due dates with calendar integration.
  • "My Team" Contacts: Organize phone numbers, emails, and company details for contractors, insurance agents, plumbers, and tenants.
  • Household Sharing: Share portfolio access in real-time with family members or business partners with cloud sync.
  • Export Reports: Export financial reports and CSV files for tax preparation and bookkeeping.

  Take command of your real estate portfolio today with PadCommand.
  ```

### Graphics & Assets Requirements
* **App Icon:** 512 x 512 px (PNG 32-bit with alpha, already present at `assets/images/icon.png`)
* **Feature Graphic:** 1024 x 500 px (JPEG or PNG 24-bit without alpha)
* **Phone Screenshots:** At least 2 phone screenshots (recommended 4-6) showing the main dashboard, property details, lease documents, and transaction tracking.

---

## 2. App Content Declarations (Play Console &rarr; App Content)

### A. App Access (Reviewer Login)
* **Question:** Is all or part of your app restricted based on login credentials?
* **Answer:** **All or part of my app is restricted**
* **Provide Instructions for Google Reviewers:**
  * **Name of credential:** `Play Store Review Test Account`
  * **Username / Email:** *(Provide a test email address registered in your Supabase Auth, or state that email verification is supported)*
  * **Password:** *(Your test account password)*
  * **Explanation:** *"Sign in with test email/password using the 'Log in with another email' button on the login screen. No SMS or 2FA required for the test account."*

### B. Ads Declaration
* **Does your app contain ads?** &rarr; **No**

### C. Content Rating (IARC Questionnaire)
* **Category:** **Utility, Productivity, Communication, or Other**
* **Violence, Sexual Content, Language, Controlled Substances:** **No** to all.
* **Does the app allow users to exchange messages or share media?** &rarr; **Yes** (Shared household portfolio documents/photos among invited household members).
* **Does the app share user location?** &rarr; **No**
* **Expected Rating:** **Everyone / 3+** (or PEGI 3 / USK 0).

### D. Target Audience and Content
* **Target age group:** **18 and over**
* **Could your store listing appeal to children?** &rarr; **No**

### E. News App Declaration
* **Is your app a news app?** &rarr; **No**

### F. COVID-19 Contact Tracing or Status
* **Answer:** **My app is not a publicly available contact tracing or status app.**

### G. Financial Features Declaration
* Google requires apps with financial tracking to select their classification:
* **Category:** **Personal Finance / Property Asset Management Tool**
* **Select:** "My app provides financial management or budgeting tools (e.g. rental income and expense bookkeeping) and does not issue loans, process payments, or provide banking services."

### H. Government Apps
* **Is your app developed by or on behalf of a government entity?** &rarr; **No**

---

## 3. Store Presence & Contact Information
* **Category:** **Business** or **Productivity**
* **Tags:** *Real Estate, Property Management, Productivity, Finance Tracker*
* **Support Email:** `moxyinv@gmail.com`
* **Privacy Policy URL:** *(Link to your hosted `privacy-policy.html`)*

---

## 4. Building the Production Android App Bundle (.aab)

To generate the final `.aab` file for Google Play Console:

1. Open your terminal in the project directory:
   ```powershell
   npm run android:bundle
   ```
2. The signed `.aab` will be built at:
   ```text
   android\app\build\outputs\bundle\release\app-release.aab
   ```
3. In **Google Play Console**, navigate to **Production** (or **Internal testing**) &rarr; **Create new release** &rarr; Upload `app-release.aab`.
