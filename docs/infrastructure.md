# MES Production Control System — Infrastruktur-Konzept

## Architektur-Übersicht (Production)

```
                    ┌─────────────────────────────┐
                    │    Load Balancer / SSL      │
                    │   (Nginx Caddy Traefik)     │
                    │     localhost:443 / :80     │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │  Mes Node 1  │  │  Mes Node 2  │  │  Mes Node N  │   ← PM2 Cluster Mode
     │ :3000       │  │ :3001       │  │ :300N       │
     │             │  │             │  │             │
     │ /api/*      │  │ /api/*      │  │ /api/*      │  ← REST API
     │ /* static   │  │ /* static   │  │ /* static   │  ← Embedded Frontend
     │ edge/ws     │  │ edge/ws     │  │ edge/ws     │  ← WebSocket (Heartbeat)
     └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
            │                │                │
            └────────────────┼────────────────┘
                             ▼
              ┌─────────────────────────────┐
              │    PostgreSQL + TimescaleDB │   ← Hypertables, Continuous Aggregates
              │    localhost:5432           │
              └─────────────────────────────┘
```

---

## 1. Development Environment

### Ziel
- Local lauffähig ohne Docker-Prozess-Erwartung
- Hot Reload für Frontend + Backend parallel
- Ein Befehl zum Starten, ein Befehl zum Stoppen

### Komponenten

| Komponente        | Port | Werkzeug           | Run Mode         |
|-------------------|------|--------------------|------------------|
| PostgreSQL/TimescaleDB | 5432 | Docker (optional)  | Container oder Windows-Binary |
| NestJS Backend    | 3000 | `nest start --watch`      | Dev Watch        |
| Vite Frontend     | 5173 | `vite`           | Dev HMR Server   |

### Workflow

```bash
# Infrastruktur starten (optional — DB läuft local als Windows Service)
docker compose up -d postgres

# Alles in einem Terminal-Fenster (frontend + backend parallel)
npm run dev

# Oder separat (wenn man ein Modul fokussiert debuggen will)
npm run dev:backend    # :3000
npm run dev:front      # :5173
```

**Frontend-Dev mit Backend-Proxys:**

Vite proxy (`frontend/vite.config.js`) leitet `/api/*` an `localhost:3000` weiter.
Das bedeutet beim Browsen von `http://localhost:5173`:
- React Components kommen vom Vite Dev Server (HMR aktiv)
- Alle API Calls (`/api/machines`, `/api/dashboard/oee`) landen automatisch auf `localhost:3000/api/*`

**Keine CORS-Konfiguration nötig in Dev** — der Proxy transparent.

---

## 2. Staging Environment (Pre-Production)

### Ziel
Exakt Production-Bedingungen simulieren incl. OPC UA und MQTT.

### Setup

```yaml
# docker-compose.staging.yml
version: "3.9"

services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: mes_production
    ports: ["5432:5432"]
    volumes: [staging_data:/var/lib/postgresql/data]

  mqtt:
    image: eclipse-mosquitto:2
    ports: ["1883:1883"]
    volumes: ["./mosquitto/config/:/ mosquitto/config"]

volumes:
  staging_data:
```

### Deployment Pipeline

```
Git Push main
   │
   ▼
CI (Build + Test)
   │
   ▼
Staging Deploy (automatisch per push auf main)
   │
   ▼
Smoke Tests (curl health check + manual QA)
   │
   ▼
Manual Promotion → Production Deployment
```

---

## 3. Production Environment

### Ziel
Zero-Downtime, SSL/TLS, Load Balanced, Auto-Recovery.

### Container-Stack (Docker Compose auf Produktionsserver)

```yaml
# docker-compose.production.yml — Server-Ebene

services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    restart: always
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: mes_production
    volumes:
      - prod_data:/var/lib/postgresql/data
    labels: [traefik.enable=false]  # Kein direct HTTP access

  mes-app:
    build: .
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      MQTT_BROKER_URL: ${MQTT_BROKER_URL:-mqtt://localhost:1883}
      OPCUA_ENDPOINT_URL: ${OPCUA_ENDPOINT_URL}
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
    labels:
      - traefik.http.routers.mes.rule=Host(`mes.yourdomain.com`)
      - traefik.http.services.mes.loadbalancer.server.port=3000
    depends_on: [postgres]

volumes:
  prod_data:
```

### PM2 Alternative (nicht Docker)

Falls Container nicht gewünscht:

```js
// ecosystem.production.config.js
module.exports = {
  apps: [{
    name: 'mes-gateway',
    script: 'dist/main.js',
    instances: 'max',                          // Equal CPU Cores
    exec_mode: 'cluster',                       // Horizontal scaling
    max_memory_restart: '900M',                 // OOM Protection
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    autorestart: true,                          // Auto-Recovery
    watch: false,                                // NO watch in prod!
  }],
};
```

### Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/mes
upstream mes_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;  # Node 2
    # ... weitere PM2 Worker
}

server {
    listen 80;
    server_name mes.yourdomain.com;
    return 301 https://$host$request_uri;  # HTTP → HTTPS erzwingen
}

server {
    listen 443 ssl http2;
    server_name mes.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/mes.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mes.yourdomain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Strict-Transport-Security "max-age=63072000" always;

    # WebSocket Support
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    location /api/ {
        proxy_pass http://mes_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;

        # Rate Limiting
        limit_req zone=api burst=50 nodelay;
    }

    location /edge/ws {
        proxy_pass http://mes_backend/edge/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;  // Lange-lived WebSocket connection
    }

    location / {
        proxy_pass http://mes_backend/;
        proxy_set_header Host $host;
    }
}
```

---

## 4. CI/CD Pipeline (GitHub Actions)

### File: `.github/workflows/ci.yml`

```yaml
name: MES Production Control CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # ──── VALIDATION ────
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npm run lint --if-present

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npx tsc --noEmit

  # ──── FRONTEND BUILD ────
  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: cd frontend && npm ci && npm run build

  # ──── TESTS ────
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg16
        env:
          POSTGRES_USER: mes_admin
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: mes_production_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DB_HOST: localhost
      DB_PORT: 5432
      DB_USERNAME: mes_admin
      DB_PASSWORD: test_password
      DB_DATABASE: mes_production_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npm run test --if-present

  # ──── STAGING DEPLOY ────
  deploy-staging:
    needs: [lint, typecheck, frontend-build, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/mes-app
            git pull origin main
            npm ci --production
            npm run build:frontend
            npm run build
            pm2 reload ecosystem.production.config.js --env staging

  # ──── PRODUCTION DEPLOY (Manual Trigger) ────
  deploy-production:
    needs: [deploy-staging]
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/mes-app
            git pull origin main
            npm ci --production
            npm run build:frontend
            npm run build

            # Docker Compose Deployment (optional alternative)
            docker compose -f docker-compose.production.yml up -d --no-deps mes-app
```

---

## 5. Build-Pipeline Übersicht

### Produktion Build

```
┌───────────────────────────────┐
│    Git Push (main/develop)     │
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│  CI: lint + typecheck + test   │  ← GitHub Actions
└──────────────┬────────────────┘
               │ (erfolgreich?)
        ┌──────┴──────┐
        ▼             ▼
┌──────────┐   ┌──────────┐
│ STAGING  │   │   FAIL   │
│ Deploy   │   │  Build   │
│(auto)    │   │  Aborted │
└────┬─────┘   └──────────┘
     │
     ▼
┌───────────────────────────────┐
│  Smoke Tests + Manual QA       │
└──────────────┬────────────────┘
               │ (freigegeben?)
        ┌──────┴──────┐
        ▼             ▼
┌──────────┐   ┌──────────┐
│ PROD     │   │ Revert   │
│ Deploy   │   │ Rollback │
│(manual)  │   │          │
└────┬─────┘   └──────────┘
     │
     ▼
┌───────────────────────────────┐
│  Build Pipeline:                │
│  1. nest build                  │
│  2. cd frontend && vite build   │
│  3. cp frontend dist/* → dist/  │
│  4. pm2 reload / docker compose │
│                                    up -d                    │
└─────────────────────────────────┘
```

### Frontend Build Integration (NestJS)

In der NestJS `main.ts` wird das Frontend eingebettet:

```typescript
// src/main.ts — Production Path-Resolution
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.useStaticFiles(frontendDist, {
  index: false,                // Kein Directory Listing
  serveStatic: {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache Assets 1 Jahr
      }
    }
  }
});
```

### Vite Build Output

```
frontend/dist/
├── index.html          ← NestJS static entrypoint
├── assets/
│   ├── index-abc123.css   ← Hashed, immutable
│   ├── index-def456.js    ← Hashed, immutable
│   └── ...
└── ...
```

**Wichtig:** Vite generiert **hashed filenames**. NestJS served diese automatisch — keine manuelle Kopie nötig.

---

## 6. Environment-Variable-Konvention

| Ebene | Quelle                  | Beispiel-Werte            |
|-------|-------------------------|--------------------------|
| Dev   | `.env.local` (nicht committed) | `DB_HOST=localhost`<br>`MQTT_BROKER_URL=mqtt://localhost:1883` |
| Staging | GH Secrets / Server .env  | `DB_HOST=staging-db.internal`<br>`OPCUA_ENDPOINT_URL=opc.tcp://sim-plc.internal:4840` |
| Prod  | Server .env + Vault     | `DB_HOST=db.prod.internal`<br>`MQTT_BROKER_URL=mqtt://mqtt.prod.internal:1883` |

**Niemals hardcoded!** Alle Secrets via Environment oder Secret Manager.

---

## 7. Monitoring & Health-Checks

### Backend Endpoints

| Endpoint        | Zweck           | Response                  |
|----------------|-----------------|---------------------------|
| `GET /api/edge/health` | Overall system status | `{ "status": "ok", "db": "connected", ... }` |
| `GET /api/data-collection/hypertable-info` | Space usage metrics | Hypertable details (chunks, compression, retention) |
| `GET /api/data-collection/benchmark` | Write throughput test | Inserts/sec metric      |

### Health-Check für Load Balancer

```nginx
# Nginx upstream health check (optional)
upstream mes_backend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    # ... weitere PM2 worker oder Docker Container
}
```

### PM2 Monitoring

```bash
pm2 monit                    # Live-Stats
pm2 flush                    # Log rotate
pm2 save && pm2 startup      # Persist + Autostart
```

---

## 8. File Structure (Production Deploy Target)

```
mes-app/                          ← Repo Root
├── src/                          ← Backend source (TypeScript)
├── frontend/                     ← Frontend source (React TSX)
│   ├── dist/                     ← Built static files (generated by Vite)
│   └── src/                      ← Source code
├── scripts/
│   ├── dev.sh                    ← Dev helper script
│   ├── deploy-staging.sh         ← Staging deployment
│   └── deploy-production.sh      ← Production deployment
├── logs/                         ← PM2 / App Logs (ignored in git)
├── docker-compose*.yml           ← Env-specific compose files
├── ecosystem.production.config.js
├── package.json                  ← Root monorepo scripts
│                                   └── "build": "nest build"
└── .github/
    └── workflows/
        └── ci.yml                ← CI/CD Pipeline
```

---

## Zusammenfassung: Was wir jetzt brauchen

### A. Für Development (sofort)

1. Root `package.json` Scripts für parallel Dev:
   ```json
   {
     "scripts": {
       "dev": "concurrently \"npm run start:dev\" \"cd frontend && vite\"",
       "dev:backend": "nest start --watch",
       "dev:front": "cd frontend && vite"
     }
   }
   ```

### B. Für Production (bereits vorhanden)

1. PM2 ecosystem config ✅ (in deploy.md)
2. Nginx SSL/Proxy Konfiguration ✅
3. Health-Check Endpoints ✅
4. Datenbank Migration und Backup Strategy (noch offen)

### C. Für CI/CD (zu implementieren)

1. `.github/workflows/ci.yml` ✅ (in diesem Dokument definiert)
2. Staging + Production Deployment Scripts (noch offen)
3. Smoke-Test Automation (noch offen)

---

Ende des Konzepts.
