# Building the TurfBook Android APK

Two paths are available — pick one:

| | EAS Cloud (recommended) | Local Build |
|---|---|---|
| Script | `build-apk.ps1` | `build-apk-local.ps1` |
| Requires | Expo account (free) | Android SDK + JDK 17 |
| Uses EAS credits | Yes (free tier included) | No |
| Works offline | No | Yes |
| Signing | Managed by EAS | Debug keystore (auto) |

---

## Before you start — set the backend URL

**Why localhost won't work in an APK:**  
When the app runs in the Android emulator, `10.0.2.2` tunnels to your PC. On a real device there is no such tunnel — `localhost` and `10.0.2.2` both resolve to the phone itself, so all API calls fail with "Connection refused".

You must point the APK at a URL a real device can reach:

| Option | Example URL |
|---|---|
| LAN (same Wi-Fi as PC) | `http://192.168.1.50:8080` |
| ngrok tunnel | `https://abc123.ngrok.io` |
| Deployed backend | `https://api.yourapp.com` |

**Find your LAN IP on Windows:**
```powershell
ipconfig | Select-String "IPv4"
```

---

## Option A — EAS Cloud Build (recommended)

### One-time setup

```powershell
# Install EAS CLI globally
npm install -g eas-cli

# Log in (or create a free account at https://expo.dev/signup)
eas login

# Link the project to your Expo account (run from turfbook-claudeAI/)
eas build:configure
```

### Set the backend URL

Edit `eas.json` and replace the placeholder with your real URL:

```json
"env": {
  "EXPO_PUBLIC_API_URL": "http://192.168.1.50:8080"
}
```

> **Never commit credentials or private API keys in eas.json.**  
> For sensitive values use EAS Secrets: `eas secret:create`

### Run the build

```powershell
cd turfbook-claudeAI

# Option 1 — PowerShell script (with checks + helpful errors)
.\build-apk.ps1

# Option 2 — npm script
npm run build:apk

# Option 3 — direct EAS command
eas build -p android --profile preview
```

> If PowerShell blocks `.ps1` files:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### Get the APK

The build runs in ~5-10 minutes on Expo servers.

```powershell
# Show the download URL in your terminal
eas build:list --platform android --limit 1
```

Or visit the dashboard:  
`https://expo.dev/accounts/<your-account>/projects/turfbook/builds`

---

## Option B — Fully Local Build (no EAS account, no credits)

### Prerequisites

| Tool | Install link |
|---|---|
| Node.js 18+ | https://nodejs.org |
| JDK 17+ | https://adoptium.net |
| Android Studio (includes SDK) | https://developer.android.com/studio |

After installing Android Studio, set `ANDROID_HOME`:

```powershell
# Add to your PowerShell profile or set as a system env var
$env:ANDROID_HOME = "C:\Users\YourName\AppData\Local\Android\Sdk"
```

### Run the build

```powershell
# Set the backend URL (required — cannot be localhost)
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.50:8080"

cd turfbook-claudeAI

# Option 1 — PowerShell script
.\build-apk-local.ps1

# Option 2 — npm script
npm run build:apk:local
```

### APK output

```
android\app\build\outputs\apk\debug\app-debug.apk
```

> This is a **debug** build — suitable for testing. The `assembleDebug` task
> uses a local debug keystore automatically. For a production-signed release
> APK you need a signing keystore:  
> https://docs.expo.dev/app-signing/local-credentials/

---

## Installing the APK on a device

### Via USB (adb)

```powershell
# Enable USB debugging on the phone (Developer Options)
adb install path\to\app-debug.apk
```

### Manually

1. Copy the `.apk` to the phone (USB, Google Drive, email, etc.).
2. On the phone: **Settings → Security → Install from unknown sources** → enable.
3. Open the `.apk` file and tap **Install**.

---

## Making a new build

Each build must have a unique `versionCode`. Increment it in `app.json` before re-running:

```json
"android": {
  "package": "com.turfbook.app",
  "versionCode": 2,
  ...
}
```

For the EAS cloud path you can also let EAS auto-increment by adding to `eas.json`:
```json
"cli": {
  "appVersionSource": "remote"
}
```

---

## eas.json profiles

| Profile | buildType | Purpose |
|---|---|---|
| `preview` | `apk` | Installable APK for testing |
| `production` | `app-bundle` | AAB for Google Play Store |

Run production:
```powershell
eas build -p android --profile production
```
