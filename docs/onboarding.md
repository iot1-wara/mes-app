# Entwickler-Onboarding

## Voraussetzungen

| Tool | Version | Download |
|------|---------|----------|
| Docker Desktop | latest | docker.com |
| Node.js | 20+ | nodejs.org |
| pm2 (optional) | latest | `npm install -g pm2` |

## Schnellstart (5 Minuten)

```bash
# 1. Datenbank hochfahren
docker-compose up -d postgres

# Warten bis DB bereit ist (ca. 10s)

# 2. Backend bauen & starten
cd frontend
node node_modules/vite/bin/vite.js build --outDir dist
cp public/* ../frontend/dist/
cd ..
node node_modules/@nestjs/cli/bin/nest.js build
npx pm2 start dist/main.js --name mes-gateway

# 3. Öffnen
http://localhost:3000
```

## Entwickeln

### Backend im Watch-Modus
```bash
# TypeScript-Kompilierung + Server neu starten bei Code-Changes
node node_modules/@nestjs/cli/bin/nest.js start --watch
```

### Frontend Dev-Server
```bash
cd frontend
node node_modules/vite/bin/vite dev
```

## Build-Prozess

```bash
# 1. Frontend bauen
cd frontend
node node_modules/vite/bin/vite build --outDir dist
cp public/* ../frontend/dist/

# 2. Backend bauen
nest build   # oder: node node_modules/@nestjs/cli/bin/nest.js build

# 3. Starten
npx pm2 start dist/main.js --name mes-gateway
```

## Troubleshooting

### Datenbank-Verbindung fehlschlägt
```bash
docker ps | grep mes_db    # Läuft der Container?
docker logs mes_db         # Fehler im Postgres-Log?
```

### Port-Konflikt
Port 3000 belegt? → `process.env.PORT` setzen oder Port freigeben.

### pm2 Logs anzeigen
```bash
npx pm2 logs mes-gateway
npx pm2 monit           # Live-Monitoring
```

## Code-Struktur

```
mes-app/
├── src/                    # Backend (NestJS)
│   ├── alarms/             # Alarme-Modul
│   ├── machines/           # Maschinen-Modul
│   ├── orders/             # Aufträge-Modul
│   ├── traces/             # Trace-Daten-Modul
│   ├── data-collection/    # Zeitreihendaten
│   ├── opcua/              # OPC UA + MQTT Gateway
│   └── main.ts             # Entry Point
├── frontend/               # React Frontend (Vite)
│   ├── src/pages/          # Seiten
│   ├── src/components/     # UI-Komponenten
│   └── public/             # Statische Dateien (Logo etc.)
├── dist/                   # Kompilierter Code
├── docs/                   # diese Docs
└── docker-compose.yml      # PostgreSQL-Service
```
