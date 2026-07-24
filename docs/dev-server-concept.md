# DEV Server Konzept — MES Production Control System

## Problemstellung

Aktueller Workflow ist fehleranfällig und inkonsistent:

1. Backend (`npm run start:dev`) auf Port 3000
2. Frontend-Vite auf Port 5173 mit Proxy zu `/api` → `localhost:3000`
3. Beide müssen manuell gestartet werden
4. Prozesse sterben ab (kein Watchdog, kein Persistent)
5. Kein automatisches Rebuild bei Code-Änderungen

---

## Empfohlene Architektur

### Option A: Frontend dev server mit Proxy (Empfohlen für Entwicklung)

```
         ┌─────────────────────┐
         │   Vite Dev Server   │
         │   localhost:5173     │
         │   (React + hot-reload)│
         │                      │
         │   / → frontend src   │
         │   /api → proxy →     │
         │                3000    │
         └──────────────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │   NestJS Backend    │
               │   localhost:3000     │
               │   (watch mode)       │
               │                      │
               │   /api/* — REST API  │
               │   /edge/ws — WebSocket│
               └──────────────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │   PostgreSQL        │
               │   localhost:5432     │
               │   (TimescaleDB)      │
               └──────────────────────┘
```

**Vorteile:**
- Echte HMR (Hot Module Replacement) im Frontend
- Autogeneriertes CSS bei Tailwind-Änderungen
- Realistische API-Proxys in Vite (`/api` → `:3000`)
- Separates Monitoring pro Port

---

### Option B: NestJS serves built frontend (Production / Kompromiss)

```
               ┌─────────────────────┐
               │   NestJS Backend    │
               │   localhost:3000     │
               │                      │
               │   /api/* — REST API  │
               │   /*   — static files│
               │       (from dist/)   │
               └──────────────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │   PostgreSQL        │
               │   localhost:5432     │
               └──────────────────────┘
```

**Nachteile für Dev:**
- Kein HMR im Frontend → manuelles Refresh nach jedem Build
- Expliziter `npm run build:frontend` nötig
- langsamerer Dev-Workflow

---

## Recommended Dev Commands

### Root `package.json` — neue Scripts hinzufügen

```json
{
  "scripts": {
    "dev:full": "concurrently \"npm run start:dev\" \"npm run dev:front\"",
    "dev:front": "cd frontend && npm run dev",
    "dev:backend": "npm run start:dev",
    "build:all": "npm run build:frontend && npm run build"
  }
}
```

**Abhängigkeit:** `concurrently` (`npm i -D concurrently`)

### usage

```bash
# Terminal-frei — alles in einem Befehl
npm run dev:full

# Oder einzeln (wenn man separat debuggen muss)
npm run dev:backend   # Port 3000
cd frontend && npm run dev   # Port 5173
```

---

## Port-Richtlinie

| Service       | Port  | URL                  | Proxy          |
|---------------|-------|----------------------|----------------|
| Frontend/Vite | 5173  | http://localhost:5173| Nein           |
| Backend/API   | 3000  | http://localhost:3000| —              |
| DB/Postgres   | 5432  | localhost:5432       | Docker only    |
| OPC UA        | 4840  | opc.tcp://localhost  | —              |
| MQTT          | 1883  | mqtt://localhost     | Optional       |

---

## Monitoring & Watchdog

### PowerShell Dev-Script (`scripts/dev.ps1`)

```powershell
# dev.ps1 — Startet Backend + Frontend als persistente Processes
Write-Host "Starting MES Development Server..." -ForegroundColor Green

$backendPort = 3000
$frontendPort = 5173

# Check and kill existing processes on our ports
function Kill-ProcessOnPort {
    param($port)
    $procs = netstat -ano | findstr ":$port" | ForEach-Object { $_.trim().split(' ')[2] } | Select-Object -Unique | Where-Object { $_ -match '^\d+$' -and $_ -ne 0 }
    foreach ($pid in $procs) {
        Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
    }
}

Kill-ProcessOnPort $backendPort
Kill-ProcessOnPort $frontendPort

Start-Sleep -Seconds 1

# Backend
$backendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run start:dev" -PassThru -WindowStyle Normal
Write-Host "Backend running as PID $($backendProc.Id)" -ForegroundColor Gray

# Frontend (after 2s to avoid port conflict)
Start-Sleep -Seconds 2
$frontendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/frontend'; npm run dev" -PassThru -WindowStyle Normal
Write-Host "Frontend running as PID $($frontendProc.Id)" -ForegroundColor Gray

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "MES Dev Server is running" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:$frontendPort" -ForegroundColor White
Write-Host "  Backend:  http://localhost:$backendPort" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
```

usage: `pwsh ./scripts/dev.ps1`

---

## Docker Compose Erweiterung (wünschenswert)

```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    container_name: mes_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: mes_admin
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: mes_production
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  # Optional: MQTT broker for dev
  mqtt:
    image: eclipse-mosquitto:2
    container_name: mes_mqtt
    restart: unless-stopped
    ports: ["1883:1883"]
    volumes: ["./mosquitto/config:/ mosquitto/config"]

volumes:
  postgres_data:
```

usage: `docker compose -f docker-compose.dev.yml up -d`

---

## Workflow-Empfehlung

### Tägliche Dev-Session

1. Docker-Dienste starten (wenn nicht vorhanden)
   ```bash
   docker compose -f docker-compose.dev.yml up -d postgres mqtt 2>&1 | Out-Null
   ```

2. Alles mit einem Befehl
   ```bash
   npm run dev:full
   ```

3. Browser auf `http://localhost:5173` öffnen
   - `/api/*` Requests gehen automatisch zum Backend (Vite proxy)
   - Hot Reload funktioniert sofort im Frontend

### Stop-Command

```bash
# Alles killen
netstat -ano | findstr ":3000\|:5173" | ForEach-Object { $_.trim().split(' ')[2] } | 
  Select-Object -Unique | Where-Object { $_ -match '^\d+$' -and $_ -ne 0 } |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
```

---

## Zusammenfassung: WAS wir jetzt machen

### Schritt 1 — `scripts/dev.ps1` erstellen
Startet Backend + Frontend in einem Rutsch als persistente Prozesse auf Port 3000 und 5173.

### Schritt 2 — Root `package.json` erweitern
Neue Scripts: `dev:full`, `dev:front`, `dev:backend` mit `concurrently`.

### Schritt 3 — Docker Compose dev.yml erstellen
PostgreSQL + MQTT als Dev-Dienste in einem separaten compose file.
