# build-apk-uat.ps1 - TurfBook UAT APK build (EAS cloud build)
#
# Submits a cloud build via EAS using the "uat" profile in eas.json.
# No local Android SDK required.
#
# Output: downloadable .apk link printed by EAS after build completes
#
# Prerequisites:
#   - Node.js  (https://nodejs.org)
#   - EAS CLI  (npm install -g eas-cli)
#   - Logged in to EAS: eas login
#
# Usage:
#   cd turfbook-claudeAI
#   .\build-apk-uat.ps1

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "`n[FAIL] $msg`n" -ForegroundColor Red; exit 1 }

Write-Host "================================================" -ForegroundColor Magenta
Write-Host " TurfBook -- UAT APK Build (EAS Cloud)" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta

# -- 1. Verify Node -------------------------------------------------------
Step "Checking Node.js..."
try { $nodeVer = node --version 2>&1 } catch { Fail "Node.js not found. Install from https://nodejs.org" }
if ($LASTEXITCODE -ne 0) { Fail "Node.js not found. Install from https://nodejs.org" }
OK "Node $nodeVer"

# -- 2. Verify eas-cli ----------------------------------------------------
Step "Checking eas-cli..."
$easCmd = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easCmd) {
    Fail "eas-cli not found. Run: npm install -g eas-cli"
}
$easVer = & eas --version 2>&1 | Select-Object -First 1
OK "eas-cli: $easVer"

# -- 3. Submit EAS cloud build --------------------------------------------
Step "Submitting UAT build to EAS (profile: uat)..."
Write-Host "    API URL  : https://khelangan-java-claude-uat.up.railway.app" -ForegroundColor DarkGray
Write-Host "    Platform : android (APK)" -ForegroundColor DarkGray
Write-Host "    Profile  : uat (eas.json)" -ForegroundColor DarkGray
Write-Host ""

eas build -p android --profile uat
if ($LASTEXITCODE -ne 0) { Fail "EAS build failed. Check output above." }

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " UAT BUILD SUBMITTED" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Download the .apk from the EAS dashboard link printed above." -ForegroundColor Green
Write-Host "  Or check: https://expo.dev/accounts/<your-account>/builds" -ForegroundColor Cyan
Write-Host ""
Write-Host "Install on device via adb (USB debugging on):" -ForegroundColor Cyan
Write-Host "  adb install <path-to-downloaded.apk>"
Write-Host ""
Write-Host "Or copy the .apk to your phone and tap to install." -ForegroundColor Yellow
Write-Host "(Enable 'Install from unknown sources' in Android Settings > Security)" -ForegroundColor Yellow
