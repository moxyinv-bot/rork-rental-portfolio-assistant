# EAS (Expo Application Services) Submission Guide for PadCommand

Using **EAS** (Expo Application Services) is the standard, most streamlined way to build and submit Expo/React Native apps to the Google Play Store.

---

## 1. Why EAS is Easier

| Feature | Local Machine Build (`npm run android:bundle`) | Cloud Build via EAS (`eas build`) |
| :--- | :--- | :--- |
| **Keystore Management** | Must store and protect `keystore` file manually | Managed & backed up securely in Expo Cloud |
| **Play Store Upload** | Manual drag-and-drop `.aab` into Play Console | Automatic submission (`eas submit` or `--auto-submit`) |
| **Version Code** | Bumped manually or via script | Automatic cloud auto-increment |
| **Computer Requirements** | Needs full Android SDK, Gradle, Java, RAM | Builds entirely on Expo's cloud servers |

---

## 2. One-Time Setup Prerequisites

### Step 1: Install EAS CLI and Login
If you haven't already:
```powershell
npm install -g eas-cli
eas login
```

### Step 2: Configure Android Credentials (Keystore)
When running your first production build, EAS will prompt you:
* *"Would you like Expo to generate and manage your Android Keystore?"* &rarr; Select **Yes (recommended)**.

---

## 3. Submitting to Google Play Store

There are two ways to get your build to Google Play using EAS:

### Option A: Build in Cloud & Download / Upload Manually (Simplest for First Release)

1. **Trigger the Production Build:**
   ```powershell
   eas build --platform android --profile production
   ```
2. EAS will build the `.aab` (Android App Bundle) on the cloud and give you a download link in terminal and web dashboard.
3. Download the `.aab` and upload it directly to **Google Play Console** &rarr; **Production** (or **Internal Testing**) &rarr; **Create new release**.

---

### Option B: 100% Automated Cloud Submission (`eas submit`)

To let EAS upload directly to your Play Console account:

1. **Create the Initial App Record in Play Console:**
   * Google Play requires you to create the app listing and upload the **first `.aab` manually once** before API submissions can work.
2. **Set up Google Service Account Key:**
   * In **Google Play Console** &rarr; **API Access** &rarr; Link a Google Cloud Project & create a Service Account with "Release manager" permissions.
   * Download the `google-service-account-key.json` and place it in the project root (it is configured in `eas.json`).
3. **Build and Submit in One Command:**
   ```powershell
   eas build --platform android --profile production --auto-submit
   ```
   * EAS will build the bundle and automatically push it to the `internal` testing track on Google Play.

---

## 4. Recommended First-Release Workflow

1. Run `eas build --platform android --profile production`.
2. Download the resulting `.aab` file from your Expo dashboard.
3. In **Google Play Console**, create your app, complete the **Store Listing**, **Privacy Policy**, and **Data Safety Form** (using the guides in [docs/google-play-data-safety-guide.md](docs/google-play-data-safety-guide.md) and [docs/play-store-submission-guide.md](docs/play-store-submission-guide.md)).
4. Upload the downloaded `.aab` into the **Internal Testing** track first to verify with your testers.
5. Promote the release to **Production** when ready.
