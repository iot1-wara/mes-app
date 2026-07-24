# dev.ps1 - Startet Backend + Frontend lokal
Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "   MES Production Control - Dev Server" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Backend starten (Hintergrund-Fenster, kein -NoExit damit es stabil läuft)
$backend = Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd 'C:\Users\AndreasHeid\Documents\mes-app'; npx nest start --watch" -WindowStyle Normal -PassThru
Write-Host "[1/3] Backend gestartet (port 3000) - PID: $backend.Id" -ForegroundColor Green

# Auf Start warten
Start-Sleep 8

# Prüfen ob Backend läuft
$running = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "[OK] Backend läuft auf Port 3000" -ForegroundColor Green
} else {
    Write-Host "[WARN] Backend startet (ggf. kompiliert noch)" -ForegroundColor Yellow
}

# Frontend starten (nach 2s damit Port frei wird)
Start-Sleep 2
$frontend = Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd 'C:\Users\AndreasHeid\Documents\mes-app\frontend'; npm run dev" -WindowStyle Normal -PassThru
Write-Host "[2/3] Frontend gestartet (port 5173) - PID: $frontend.Id" -ForegroundColor Green

Start-Sleep 6

# Prüfen ob Frontend läuft
$frunning = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($frunning) {
    Write-Host "[OK] Frontend läuft auf Port 5173" -ForegroundColor Green
} else {
    Write-Host "[WARN] Frontend startet (ggf. building noch)" -ForegroundColor Yellow
}

Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "=========================================`n" -ForegroundColor Yellow
