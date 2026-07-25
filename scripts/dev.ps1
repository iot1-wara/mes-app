# dev.ps1 — Startet Backend + Frontend als persistente Processes
Write-Host "Starting MES Development Server..." -ForegroundColor Green

$backendPort = 3000
$frontendPort = 5173

# Check and kill existing processes on our ports
function Kill-ProcessOnPort {
    param($port)
    $procs = netstat -ano | findstr ":$port" | ForEach-Object { $_.trim().split(' ')[-1] } | Where-Object { $_ -match '^\d+$' -and [int]$_ -gt 0 } | Select-Object -Unique
    foreach ($p in $procs) {
        try { Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue; Write-Host "Killed PID $p on port $port" -ForegroundColor DarkGray } catch {}
    }
}

Kill-ProcessOnPort $backendPort
Kill-ProcessOnPort $frontendPort
Start-Sleep -Seconds 1

Write-Host "" | Out-Null
$bgPrefs = @{ foregroundcolor = "Green"; backgroundColor = "Black" }
Write-Host "Backend PID:" -ForegroundColor Cyan -NoNewline
$backendProc = Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$PWD'; npm run start:dev" -PassThru -WindowStyle Normal
Write-Host " $($backendProc.Id)" -ForegroundColor Gray

Start-Sleep -Seconds 2

Write-Host "" | Out-Null
Write-Host "Frontend PID:" -ForegroundColor Cyan -NoNewline
$frontendProc = Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$PWD/frontend'; npm run dev" -PassThru -WindowStyle Normal  
Write-Host " $($frontendProc.Id)" -ForegroundColor Gray

Write-Host "" | Out-Null
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "MES Dev Server is running" -ForegroundColor Cyan  
Write-Host "  Frontend: http://localhost:$frontendPort" -ForegroundColor White
Write-Host "  Backend:  http://localhost:$backendPort" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
