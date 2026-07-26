# Start-Simulator - startet OPC UA Simulator + Test UI Dashboard
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$simDir = Join-Path $scriptDir "..\simulator"
$uiDir = Join-Path $simDir "ui"

# Prüfe ob Ordner existieren
if (-not (Test-Path $simDir)) { Write-Error "simulator/ folder not found"; exit 1 }
if (-not (Test-Path $uiDir)) { Write-Error "simulator/ui/ folder not found"; exit 1 }

# Simulator OPC UA + HTTP API starten
Write-Host "Starte OPC UA Simulator..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd '$simDir'; node dist/index.js" -WindowStyle Normal

Sleep 2

# UI Dashboard starten
Write-Host "Starte Test UI Dashboard..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd '$uiDir'; npx vite --host 0.0.0.0 --port 5176" -WindowStyle Normal

Sleep 2

# Prüfen ob alles aufgesetzt wurde
$statuses = @()
foreach ($p in @(4841, 5176)) {
    $listener = netstat -ano | Select-String ":$p.*ABH\|:${p}\s"  
    if ($listener) { $statuses += "OK" } else { $statuses += "MISSING" }
}

Write-Host "`nDone!" -ForegroundColor Green
if ($statuses -contains "MISSING") {
    Write-Host "Some services may not have started yet. Check manually." -ForegroundColor Yellow
}
Write-Host "  OPC UA Simulator: ports 5500-5504, HTTP API on 4841"
Write-Host "  Test UI Dashboard: http://localhost:5176/"
