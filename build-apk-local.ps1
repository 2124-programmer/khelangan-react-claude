# build-apk-local.ps1 - TurfBook LOCAL APK build (no EAS cloud, no credits)
#
# Uses: expo prebuild  ->  Gradle assembleDebug
# Output: android\app\build\outputs\apk\debug\app-debug.apk
#
# Prerequisites (must be installed before running):
#   - Node.js  (https://nodejs.org)
#   - JDK 17+  (https://adoptium.net)
#   - Android Studio / Android SDK  (https://developer.android.com/studio)
#     with ANDROID_HOME environment variable pointing to the SDK folder,
#     e.g.  C:\Users\YourName\AppData\Local\Android\Sdk
#
# Usage:
#   $env:EXPO_PUBLIC_API_URL = "http://192.168.1.50:8080"
#   cd turfbook-claudeAI
#   .\build-apk-local.ps1
#
# If PowerShell blocks the script:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "`n[FAIL] $msg`n" -ForegroundColor Red; exit 1 }

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " TurfBook -- Local APK Build (prebuild + Gradle)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# -- 1. Verify Node -----------------------------------------------------------
Step "Checking Node.js..."
try { $nodeVer = node --version 2>&1 } catch { Fail "Node.js not found. Install from https://nodejs.org" }
if ($LASTEXITCODE -ne 0) { Fail "Node.js not found. Install from https://nodejs.org" }
OK "Node $nodeVer"

# -- 2. Verify Java -----------------------------------------------------------
Step "Checking Java (JDK)..."
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Fail "Java not found. Install JDK 17+ from https://adoptium.net"
}
# java -version writes to stderr by design; run in a local scope so ErrorRecords
# from 2>&1 don't trigger the top-level Stop preference.
$javaOut = & { $ErrorActionPreference = 'SilentlyContinue'; java -version 2>&1 | Select-Object -First 1 }
OK "Java: $javaOut"

# -- 3. Verify ANDROID_HOME ---------------------------------------------------
Step "Checking ANDROID_HOME..."
if (-not $env:ANDROID_HOME) {
    Write-Host ""
    Write-Host "  ANDROID_HOME is not set." -ForegroundColor Red
    Write-Host "  Install Android Studio, then set the env var, e.g.:" -ForegroundColor Red
    Write-Host "    [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')" -ForegroundColor Yellow
    Write-Host "  Then restart PowerShell and retry." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $env:ANDROID_HOME)) {
    Fail "ANDROID_HOME='$($env:ANDROID_HOME)' does not exist. Check the path."
}
OK "ANDROID_HOME: $env:ANDROID_HOME"

# -- 4. Verify EXPO_PUBLIC_API_URL --------------------------------------------
Step "Checking EXPO_PUBLIC_API_URL..."
if (-not $env:EXPO_PUBLIC_API_URL) {
    Write-Host ""
    Write-Host "  EXPO_PUBLIC_API_URL is not set." -ForegroundColor Red
    Write-Host "  Set it to your backend URL before running, e.g.:" -ForegroundColor Red
    Write-Host '    $env:EXPO_PUBLIC_API_URL = "http://192.168.1.50:8080"' -ForegroundColor Yellow
    Write-Host "  DO NOT use localhost or 10.0.2.2 -- those only work in the emulator." -ForegroundColor Red
    exit 1
}
if ($env:EXPO_PUBLIC_API_URL -like "*localhost*" -or $env:EXPO_PUBLIC_API_URL -like "*10.0.2.2*") {
    Write-Host "    WARNING: '$($env:EXPO_PUBLIC_API_URL)' is emulator-only." -ForegroundColor Yellow
    Write-Host "    The APK will not connect on a real device." -ForegroundColor Yellow
    $continue = Read-Host "    Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") { exit 0 }
}
OK "API URL: $env:EXPO_PUBLIC_API_URL"

# -- 5. Install npm dependencies ----------------------------------------------
Step "Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }
OK "Dependencies ready."

# -- 6. expo prebuild ---------------------------------------------------------
Step "Running expo prebuild --platform android --clean..."
Write-Host "    Generates the native android/ project from your Expo config." -ForegroundColor Yellow
Write-Host "    This overwrites the android/ folder (--clean). First run takes 1-2 min." -ForegroundColor Yellow
npx expo prebuild --platform android --clean
if ($LASTEXITCODE -ne 0) { Fail "expo prebuild failed. Check output above." }
OK "Prebuild complete. android/ folder generated."

# -- 7. Gradle assembleDebug --------------------------------------------------
Step "Building debug APK with Gradle (assembleDebug)..."
Write-Host "    First Gradle run downloads dependencies (~200-500 MB). Subsequent runs are faster." -ForegroundColor Yellow

$gradlew = "android\gradlew.bat"
if (-not (Test-Path $gradlew)) {
    Fail "gradlew.bat not found at android\gradlew.bat -- prebuild may have failed."
}

Push-Location android
try {
    .\gradlew assembleDebug --stacktrace
    if ($LASTEXITCODE -ne 0) { Fail "Gradle assembleDebug failed. See stacktrace above." }
} finally {
    Pop-Location
}

# -- 8. Report output ---------------------------------------------------------
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
    Fail "Build appeared to succeed but APK not found at: $apkPath"
}

$apkSizeMB = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
$apkAbsPath = (Resolve-Path $apkPath).Path

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " LOCAL BUILD SUCCESSFUL" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  APK : $apkAbsPath" -ForegroundColor Green
Write-Host "  Size: $apkSizeMB MB" -ForegroundColor Green
Write-Host ""
Write-Host "Install on device:" -ForegroundColor Cyan
Write-Host "  Via adb (USB debugging on):"
Write-Host "    adb install `"$apkAbsPath`""
Write-Host ""
Write-Host "  Or manually: copy the .apk to your phone and tap to install."
Write-Host "  (Enable 'Install from unknown sources' in Android Settings > Security)"
Write-Host ""
Write-Host "Note: This is a DEBUG build -- fine for testing, not for production." -ForegroundColor Yellow
