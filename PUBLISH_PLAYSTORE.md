# Publishing Score-Adda to the Google Play Store

> Google Play does **not** accept a plain `.apk` for new apps — it requires an
> Android App Bundle (`.aab`). The `production` profile in `eas.json` already
> builds an `.aab` (`buildType: "app-bundle"`), so use that profile, not the
> `preview`/`uat` APK profiles.

This is the full path from source to a live listing. Steps marked **(you)** must
be done by hand in the Google Play Console / Google Cloud — they can't be scripted.

---

## 0. One-time prerequisites

| Item | How |
|---|---|
| Google Play Developer account ($25 one-time) | https://play.google.com/console/signup **(you)** |
| EAS CLI | `npm install -g eas-cli` then `eas login` |
| Production backend is live | `https://khelangan-java-claude-production.up.railway.app` should respond |

The app identity is already set in `app.json`:
- **Package name:** `com.scoreadda.app` (permanent — can never change after first upload)
- **App name:** Score-Adda
- **Version name:** `1.0.0`

The Android `versionCode` is now managed by EAS (`appVersionSource: "remote"` +
`autoIncrement: true` on the production profile), so every production build gets a
fresh, increasing version code automatically. You will **never** hit Play's
"version code N has already been used" error again.

---

## 1. Build the release bundle

```powershell
cd turfbook-claudeAI
eas build -p android --profile production
```

- First run will offer to **generate a release keystore** — say **yes** and let
  EAS manage it. This keystore signs every future update; EAS keeps it safe.
  (Do NOT lose it — losing it means you can never update the app.)
- Output is an `.aab`. Download it from the build URL printed in the terminal,
  or from https://expo.dev/accounts/2124.programmer/projects/turfbook/builds

---

## 2. Create the app in Play Console **(you)**

1. https://play.google.com/console → **Create app**
2. App name: **Score-Adda**, language, **App** (not game), **Free** (or Paid).
3. Accept the declarations.

---

## 3. First upload must be manual **(you)**

`eas submit` cannot create a brand-new listing — the app must exist first.

1. In Play Console → **Testing → Internal testing → Create new release**.
2. Upload the `.aab` from step 1.
3. Add release notes, **Save → Review → Start rollout to Internal testing**.
4. Add your own Google account as an internal tester and install via the opt-in
   link to smoke-test against the production backend.

---

## 4. Complete the required store listing **(you)**

Play will not let you go to production until these are done (left-nav checklist):

- **Store listing**: short + full description, app icon (512×512), feature graphic
  (1024×500), at least 2 phone screenshots.
- **Privacy policy URL** — **required** because the app collects account data,
  location, and photos. Host a page and paste the URL.
- **Data safety form** — declare what the app collects. Based on this codebase:
  - Personal info: name, email, phone (account)
  - Location: approximate + precise (nearby venues — `ACCESS_FINE/COARSE_LOCATION`)
  - Photos: user uploads venue/profile images (`READ_MEDIA_IMAGES`, camera)
  - Notifications: `POST_NOTIFICATIONS`
  - All transmitted over HTTPS; declare whether data is encrypted in transit (yes).
- **Content rating** questionnaire.
- **Target audience**, **Ads** (declare none if you have no ads), **Government apps**.

---

## 5. Automate future submissions with `eas submit`

After the app exists, you can push builds straight from the CLI.

1. **Create a Google Play service account (you):**
   - Play Console → **Setup → API access** → link a Google Cloud project →
     **Create service account** → in Google Cloud grant it a role, then back in
     Play Console grant it **Admin (or Release manager)** permissions.
   - Create a **JSON key** for that service account and download it.
2. Save the JSON as `turfbook-claudeAI/play-service-account.json`.
   - This filename is already git-ignored — **never commit it.**
   - `eas.json` → `submit.production.android.serviceAccountKeyPath` points to it.
3. Submit the latest build:

```powershell
eas submit -p android --profile production
```

This uploads to the **internal** track as a **draft** (configured in `eas.json`).
Promote internal → closed → production from the Play Console when ready, or change
`track` to `"production"` in `eas.json` once you're confident.

---

## 6. Shipping updates later

Native/store update (new code, new permissions, dependency bumps):

```powershell
eas build -p android --profile production   # versionCode auto-increments
eas submit -p android --profile production
```

Bump the user-facing **version name** in `app.json` (`"version": "1.0.1"`) for each
release so testers can tell builds apart. The `versionCode` is handled for you.

JS-only hot fix (no native change) — if you adopt EAS Update, the production build
already listens on the `production` channel:

```powershell
eas update --branch production --message "fix: ..."
```

---

## Quick reference

| Task | Command |
|---|---|
| Release bundle (AAB) | `eas build -p android --profile production` |
| Submit to Play (internal/draft) | `eas submit -p android --profile production` |
| Check build status / URL | `eas build:list --platform android --limit 1` |
| OTA JS update | `eas update --branch production --message "..."` |

## Optional: enable in-app Google Maps

Venue maps currently show a static fallback. To render the live Google map in the
release build you need **two** things (the app gracefully degrades without them):

1. A Maps SDK for Android key in `EXPO_PUBLIC_GOOGLE_MAPS_KEY` (production env).
2. The same key in the Android manifest via `app.json`:
   ```json
   "android": {
     "config": { "googleMaps": { "apiKey": "YOUR_ANDROID_MAPS_KEY" } }
   }
   ```
Both are required together — setting only the env var will crash `PROVIDER_GOOGLE`.
