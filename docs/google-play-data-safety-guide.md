# Google Play Console: Data Safety Form Walkthrough

This guide provides the exact answers required to complete the **Data Safety** section in the **Google Play Console** for **PadCommand**.

Navigate to: **Google Play Console** &rarr; Your App (**PadCommand**) &rarr; **App Content** &rarr; **Data Safety**.

---

## 1. Overview Questions

| Question | Answer |
| :--- | :--- |
| **Does your app collect or share any of the required user data types?** | **Yes** |
| **Is all of the user data collected by your app encrypted in transit?** | **Yes** (All data uses HTTPS/TLS) |
| **Do you provide a way for users to request that their data be deleted?** | **Yes** |
| **Add a link that users can use to request their data be deleted:** | Provide your website URL or a link to `privacy-policy.html` / deletion instructions (e.g. `https://yourdomain.com/privacy-policy#deletion` or your privacy policy link). |

---

## 2. Data Types Collected

Select the following data categories:

### A. Personal Info
* [x] **Name**
* [x] **Email address**

### B. Financial Info
* [x] **Other financial info** *(rental income, mortgage payments, expense transactions)*

### C. Photos and Videos
* [x] **Photos** *(receipt captures, property cover photos, photo gallery)*

### D. Files and Docs
* [x] **Files and docs** *(lease agreements, scanned PDFs, documents)*

### E. Calendar
* [x] **Calendar events** *(mortgage, insurance, and lease renewal dates)*

### F. Contacts
* [x] **Contacts** *(Team / contractor / insurance contact list created by the user)*

---

## 3. Data Usage and Handling (For each selected type)

When prompted to answer details for each category:

### 1. Name & Email Address
* **Collected or Shared?** &rarr; **Collected** (Not shared with third parties)
* **Is this data processed ephemerally?** &rarr; **No** (Stored in database for account & household sync)
* **Is this data required for your app?** &rarr; **Yes, data collection is required** (for account creation & login)
* **Why is this user data collected?** &rarr;
  * [x] **App functionality**
  * [x] **Account management**

### 2. Financial Info (Other financial info)
* **Collected or Shared?** &rarr; **Collected** (Not shared with third parties)
* **Is this data processed ephemerally?** &rarr; **No**
* **Is this data required for your app?** &rarr; **No, users can choose whether to enter financial data** (Optional)
* **Why is this user data collected?** &rarr;
  * [x] **App functionality** *(Property income/expense management)*

### 3. Photos (Receipts & Property Photos)
* **Collected or Shared?** &rarr; **Collected** (Not shared with third parties)
* **Is this data processed ephemerally?** &rarr; **No** (Stored in secure cloud storage)
* **Is this data required for your app?** &rarr; **No, users can choose whether to upload photos** (Optional)
* **Why is this user data collected?** &rarr;
  * [x] **App functionality**

### 4. Files and Docs (Leases & Documents)
* **Collected or Shared?** &rarr; **Collected** (Not shared with third parties)
* **Is this data processed ephemerally?** &rarr; **No** (Stored in secure cloud storage)
* **Is this data required for your app?** &rarr; **No, users can choose whether to upload documents** (Optional)
* **Why is this user data collected?** &rarr;
  * [x] **App functionality**

### 5. Calendar (Renewal & Maintenance Reminders)
* **Collected or Shared?** &rarr; **Collected / Synced to device**
* **Is this data processed ephemerally?** &rarr; **No**
* **Is this data required for your app?** &rarr; **No, users can choose whether to add calendar reminders** (Optional)
* **Why is this user data collected?** &rarr;
  * [x] **App functionality**

### 6. Contacts (My Team / Contractors / Tenants)
* **Collected or Shared?** &rarr; **Collected** (Stored in household database, not uploaded from phone address book)
* **Is this data processed ephemerally?** &rarr; **No**
* **Is this data required for your app?** &rarr; **No, optional user input**
* **Why is this user data collected?** &rarr;
  * [x] **App functionality**

---

## 4. Privacy Policy Link for Play Console

In Google Play Console &rarr; **App Content** &rarr; **Privacy Policy**, paste the public URL where you host `docs/privacy-policy.html` (or your GitHub Pages / website link).
