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

# 2. Frontend bauen & Backend starten
npm run build:frontend   # Vite baut TSX → JS nach frontend/dist/
npm run start            # NestJS Backend + eingebettetes Frontend

# Oder getrennt fuer Entwicklung:
npm run dev:frontend     # Vite Dev-Server (http://localhost:5173)
npm run start:dev        # NestJS Watch-Modus (Backend: http://localhost:3000)
```

## TypeScript

Das gesamte Projekt ist in TypeScript geschrieben:

| Bereich | Sprache | Erweiterung |
|---------|---------|-------------|
| Backend (`src/`) | TypeScript | `.ts`, `.js` (kompiliert) |
| Frontend (`frontend/src/`) | **TypeScript** | **.tsx** (React Komponenten + Hooks) |
| Tests | TypeScript | `.spec.ts` |

Alle Importe in den TSX-Dateien verwenden extensionless paths (Vite resolveiert automatisch).

## Entwicklung

Backend im Watch-Modus:
```bash
npm run start:dev        # NestJS Watch → http://localhost:3000
```

Frontend Dev-Server (unabhaengig vom Backend):
```bash
npm run dev:frontend     # Vite Dev Server → http://localhost:5173
```

## Build & Deployment

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
