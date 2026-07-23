# Changelog — MES Production Control System

Alle bedeutenden Änderungen an diesem Projekt werden in diesem Dokument dokumentiert.

---

## [Unreleased]

### Added
- **Rate Limiting**: Global 100 req/min per IP via `@nestjs/throttler` (Task 1.6)
- **Alarms CSV Export**: Backend endpoint + Frontend export button for downloading alarm data as CSV
- **Alarms Bulk Endpoint**: `/alarms/bulk-acknowledge` REST endpoint for efficient batch acknowledgment
- **Traces Advanced Filter**: Query params `key_data_point`, `value_min`, `value_max` with ILIKE partial match (Task 2.3)
- **Traces Table Columns**: New columns for key_data_point and value display

### Fixed
- TS type errors: `el.dataset.id` needs string, Orders quantity/priority need Number() coercion
- Edge.tsx card rendering: fixed numeric value computations typed as strings

## [1.3.0] — 2026-07-23 (Phase 2 + Phase 3 Complete)

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
