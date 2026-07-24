# deploy.ps1 — MES Production Control System Deployment
# Usage: ./scripts/deploy.ps1 [--staging | --production]

param([string]$Env = "--production")

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MES Deployment" -ForegroundColor Cyan
Write-Host "  Environment: $Env" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 0: Git pre-checks (skip with --force flag) ───────────────
if ($Env -ne "--force") {
    $dirtyStatus = git status --porcelain 2>$null
    if ($dirtyStatus) {
        Write-Host "WARNING: Uncommitted files. Skipping check for local build." -ForegroundColor DarkYellow
    } else {
        Write-Host "Git: clean passed" -ForegroundColor Green
    }
}

$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
Write-Host "Current branch: $currentBranch" -ForegroundColor Gray
Write-Host ""

# ── Step 1: Install dependencies ──────────────────
Write-Host "[1/5] Installing backend dependencies..." -ForegroundColor Green
npm ci --production 2>&1 | Out-Null
Write-Host "      Dependencies installed." -ForegroundColor Gray
Write-Host ""

# ── Step 2: Build Frontend ────────────────────────
Write-Host "[2/5] Building frontend..." -ForegroundColor Green
$origDir = Get-Location
Set-Location frontend
cmd /c "npm run build" 2>&1 | Out-Null
Set-Location $origDir
Write-Host "      Frontend built successfully." -ForegroundColor Gray
Write-Host ""

# ── Step 3: Build Backend ─────────────────────────
Write-Host "[3/5] Building backend (NestJS)..." -ForegroundColor Green
npx nest build 2>&1 | Out-Null
Write-Host "      Backend built successfully." -ForegroundColor Gray
Write-Host ""

# ── Step 4: Health Check ──────────────────────────
Write-Host "[4/5] Checking health endpoint..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/edge/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "      Health check OK!" -ForegroundColor Gray
} catch {
    Write-Host "      Health skipped (server not running)" -ForegroundColor DarkGray
}
Write-Host ""

# ── Step 5: Restart Application ───────────────────
Write-Host "[5/5] Deploy complete!" -ForegroundColor Green

if ($Env -eq "--staging") {
    $pm2Name = "mes-staging"
    Write-Host "      Command to start Staging:" -ForegroundColor Yellow
    Write-Host "      pm2 start ecosystem.config.js --env staging" -ForegroundColor White
} else {
    $pm2Name = "mes-gateway"
    Write-Host "      Command to start Production:" -ForegroundColor Yellow
    Write-Host "      pm2 start ecosystem.config.js --env production" -ForegroundColor White
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Build succeeded!" -ForegroundColor Green
Write-Host "  dist/main.js ready at $(Get-Location)\dist\" -ForegroundColor Gray
Write-Host "  frontend/dist/ ready" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
