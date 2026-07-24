# Changelog — MES Production Control System

Alle bedeutenden Änderungen an diesem Projekt werden in diesem Dokument dokumentiert.

---

## [Unreleased]

### Added
- **Infrastructure Management**: Development workflow, CI/CD pipeline, production deployment concept
  - GitHub Actions CI/CD with test + staging auto-deploy (production requires manual approval) (`ci.yml`)
  - Docker Compose infrastructure for dev: PostgreSQL/TimescaleDB + MQTT Mosquitto (`docker-compose.infra.yml`)
  - Windows deployment script (deploy.ps1) — 5-step build pipeline
  - Server provisioning guide (`docs/server-config.md`), infrastructure architecture doc (`docs/infrastructure.md`)
- **Dev Server Script**: PowerShell-based dev server starter for Windows (`scripts/dev.ps1`, `scripts/dev.bat`)
- **Mosquitto MQTT Broker Config**: Config file for development MQTT service (`scripts/mosquitto/config/mosquitto.conf`)
- **Docker Dev Script**: Infrastructure lifecycle management wrapper (`scripts/docker/dev.sh`)

### Changed
- **package.json scripts**: `start:dev` now uses direct node path to nest.js binary (fixed Windows npm CLI resolution); `dev:front` uses direct vite path
- **Backend start mechanism**: Replaced `nest` CLI command with `node node_modules/@nestjs/cli/bin/nest.js start --watch` for reliable cross-platform execution

### Fixed
- TypeScript errors across all backend files, frontend components, pages
- Frontend full migration to TypeScript (all 15 JS/JSX → TS/TSX)
- Router auth guard in App.tsx
- Machines CSV menu toggle behavior
- Dashboard layout: stations above carriers, scroll fix
- Global API error handling with Toast notifications

---

## [1.4.0] — Unreleased (Infrastructure + Production Stack)

### Added
- **Phase 3 complete**: Time-Series data architecture with TimescaleDB — hypertable creation, compression policies, retention, continuous aggregates, benchmark endpoint, hypetable info endpoint
- **Phase 4 complete**: Order workflow states (pending → released → in_progress → completed/cancelled), Carrier entity + CRUD API, OPC UA Dispatcher service (xStart/xQryBusy handshake), Material consumption tracking, Error/downtime logging with Pareto stats
- **Phase 5 part 1**: Dashboard page updated with Tailwind CSS styling, OEE trend/pareto/machines endpoints on backend (`/api/dashboard/*`)
- **Backend module additions**: Dashboard service with OEE calc, Trend data, Pareto analysis

### Changed
- **Tech stack updates**: TypeScript compiler 5.7+ → 5.9; Tailwind v4 integration across all frontend pages
- **Machines module**: Split into controller/service modules with proper DTO separation
- **Orders module**: Full workflow state machine, carrier management, material consumption APIs
- **Data-point entity**: Composite indexes for hypertable queries + Timescale extensions

### Removed
- Legacy error suppression in MQTT gateway (real error logging now in place)

---

## [1.3.0] — 2026-07-23 (Phase 2 Complete)

### Added
- **Machines CSV Import**: Bulk import + template download (Task 2.5)
- **Health Check Endpoint**: `/health` with DB component health status
- **Graceful Shutdown**: SIGINT/SIGTERM handlers in app bootstrap (Task 6.4)
- **Security Headers**: Helmet.js integration in main.ts
- **Phase 3 — Time-Series Data Architecture (TimescaleDB)**:
  - Migration von PostgreSQL → TimescaleDB (`timescale/timescaledb:latest-pg16`)
  - Hypertable creation with daily chunks + automatic compression after 7 days
  - Retention policy: automatic raw data deletion after 90 days
  - Continuous Aggregates: hourly rollup (avg/min/max/point_count) + dashboard 5-min aggregate
  - Automatic refresh policies for Continuous Aggregates (1h and 30min intervals)
  - Write throughput benchmark endpoint (`GET /data-collection/benchmark`)
  - Hypertable metadata endpoint (`GET /data-collection/hypertable-info`)

### Changed
- **Docker Compose**: PostgreSQL → TimescaleDB image
- **DataPointEntity**: Added composite indexes for hypertable queries
- **App startup**: Automatic TimescaleDB extension detection + hypertable creation on first boot

---

## [1.0.0] — Vorläufer

### Initial Release
- Basis-MES-Architektur mit NestJS 11 + React 19
- Module: Alarms, Machines, Orders, Traces, DataCollection, Edge Gateway
- PostgreSQL 16 als Datenbank (via Docker Compose)
- OPC UA Client + MQTT Broker Integration
- Responsive Dashboard mit Tailwind CSS
