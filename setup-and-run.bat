Add-Type -TypeDefinition "using System; using System.Runtime.InteropServices; public class P { [DllImport(\"kernel32\")] public static extern bool SetStdHandle(int nStdHandle, IntPtr hHandle); }" 2>$null
[Console]::WriteLine("MES Edge Gateway Setup")

# Install nest.config
Write-Output "[1/4] Installing @nestjs/config..."
npm install @nestjs/config 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Output "  @nestjs/config installed OK" } else { Write-Output "  ERROR: npm install failed for @nestjs/config" }

# Start PostgreSQL via docker-compose
Write-Output "[2/4] Starting PostgreSQL..."
docker-compose up -d postgres 2>&1 | Out-Null
Start-Sleep -Seconds 5

# Verify DB is running
$containerStatus = docker inspect --format '{{.State.Status}}' mes_db -f 2>$null
if ($containerStatus -eq 'running') {
    Write-Output "  PostgreSQL: $containerStatus"
} else {
    Write-Output "  WARNING: Docker container not running (status: $($containerStatus or 'N/A'))"
}

# Bootstrap NestJS server
Write-Output "[3/4] Starting NestJS dev server..."
npm run start:dev 2>&1 | Out-Null

Write-Output ""
Write-Output "Setup complete!"
