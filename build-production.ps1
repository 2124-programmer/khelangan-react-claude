# build-production.ps1 - TurfBook Production AAB build (EAS cloud build)
#
# Submits a cloud build via EAS using the "production" profile in eas.json.
# Produces an Android App Bundle (.aab) for uploading to the Google Play Store.
# No local Android SDK required.
#
# NOTE: Google Play requires .aab (app-bundle), NOT .apk. This is the file you
#       upload in Play Console. For a sideloadable .apk use build-apk-uat.ps1.
#
# Output: downloadable .aab link printed by EAS after build completes
#
# Prerequisites:
#   - Node.js  (https://nodejs.org)
#   - EAS CLI  (npm install -g eas-cli)
#   - Logged in to EAS: eas login
#
# Usage:
#   cd turfbook-claudeAI
#   .\build-production.ps1

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "`n[FAIL] $msg`n" -ForegroundColor Red; exit 1 }

Write-Host "================================================" -ForegroundColor Magenta
Write-Host " TurfBook -- Production AAB Build (EAS Cloud)" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta

# -- 1. Verify Node -------------------------------------------------------
Step "Checking Node.js..."
try { $nodeVer = node --version } catch { Fail "Node.js not found. Install from https://nodejs.org" }
if ($LASTEXITCODE -ne 0) { Fail "Node.js not found. Install from https://nodejs.org" }
OK "Node $nodeVer"

# -- 2. Verify eas-cli ----------------------------------------------------
Step "Checking eas-cli..."
$easCmd = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easCmd) {
    Fail "eas-cli not found. Run: npm install -g eas-cli"
}
$easVer = (& eas --version | Select-Object -First 1)
OK "eas-cli: $easVer"

# -- 3. Submit EAS cloud build --------------------------------------------
Step "Submitting Production build to EAS (profile: production)..."
Write-Host "    API URL  : https://score-adda-prod.up.railway.app" -ForegroundColor DarkGray
Write-Host "    Platform : android (AAB / app-bundle)" -ForegroundColor DarkGray
Write-Host "    Profile  : production (eas.json)" -ForegroundColor DarkGray
Write-Host "    Channel  : production  |  autoIncrement: on" -ForegroundColor DarkGray
Write-Host ""

eas build -p android --profile production
if ($LASTEXITCODE -ne 0) { Fail "EAS build failed. Check output above." }

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " PRODUCTION BUILD SUBMITTED" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Download the .aab from the EAS dashboard link printed above." -ForegroundColor Green
Write-Host "  Or check: https://expo.dev/accounts/<your-account>/builds" -ForegroundColor Cyan
Write-Host ""
Write-Host "Upload to Google Play:" -ForegroundColor Cyan
Write-Host "  1. Go to Play Console > your app > Release > (Internal testing / Production)"
Write-Host "  2. Create a new release and upload the downloaded .aab"
Write-Host ""
Write-Host "Or submit directly via EAS (uses submit.production in eas.json):" -ForegroundColor Cyan
Write-Host "  eas submit -p android --profile production --latest"
Write-Host ""
Write-Host "(Requires ./play-service-account.json to be present for eas submit)" -ForegroundColor Yellow
