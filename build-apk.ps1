# build-apk.ps1 — TurfBook EAS cloud APK build (Windows / PowerShell)
#
# Produces an installable .apk via EAS Build (Expo cloud).
# No Android SDK or local toolchain required — just Node + an Expo account.
#
# IMPORTANT: Edit eas.json first and set EXPO_PUBLIC_API_URL to your real
#            backend URL (not localhost / 10.0.2.2) before running.
#
# Usage:
#   cd turfbook-claudeAI
#   .\build-apk.ps1
#
# If PowerShell blocks the script:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "`n[FAIL] $msg`n" -ForegroundColor Red; exit 1 }

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " TurfBook — EAS Cloud APK Build" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# ── 1. Verify Node ───────────────────────────────────────────────────────────
Step "Checking Node.js..."
try { $nodeVer = node --version 2>&1 } catch { Fail "Node.js not found. Install from https://nodejs.org" }
if ($LASTEXITCODE -ne 0) { Fail "Node.js check failed. Install from https://nodejs.org" }
OK "Node $nodeVer"

# ── 2. Verify npm ────────────────────────────────────────────────────────────
Step "Checking npm..."
try { $npmVer = npm --version 2>&1 } catch { Fail "npm not found. Reinstall Node.js." }
OK "npm $npmVer"

# ── 3. Check / install EAS CLI ───────────────────────────────────────────────
Step "Checking EAS CLI..."
$easFound = $false
try {
    $easVer = eas --version 2>&1
    if ($LASTEXITCODE -eq 0) { $easFound = $true }
} catch {}

if (-not $easFound) {
    Write-Host "    EAS CLI not found. Installing globally (npm install -g eas-cli)..." -ForegroundColor Yellow
    npm install -g eas-cli
    if ($LASTEXITCODE -ne 0) { Fail "Failed to install eas-cli.`nFix: run  npm install -g eas-cli  manually, then retry." }
    $easVer = eas --version 2>&1
}
OK "EAS CLI $easVer"

# ── 4. Verify EAS login ──────────────────────────────────────────────────────
Step "Checking EAS account..."
$whoami = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "    Not logged in. Launching 'eas login'..." -ForegroundColor Yellow
    eas login
    if ($LASTEXITCODE -ne 0) { Fail "EAS login failed. Create a free account at https://expo.dev/signup" }
    $whoami = eas whoami 2>&1
}
OK "Logged in as: $whoami"

# ── 5. Validate eas.json backend URL ────────────────────────────────────────
Step "Validating backend URL in eas.json..."
if (-not (Test-Path "eas.json")) {
    Fail "eas.json not found. Run this script from the turfbook-claudeAI directory."
}
$easJson = Get-Content -Raw "eas.json" | ConvertFrom-Json
$apiUrl = $easJson.build.preview.env.EXPO_PUBLIC_API_URL
if ([string]::IsNullOrWhiteSpace($apiUrl) -or $apiUrl -like "*YOUR_BACKEND_URL*") {
    Fail @"
EXPO_PUBLIC_API_URL is not set in eas.json.
Edit  eas.json > build > preview > env > EXPO_PUBLIC_API_URL
and set it to your real backend URL, for example:
  "EXPO_PUBLIC_API_URL": "http://192.168.1.50:8080"      (LAN)
  "EXPO_PUBLIC_API_URL": "https://api.yourapp.com"       (deployed)
  "EXPO_PUBLIC_API_URL": "https://abc123.ngrok.io"       (ngrok tunnel)

DO NOT use localhost or 10.0.2.2 — those only work in the emulator, not on a real device.
"@
}
if ($apiUrl -like "*localhost*" -or $apiUrl -like "*10.0.2.2*") {
    Write-Host "    WARNING: URL '$apiUrl' looks like an emulator-only address." -ForegroundColor Yellow
    Write-Host "    The APK will fail to connect on a real device." -ForegroundColor Yellow
    $continue = Read-Host "    Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") { exit 0 }
}
OK "Backend URL: $apiUrl"

# ── 6. Install npm dependencies ──────────────────────────────────────────────
Step "Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install failed. Check for errors above." }
OK "Dependencies ready."

# ── 7. EAS cloud build ───────────────────────────────────────────────────────
Step "Submitting build to EAS cloud (profile: preview)..."
Write-Host "    Build will run on Expo servers (~5-10 min)." -ForegroundColor Yellow
Write-Host "    Monitor at: https://expo.dev/accounts/$whoami/projects/turfbook/builds" -ForegroundColor Yellow
Write-Host ""
eas build -p android --profile preview
if ($LASTEXITCODE -ne 0) { Fail "EAS build submission failed. See output above." }

# ── 8. Done ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " BUILD SUBMITTED" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host @"

When it finishes (~5-10 min), get the APK:
  Option A — Dashboard:
    https://expo.dev/accounts/$whoami/projects/turfbook/builds

  Option B — Terminal (lists download URL):
    eas build:list --platform android --limit 1

Install on device:
  1. Enable 'Install from unknown sources' in Android Settings > Security.
  2. Download the .apk directly on the phone and tap it, OR
     transfer via USB and run:  adb install app-preview.apk

New build (after changing code):
  - Increment versionCode in app.json before re-running this script.
"@
