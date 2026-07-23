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

## [1.1.0] — 2026-07-23

### Added
- **Orders-Module**: Vollständige CRUD-Verwaltung für Produktionsauftraege (create/edit/delete/status transitions)
- **Frontend Login/Register-Screen**: Auth-gesteuerter Zugang mit JWT-Persistenz in localStorage
- **WebSocket-Gateway** (`/api/edge/ws`): Echtzeit-Datenuebertragung via Socket.IO mit Heartbeat und Event-Bus
- **Toast-Notification-System**: Auto-Responses bei HTTP-Fehlern, Auth-Ablauf-Warning, Bulk-Erfolgsmeldungen
- **Alarms Bulk Operations**: Checkbox-Multi-Select + Bulk-Acknowledge auf Alarmsite
- **Traces Multi-Filter**: Kombinierte Filterung nach Kategorie UND Maschine

### Changed
- **Full frontend migration to TypeScript**: All 15 JS/JSX files converted to TS/TSX (Vite resolved import extensions automatically)
- **Frontend API layer**: Replaced all raw `fetch()` calls across every page with authenticated client methods from `client.ts` — now using `api.get/del/patch/post`. All pages share a single auth pattern. Token handling fixed (no more 401 errors after login).
- **Login/Register validation**: Added @IsNotEmpty() decorators to DTO fields so ValidationPipe stops stripping them silently. Switched from array body (frontend) to valid object body. Backend login flow now works as expected.
- **AuthService**: Replaced setJwtService setter injection with direct constructor-injected jwtService. Prevents runtime errors where jwtService was undefined at login time.
- **Users manually inserted**: bootstrap_admin_user and bootstrap_operator_user as real PostgreSQL users with bcrypt hashed passwords. Bootstrap logic is now only for initial setup.

### Fixed
- TypeScript-Build-Fehler in `data-collection.service.ts` (parameter naming: messageId → machineId)
- AuthService Dependency Injection Error (missing ConfigService import in AuthModule)
- MQTT client null checks bei disconnected state (TypeScript strict mode compliant)

---

## [1.0.0] — Vorläufer

### Initial Release
- Basis-MES-Architektur mit NestJS 11 + React 19
- Module: Alarms, Machines, Orders, Traces, DataCollection, Edge Gateway
- PostgreSQL 16 als Datenbank (via Docker Compose)
- OPC UA Client + MQTT Broker Integration
- Responsive Dashboard mit Tailwind CSS
