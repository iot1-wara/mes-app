# Start-Simulator - startet OPC UA Simulator + Test UI Dashboard
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$simDir = Join-Path $scriptDir "..\simulator"
$uiDir = Join-Path $simDir "ui"

# Prüfe ob Ordner existieren
if (-not (Test-Path $simDir)) { Write-Error "simulator/ folder not found"; exit 1 }
if (-not (Test-Path $uiDir)) { Write-Error "simulator/ui/ folder not found"; exit 1 }

# Simulator starten
Write-Host "Starte OPC UA Simulator..." -ForegroundColor Cyan
$simProcess = Start-Process -FilePath "node" -ArgumentList "dist/index.js" -WorkingDirectory $simDir -PassThru

Sleep 2

# UI Dashboard starten
Write-Host "Starte Test UI Dashboard..." -ForegroundColor Cyan
$npxCmd = Join-Path $uiDir "node_modules\.bin\vite.cmd"
if (Test-Path $npxCmd) {
    Start-Process -FilePath "cmd" -ArgumentList "/c", "vite --host 0.0.0.0" -WorkingDirectory $uiDir
} else {
    Start-Process -FilePath "npx" -ArgumentList "vite", "--host", "0.0.0.0" -WorkingDirectory $uiDir
}

Write-Host "`nDone!" -ForegroundColor Green
Write-Host "  OPC UA Simulator: ports 5500-5504, HTTP API on 4841"
Write-Host "  Test UI Dashboard: http://localhost:5173/"
