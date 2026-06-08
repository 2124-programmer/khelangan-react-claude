# start-uat.ps1 - Start Expo dev server pointed at UAT backend
#
# Reads .env.uat, sets env vars in current process, then runs expo start.
# Your phone/emulator will hit the Railway UAT backend instead of local.
#
# Usage:
#   cd turfbook-claudeAI
#   .\start-uat.ps1

$ErrorActionPreference = "Stop"

$envFile = ".env.uat"
if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] .env.uat not found." -ForegroundColor Red
    exit 1
}

Write-Host "Loading $envFile..." -ForegroundColor Cyan
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -match "^\s*$") { return }
    $parts = $_ -split "=", 2
    if ($parts.Count -eq 2) {
        $key   = $parts[0].Trim()
        $value = $parts[1].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        Write-Host "  $key=$value" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Starting Expo dev server (UAT backend: $env:EXPO_PUBLIC_API_URL)" -ForegroundColor Green
Write-Host ""

npx expo start
