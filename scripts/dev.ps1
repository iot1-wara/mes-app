# dev.ps1 - Startet Backend + Frontend lokal

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot
$WORKSPACE = (Get-Item $ROOT).Parent.FullName

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "   MES Production Control - Dev Server" -ForegroundColor Cyan  
Write-Host "=========================================`n" -ForegroundColor Cyan

# Backend als separater PowerShell-Prozess
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WORKSPACE'; node 'node_modules/@nestjs/cli/bin/nest.js' start --watch" -WindowStyle Normal -PassThru
Write-Host "[1/3] Backend gestartet (port 3000) - PID: $($backend.Id)" -ForegroundColor Green

Start-Sleep 5

# Pruefen ob Backend laeuft
try {
    $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop
    if ($conn) {
        Write-Host "[OK] Backend hoerpht auf Port 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "[!] Backend konnte nicht gestartet werden - Manuel: node node_modules/@nestjs/cli/bin/nest.js start --watch" -ForegroundColor Yellow
}

# Frontend als separater PowerShell-Prozess
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WORKSPACE\frontend'; node 'node_modules/vite/bin/vite.js'" -WindowStyle Normal -PassThru
Write-Host "[2/3] Frontend gestartet (port 5173) - PID: $($frontend.Id)" -ForegroundColor Green

Start-Sleep 3

Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "=========================================`n" -ForegroundColor Yellow
