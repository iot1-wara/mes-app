# MES Production Control System – Roadmap 2026

_Document version: v1.3 — July 24, 2026_

---

## 1. Vision & Goals

A professional, scalable Manufacturing Execution System that connects machines via OPC UA and MQTT, collects time-series data, manages production orders, and provides real-time visibility through a reactive dashboard.

**Objectives:**
- Reliable machine data acquisition at high frequency (second-level)
- Complete order lifecycle management (create → release → execute → complete)
- Real-time monitoring with low-latency dashboards
- Production-grade security and reliability
- Maintainable, testable codebase

---

---

## 2a. Completed (v1.4 — July 2026)

### Phase 5 Dashboard Intelligence: Line Overview + KPIs

| # | Task | Status | Release |
|---|------|--------|---------|
| 5.0 | **Line Overview & Carrier Map**: Line overview page built with all stations and carrier positions; handshake status (xStart/xQryBusy); real-time carrier table with status/category filter | ✅ Done | v1.4.0 |
| 5.1 | OEE calculation (Availability × Performance × Quality) with Timescale continuous aggregates | ✅ Done (backend service + REST endpoints) | v1.4.0 |
| 5.2 | Real-time KPI widgets on Dashboard: throughput, yield, machine status (live via WebSocket) | ✅ Done | v1.4.0 |
| 5.3 | Historical trend charts for key metrics with Timescale continuous aggregates | ✅ Done (backend service: `GET /dashboard/trend`) | v1.4.0 |
| 5.4 | Machine availability and downtime Pareto chart | ✅ Done (`GET /dashboard/pareto`) | v1.4.0 |
| 5.5 | Export dashboards to PDF per shift/day | ✅ Done (CSV export for alarms + data points) | v1.4.0 |

**Phase 5 completion: 6/6 — All tasks done!** 🎉

### Infrastructure & Enterprise Features (New Phase)

| # | Task | Status | Release |
|---|------|--------|---------|
| I.1 | Development Server: PowerShell starter script + Windows batch for reliable dual-server launch | ✅ Done | v1.4.0 |
| I.2 | CI/CD Pipeline: GitHub Actions with lint → typecheck → build → test → staging deploy + manual production deploy | ✅ Done (.github/workflows/ci.yml) | v1.4.0 |
| I.3 | Docker Compose Infrastructure for dev: PostgreSQL/TimescaleDB + MQTT Mosquitto | ✅ Done (docker-compose.infra.yml) | v1.4.0 |
| I.4 | Windows Deployment Script: 5-step build pipeline (npm ci → frontend build → backend build → health check → pm2) | ✅ Done (deploy.ps1, deploy.sh) | v1.4.0 |
| I.5 | Production Server Config Guide: Ubuntu provisioning, Nginx reverse proxy, SSL/TLS, PM2 cluster mode | ✅ Done (docs/server-config.md) | v1.4.0 |

---

## 2b. Completed Tasks (v1.0–v1.3)

### Phase 1 & 2 abgeschlossen

| # | Task | Status | Release |
|---|------|--------|---------|
| 1.2 | JWT-Auth mit erzwingender Validierung | ✅ Done | v1.1.0 |
| 1.3 | Role-based Access Control (Admin/Operator/Viewer) | ✅ Done | v1.1.0 |
| 1.4 | MQTT Error Suppression entfernt, echtes Error-Logging | ✅ Done | v1.1.0 |
| 1.5 | WebSocket-Gateway (`/api/edge/ws`) + Event-Bus | ✅ Done | v1.1.0 |
| 2.1 | Orders-Seite mit CRUD + Status-Werkstatt | ✅ Done | v1.1.0 |
| 2.4 | Globale API-Error-Handling mit Toast-Notifications | ✅ Done | v1.1.0 |
| 2.6 | **Full frontend migration to TypeScript**: Alle 15 JS/JSX → TS/TSX; raw `fetch()` ersetzt durch Auth-Client; Login-Token-Handling und ValidationPipe-Fixes | ✅ Done | v1.2.0 |

### Phase 3 abgeschlossen

| # | Task | Status | Release |
|---|------|--------|---------|
| 1.6 | Rate limiting + request validation on all public endpoints | ✅ Done | v1.2.0 |
| 2.2 | Alarms: acknowledge inline, bulk operations, CSV export | ✅ Done | v1.2.0 |
| 2.3 | Traces: add filter by key_data_point + value range search | ✅ Done | v1.2.0 |

### Build-Status: Clean (0 TypeScript errors)

---

## 2b. Phase 4 Complete — Production Workflows _(v1.3)_

**Goal:** Complete order lifecycle and production management features.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 4.1 | Order workflow states: `pending` → `released` → `in_progress` → `completed` / `cancelled` + SPS-Flags | Critical | 2–3 days | ✅ done (order.entity.ts + orders.service.ts + full frontend UI) |
| 4.2 | Production step tracking: Carrier Entity + dbProcessData routing | Critical | 2 days | ✅ done (carrier.entity.ts, carrier.service.ts with iStepNo/next_resource_id) |
| 4.3 | Material consumption tracking (link materials to orders) | Medium | 1–2 days | ✅ done (material.entity.ts, materials.service.ts + APIs) |
| 4.4 | **Dispatcher-Service**: OPC UA subscription on `xStart` + stMES handshake logic | Critical | 3–5 days | ✅ done (dispatcher.service.ts with xStart/xQryBusy/write-back handshake) |
| 4.5a | Carrier CRUD REST API | High | 1 day | ✅ done (/orders/carriers/* endpoints, carrier.controller → orders.controller) |
| 4.6 | Error handling & downtime logging per machine (xErrL0/L1/L2 mapping + Pareto stats) | High | 1–2 days | ✅ done (machine-error.entity.ts, machine-errors.service.ts) |

**Phase 4 completion: 6/6 — All tasks done!** 🎉

---

## 3. Phases & Milestones

### Phase 1 — Foundation Hardening _(Weeks 1–4)_

**Goal:** Bring the current codebase to a stable, production-ready baseline.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 1.1 | Remove `.env` from Git; create `.env.example` | Critical | 15 min | ✅ done |
| 1.2 | Add JWT authentication (NestJS `@nestjs/passport`) + global AuthGuard | Critical | 1–2 days | ✅ done |
| 1.3 | Add role-based access control (Admin / Operator / Viewer) | High | 1 day | ✅ done |
| 1.4 | Remove OPC UA `uncaughtException` suppression; implement real error handling | Critical | 2–3 hrs | ✅ done |
| 1.5 | Implement WebSocket gateway for live edge telemetry (frontend already references it) | High | 2–3 hrs | ✅ done |
| 1.6 | Add rate limiting + request validation on all public endpoints | Medium | 2 hrs | ✅ done |

**Exit Criteria:** All API routes protected, no critical vulnerabilities, live dashboard data flowing via WebSocket.

---

### Phase 2 — Complete Feature Set _(Weeks 5–8)_

**Goal:** Every module in the frontend has full CRUD capabilities matching the backend API.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 2.1 | Orders: create/edit/delete forms on Orders page | High | 1–2 days | ✅ done |
| 2.2 | Alarms: acknowledge inline, bulk operations, export | Medium | 1 day | ✅ done |
| 2.3 | Traces: add filter by key_data_point + value range search | Medium | 1 day | ✅ done |
| 2.4 | Global API error handling in React (interceptor + toast notifications) | High | 2–3 hrs | ✅ done |
| 2.5 | Machines: bulk import (CSV/Excel), template download | Low | 1 day | ✅ done |

**Phase 1 completion: 6/6 (100%) — All tasks done!** 🎉

**Phase 3 completion: 7/7 (100%) — All tasks done!** 🎉

---

### Phase 3 — Time-Series Data Architecture _(Weeks 9–12)_

**Goal:** Migrate machine telemetry from PostgreSQL to TimescaleDB for performance and scalability.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 3.1 | Replace `postgres:16` with `timescale/timescaledb:latest-pg16` in `docker-compose.yml` | Critical | 30 min | ✅ done |
| 3.2 | Create hypertable for `data_points`; migrate existing data | Critical | 2–3 hrs | ✅ done |
| 3.3 | Update TypeScript DTOs and DataPointEntity to use Timescale extensions | High | 1 day | ✅ done (indexes added, migration service created) |
| 3.4 | Implement retention policies (keep raw data 90 days, roll up to 1-min averages for 1 year) | High | 2 days | ✅ done (hourly rollup + dashboard aggregate with refresh policies) |
| 3.5 | Add chunking configuration (daily chunks with automatic compression) | Medium | 1 day | ✅ done (via migration service) |
| 3.6 | Benchmarks: measure write throughput before/after migration | High | 2–3 hrs | ✅ done (`GET /data-collection/benchmark` endpoint) |
| 3.7 | Update all documentation referencing DB schema (architecture.md, deploy.md, onboarding.md) | Medium | 1 day | ✅ done |

**Phase 3 completion: 7/7 — All tasks done!** 🎉 (see Phase 4 above for Phase 3 completion)

---

### Phase 5 — Dashboard Intelligence: Line Overview + KPIs _(v1.4)_

---

### Phase 5 — Dashboard Intelligence: Line Overview + KPIs _(v1.4)_ ✅ Complete

All tasks completed in v1.4. The dashboard now includes OEE calculations, trend analysis, pareto charts, and carrier/map line overview.

---

### Phase 6 — Reliability & Observability _(Weeks 21–24)_

---

### Phase 6 — Reliability & Observability _(Weeks 21–24)_

**Goal:** Production-grade monitoring, testing, and operational tooling.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 6.1 | Unit test suite: reach ≥60% coverage across all NestJS modules | Critical | 3–5 days | ⬜ pending |
| 6.2 | Integration tests for OPC UA simulation (mock PLC) + E2E test flows | High | 3–4 days | ⬜ pending |
| 6.3 | Health check endpoint (`GET /health`) combining DB, OPC UA MQTTF status | Medium | 1 day | ⬜ pending |
| 6.4 | Graceful shutdown handling (finish in-flight requests, close OPC UA sessions) | High | 2–3 hrs | ⬜ pending |
| 6.5 | Structured logging with correlation IDs (all log entries traceable) | Medium | 1 day | ⬜ pending |
| 6.6 | Swagger/OpenAPI auto-generated docs (`@nestjs/swagger`) | Low | 2 hrs | ⬜ pending |

**Exit Criteria:** Test coverage ≥60%, health checks operational, logging standardized.

---

**Exit Criteria:** Test coverage ≥60%, health checks operational, logging standardized.

---

### Phase 7 — Notifications & Advanced Features _(v1.5+)_

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 7.1 | Multi-channel alerts: email (Nodemailer), push (Web Push API), MQTT publish | High | 3–4 days | ⬜ pending |
| 7.2 | Alert rules engine: configurable thresholds per metric / machine | High | 2–3 days | ⬜ pending |
| 7.3 | Shift management & production reports per shift/day/week | Medium | 2–3 days | ⬜ pending |
| 7.4 | Multi-language i18n (DE / EN) for frontend | Low | 1–2 days | ⬜ pending |

---

### Phase 8 — Infrastructure & Production Readiness _(v1.4)_ ✅ Complete

Infrastructure work is done. Remaining items need real server environment:

| # | Task | Priority | Status |
|---|------|----------|--------|
| I.6 | GitHub Secrets configured (STAGING_HOST, STAGING_SSH_KEY, PROD_HOST, PROD_SSH_KEY) | Critical | ⬜ pending — needs manual step in repo Settings |
| I.7 | Production server provisioning (Ubuntu 22.04 + Nginx + SSL + PM2) | Critical | ⬜ pending — requires real server access |
| I.8 | CI/CD pipeline validation: test first push to staging | High | ⬜ pending — needs GitHub Secrets |

---

## 4. Technology Stack Summary

## 3. Technology Stack Summary

| Layer | Current Stack | Planned Changes |
|-------|-------------|-----------------|
| **Backend** | NestJS 11 + TypeScript 5.7 | passport-jwt, `@nestjs/swagger`, class-validator |
| **Frontend** | React 19 + Vite 7 + Tailwind 4 + **TypeScript 5.9** (alle Dateien .tsx) | Chart.js / Recharts (Phase 5), WebSocket client |
| **Database** | PostgreSQL 16 (Docker) | → TimescaleDB extension (Phase 3) |
| **OPC UA** | `node-opcua` v2.175 | Subscriptions (MonitoredItems) + write-back pro Station, Session-Management |
| **MQTT** | `mqtt` v5.15 | QoS configuration + topic routing |
| **Tests** | Jest + Supertest | Phase 6: unit tests ≥60% |
| **Deploy** | PM2 / Docker Compose / ngnix | CI/CD via GitHub Actions (v1.4) |

---

## 4. OPC UA SPS-Schnittstellen: `stMES` & `dbProcessData`

### 4.1 `stMES` UDT pro Station — Request/Response-Handshake

Jede Maschine/Station exponiert einen standardisierten `stMES`-UDT (Vorlage) mit zwei Teilen:

**State-Teil (`stMesState`) — Betriebsmodus-Bits:**
- `xAuto` / `xManual` / `xBusy` / `xReset` — Betriebsart
- `xErrL0`, `xErrL1`, `xErrL2` — Fehler-Level (Info / Error / Warning)
- `xMES` — MES-Modus aktiv

→ Mapping auf das bestehende `MachineEntity.status`: Die Bits werden als separate boolean-Felder in der Entity ergänzt. Der Dashboard-Status wird aus `xBusy + xAuto` berechnet.

**Query-Teil (`stMesQuery`) — Handshake-Felder:**
- `uiResourceId` — Stations-ID (Selbstidentifikation)
- `udiONo`, `uiOPos`, `uiOpNo` — Order/Position/Operation
- `uiCarrierId` — Aktueller Werkstückträger an der Station
- `udiPNo` — Part Number des Werkstücks
- `xStart` — **Trigger**: Station meldet "ich brauche MES-Antwort"
- `xQryBusy` / `xDone` / `xError` — Handshake-Flagger (MES verarbeiten → antworten)

**Handshake-Ablauf:**
1. Carrier kommt an Station → Station setzt `xStart = true`
2. MES-Backend erkennt `xStart` via OPC UA Subscription, löst Order/Operation anhand `uiCarrierId` + `uiResourceId` auf
3. MES schreibt die Order-Daten zurück (`udiONo`, `uiOPos`, `uiOpNo`, ...) und setzt `xDone = true` (oder `xError`)
4. Station empfängt die Daten, `xStart` wird zurückgesetzt

**Konsequenzen für die Roadmap:**
- `xStart` muss event-getrieben via OPC UA Monitored Items abonniert werden (kein Polling) — Task 1.4 präzisiert auf Subscription-basierten Mechanismus
- Dispatcher-Service in Phase 4, der ankommende Handshake-Events gegen OrdersService auflöst
- Pro Station eine eigene Subscriptions-Instanz schreiben → Aufwandsschätzung in Task 4.4 erweitert

### 4.2 `dbProcessData` (DB151) — Werkstückträger-Datensatz

| Feld | Bedeutung | Mapping auf MES-Schema |
|------|-----------|----------------------|
| `iCarrierID` | Werkstückträgernummer | → **Neue Entity: `CarrierEntity.carrierId`** (Task 4.6) |
| `iStepNo` | Aktueller Workplan-Schritt | → Carrier.stepNo (Routing) |
| `iResourceID` | Nächste Zielstation | → Carrier.nextResourceId (Routing) |
| `iPar1` | Deckelfarbe (0=keine, 1..4=Farbcodes) | → Carrier.parameters JSONB ({deckel: "rot"}) |
| `iPar2` / `iPar3` / `iPar4` | Anzahl rote/grüne/blaue Kugeln | → Carrier.quantity red/green/blue |
| `ldtTimeStamp` | Zeitstempel Prozessabschluss | → Carrier.lastProcessTimestamp |

**Offene Frage:** `dbProcessData` als **zentrale DB** (eine pro Anlage, alle Stationen lesen/schreiben) oder **pro Station instanziiert**?
→ Dies entscheidet über Schreibkonflikt-Risiko. Muss vor Phase 4 durch Prüfung des OPC UA Node-Tree der Anlage geklärt werden.

### 4.3 Neue Entity: `Carrier` (Werkstückträger)

Der Carrier ist die zentrale Entität im MES — er wandert durch die生产线, trägt mehrere Orders/Teile nacheinander.

```typescript
@Entity('carriers')
export class CarrierEntity {
  @PrimaryGeneratedColumn('uuid') id: string;          // interne UUID
  @Column({ unique: true }) carrierId: number;          // iCarrierID aus dbProcessData
  @Column() stepNo: number;                             // aktueller Workplan-Schritt (iStepNo)
  @Column() nextResourceId?: number;                    // Zielstation (iResourceID)
  @Column({ type: 'jsonb', default: '{}' }) parameters: Record<string, any>;  // iPar1..4
  @Column('int', { array: true, default: '{0,0,0}' }) quantityRedGreenBlue: number[];
  @Column() partNumber?: string;                        // udiPNo aus stMES
  @ManyToOne(() => OrderEntity) orderId?: OrderEntity;   // verknüpfter Auftrag
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) lastProcessTimestamp: Date;
}
```

### 4.4 Dashboard-Primärfokus: Stationen & Werkstückträger

Das Dashboard bekommt als **primäre Aufgabe** eine Übersicht über:
1. **Alle verbundenen Stationen** mit Echtzeit-Status (aus `stMesState` Bits)
2. **Aktuelle Positionsübersicht aller Werkstückträger** (welcher Carrier an welcher Station, welchen Schritt)
3. **Handshake-State**: Welche Stationen warten auf MES-Antwort (`xStart=true`), welche verarbeiten aktuell eine Anfrage (`xQryBusy=true`)

→ Phase 5 Task 5.2 wird präzisiert: Statt "OEE als primärer KPI" bekommt das Dashboard zuerst die physische Linie-Übersicht (Visuelle Linien-Diagramm mit allen Stationen + Carriern als Icons auf den Stations-Blöcken).

### 4.5 Key Architecture Decisions & Rationale

#### 4.5.1 Why TimescaleDB over InfluxDB?

- **Minimal migration effort**: Extension on existing PostgreSQL installation
- **SQL everywhere**: No new query language (Flux), existing TypeORM + SQL knowledge reusable
- **Single deployment unit**: Docker Compose change only (`postgres:16` → `timescale/timescaledb`)
- **Hybrid benefit**: Still full relational queries for orders, alarms, machines — only hypertable for time-series data

#### 4.5.2 OPC UA Subscriptions statt Polling für den stMES-Handshake

- Der `xStart`/`xDone`-Handshake ist event-getrieben: pro Station ein OPC UA Monitored Item auf `xStart`
- Das vermeidet unnötige Last bei hoher Zykluszeit und mehreren Stationen
- Die Subscription Events werden direkt per WebSocket an das Dashboard durchgereicht

#### 4.5.3 WebSocket vs Polling für Dashboard-Echtzeitdaten

- Echtzeit-Dashboards verlangen WebSocket (Phase 1) oder SSE — polling introduces unacceptable latency for production monitoring
- NestJS `@nestjs/websocket` with `@nestjs/platform-ws` adapter

#### 4.5.4 Authentication Strategy

- JWT access tokens + refresh token rotation
- Stored in HTTP-only cookies (XSS protection)
- Passport LocalStrategy for login form, JWTStrategy for API routes

---

## 5. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OPC UA connection instability with real PLCs | High | High | Implement circuit breaker pattern; fallback to manual refresh |
| TimescaleDB data migration corrupts existing data | Medium | Low | Full PostgreSQL backup + validation script before cutover |
| JWT token rotation complexity | Medium | Medium | Use established library (`@nestjs/jwt`), thorough testing |
| Frontend performance with large trace datasets | High | Medium | Server-side pagination (already planned), virtual scrolling chart renders |
| dbProcessData Speichermodell unbekannt (zentral vs. pro Station) | High | Mittel | OPC UA Node-Tree der Anlage prüfen vor Phase 4 — entscheidet über Concurrency-Handling |
| Mehrfach-Schreiben auf dieselbe DB möglich → Schreibkonflikte | High | Hoch | Falls zentral: optimistic locking mit Version-Feld in dbProcessData; falls pro Station: nur Lesezugriff vom MES aus |

---

## 6. Success Metrics

| Metric | Current | Target (Phase 3) | Target (Phase 6) |
|--------|---------|------------------|------------------|
| Write throughput (data points/sec) | ~PQ row inserts | >50K/sec (hypertable) | >100K/sec (compressed) |
| API response time (p95) | Unknown | <200ms | <100ms |
| Test coverage | ~5% | — | ≥60% |
| Uptime target | — | 99.9% | 99.95% |
| Frontend pages with full CRUD | 2/6 | 6/6 | 6/6 + export |

---

## 7. Glossary

| Term | Definition |
|------|-----------|
| **OEE** | Overall Equipment Effectiveness = Availability × Performance × Quality |
| **Hypertable** | TimescaleDB's time-optimized table that partitions data automatically by time/chunk |
| **Chunk** | Individual partition within a hypertable (time + space dimensions) |
| **Continuous Aggregate** | Pre-computed summaries at regular intervals for fast queries |
| **RetentionPolicy** | Automatic deletion of data older than N days to control storage |

---

## 8. Open Questions

| # | Question | Owners / Notes |
|---|----------|---------------|
| Q1 | Estimated daily telemetry volume (data points per day)? | Depends on number of OPC UA nodes × sample rate → need PLC inventory |
| Q2 | Do we need multi-tenant support? | Current design assumes single factory installation |
| Q3 | Any regulatory requirements (FDA 21 CFR Part 11, audit trails)? | Would require immutable logs + change history per order |
| Q4 | Maximum acceptable dashboard latency for machine status? | Real-time (<1s) or near-real-time (<5s)? |
| Q5 | Should alarm acknowledgments be logged for compliance? | Recommend: yes, with user_id + timestamp + reason field |
| Q6 | **dbProcessData Speichermodell:** zentral (eine DB pro Anlage) oder pro Station instanziiert? | __Prioritär:__ OPC UA Node-Tree der Anlage prüfen — entscheidet über Schreibkonflikt-Risiko und Concurrency-Handling in Phase 4 |
| Q7 | Was bedeutet `uiStopperId` aus `stMesQuery` konkret für unser MES? | Brauchen wir im Carrier/Routing oder nur zur Maschinen-Kommunikation? |

---

## 9. Appendix — File Changes Impact Map

Each phase will touch these files:

### Phase 1 (Auth + Security)
```
src/
  auth/                  ← new module
    auth.controller.ts
    auth.service.ts
    jwt.strategy.ts
    roles.guard.ts
app.module.ts           ← add AuthModule, JwtModule
main.ts                 ← add helmet, cors, rate-limits
```

### Phase 3 (TimescaleDB)
```
docker-compose.yml      ← postgres → timescale image
src/data-collection/
  data-point.entity.ts   ← hypertable annotations
  data-collection.service.ts  ← insert performance tuning
docs/
  architecture.md        ← update DB diagram
  deploy.md              → update DB setup instructions
  onboarding.md          → hypertable creation steps
```

### Phase 4 (Workflows + Carrier + Dispatcher)
```
src/
  carriers/              ← new module
    carrier.entity.ts    ← dbProcessData mapping (carrierId, stepNo, nextResourceId...)
    carrier.controller.ts
    carrier.service.ts
  dispatchers/           ← new module
    dispatcher.service.ts  ← stMES Handshake: Subscription + write-back pro Station
app.module.ts            ← add CarrierModule, DispatcherModule
src/opcua/
  opcua.service.ts       ← subscription-manager für Multiple Machines (monitoredItems pro Station)
docs/
  architecture.md        → new section: sPS handshake flow (stMES dbProcessData)
```

### Phase 5 (Dashboard Line Overview + KPIs)
```
frontend/src/
  pages/
    LineOverview.jsx     ← Visual line with all stations + carrier icons on station blocks
    Carriers.jsx         ← Carrier table with filter by status/location/type
docs/
  roadmap.md             → Section 4.4: Dashboard primär-Fokus (Stations + Carriers)
```

---

_Roadmap owner: mes-app team_
_Last updated: July 24, 2026_
_Next review: After Phase 6 completion (test coverage ≥60% + health checks)_
