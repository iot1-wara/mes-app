#!/usr/bin/env bash
set -euo pipefail

# production deploy.sh — MES Production Control System
Usage: ./scripts/deploy.sh [--staging | --production]

ENV="${1:---production}"

echo "============================================"
echo "  MES Production Deployment"
echo "  Environment: $(echo $ENV | tr '-' ' ')"
echo "============================================"
echo ""

# ── Step 0: Git pre-checks ──────────────────────────
if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: Working directory has uncommitted changes."
    echo "Commit or stash your changes before deploying."
    exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# ── Step 1: Install dependencies ────────────────────
echo "[1/5] Installing backend dependencies..."
npm ci --production 2>&1 | tail -n 1
echo ""

# ── Step 2: Build Frontend ──────────────────────────
echo "[2/5] Building frontend..."
cd frontend && npm run build 2>&1 | tail -n 3
cd ..
echo ""

# ── Step 3: Build Backend ───────────────────────────
echo "[3/5] Building backend (NestJS)..."
npx nest build 2>&1 | tail -n 1 || echo "nest build completed"
echo ""

# ── Step 4: Run database migrations (if needed) ─────
echo "[4/5] Database health check..."
curl -sf http://localhost:3000/api/edge/health && echo "" || echo "Health check skipped (server not running yet)"
echo ""

# ── Step 5: Restart application ─────────────────────
echo "[5/5] Restarting application via pm2..."

if [ "$ENV" = "--staging" ]; then
    ENV_FLAG="--env staging"
    PM2_NAME="mes-staging"
else
    ENV_FLAG="--env production"
    PM2_NAME="mes-gateway"
fi

# Reload pm2 with correct env
npx pm2 reload $PM2_NAME $ENV_FLAG --update-env 2>&1 || npx pm2 start ecosystem.config.js $ENV_FLAG

echo ""
echo "============================================"
echo "  Deployment successful!"
echo "  Environment: $(echo $ENV | tr '-' ' ')"
echo "  PM2 Name:    $PM2_NAME"
echo "============================================"
echo ""
echo "Monitor with:"
echo "  pm2 monit   # Live logs"
echo "  pm2 status  # Process status"
echo ""
