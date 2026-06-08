# build-apk-uat.ps1 - TurfBook UAT APK build (no EAS cloud, no credits)
#
# Reads .env.uat to set environment variables, then runs:
#   expo prebuild  ->  Gradle assembleDebug
#
# Output: android\app\build\outputs\apk\debug\app-debug.apk
#
# Prerequisites:
#   - Node.js  (https://nodejs.org)
#   - JDK 17+  (https://adoptium.net)
#   - Android Studio / Android SDK  (https://developer.android.com/studio)
#     with ANDROID_HOME pointing to the SDK folder
#
# Usage:
#   cd turfbook-claudeAI
#   .\build-apk-uat.ps1

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "`n[FAIL] $msg`n" -ForegroundColor Red; exit 1 }

Write-Host "================================================" -ForegroundColor Magenta
Write-Host " TurfBook -- UAT APK Build (prebuild + Gradle)" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta

# -- 1. Load .env.uat ---------------------------------------------------------
Step "Loading .env.uat..."
$envFile = ".env.uat"
if (-not (Test-Path $envFile)) {
    Fail ".env.uat not found in current directory. Create it from .env.example."
}
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -match "^\s*$") { return }
    $parts = $_ -split "=", 2
    if ($parts.Count -eq 2) {
        $key   = $parts[0].Trim()
        $value = $parts[1].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        Write-Host "    Loaded: $key=$value" -ForegroundColor DarkGray
    }
}
OK ".env.uat loaded."

# -- 2. Verify Node -----------------------------------------------------------
Step "Checking Node.js..."
try { $nodeVer = node --version 2>&1 } catch { Fail "Node.js not found. Install from https://nodejs.org" }
if ($LASTEXITCODE -ne 0) { Fail "Node.js not found. Install from https://nodejs.org" }
OK "Node $nodeVer"

# -- 3. Verify Java -----------------------------------------------------------
Step "Checking Java (JDK)..."
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Fail "Java not found. Install JDK 17+ from https://adoptium.net"
}
$javaOut = & { $ErrorActionPreference = 'SilentlyContinue'; java -version 2>&1 | Select-Object -First 1 }
OK "Java: $javaOut"

# -- 4. Verify ANDROID_HOME ---------------------------------------------------
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

# -- 5. Verify EXPO_PUBLIC_API_URL --------------------------------------------
Step "Checking EXPO_PUBLIC_API_URL..."
if (-not $env:EXPO_PUBLIC_API_URL) {
    Fail "EXPO_PUBLIC_API_URL is not set in .env.uat."
}
if ($env:EXPO_PUBLIC_API_URL -like "*192.168.*" -or $env:EXPO_PUBLIC_API_URL -like "*localhost*") {
    Write-Host "    WARNING: '$($env:EXPO_PUBLIC_API_URL)' looks like a local/LAN address." -ForegroundColor Yellow
    Write-Host "    UAT builds should point to a real UAT server URL." -ForegroundColor Yellow
    $continue = Read-Host "    Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") { exit 0 }
}
OK "API URL: $env:EXPO_PUBLIC_API_URL"

# -- 6. Install npm dependencies ----------------------------------------------
Step "Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }
OK "Dependencies ready."

# -- 7. expo prebuild ---------------------------------------------------------
Step "Running expo prebuild --platform android --clean..."
Write-Host "    Generates the native android/ project from your Expo config." -ForegroundColor Yellow
Write-Host "    This overwrites the android/ folder (--clean). First run takes 1-2 min." -ForegroundColor Yellow
npx expo prebuild --platform android --clean
if ($LASTEXITCODE -ne 0) { Fail "expo prebuild failed. Check output above." }
OK "Prebuild complete. android/ folder generated."

# -- 8. Gradle assembleDebug --------------------------------------------------
Step "Building UAT debug APK with Gradle (assembleDebug)..."
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

# -- 9. Report output ---------------------------------------------------------
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
    Fail "Build appeared to succeed but APK not found at: $apkPath"
}

$apkSizeMB = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
$apkAbsPath = (Resolve-Path $apkPath).Path

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " UAT BUILD SUCCESSFUL" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  APK    : $apkAbsPath" -ForegroundColor Green
Write-Host "  Size   : $apkSizeMB MB" -ForegroundColor Green
Write-Host "  Env    : UAT ($($env:EXPO_PUBLIC_API_URL))" -ForegroundColor Green
Write-Host ""
Write-Host "Install on device:" -ForegroundColor Cyan
Write-Host "  Via adb (USB debugging on):"
Write-Host "    adb install `"$apkAbsPath`""
Write-Host ""
Write-Host "  Or manually: copy the .apk to your phone and tap to install."
Write-Host "  (Enable 'Install from unknown sources' in Android Settings > Security)"
Write-Host ""
Write-Host "Note: This is a DEBUG build pointed at the UAT server." -ForegroundColor Yellow
