# MES Production Control System – Roadmap 2026

_Document version: v1.0 — July 2026_

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

## 2. Phases & Milestones

### Phase 1 — Foundation Hardening _(Weeks 1–4)_

**Goal:** Bring the current codebase to a stable, production-ready baseline.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 1.1 | Remove `.env` from Git; create `.env.example` | Critical | 15 min | ⬜ pending |
| 1.2 | Add JWT authentication (NestJS `@nestjs/passport`) + global AuthGuard | Critical | 1–2 days | ⬜ pending |
| 1.3 | Add role-based access control (Admin / Operator / Viewer) | High | 1 day | ⬜ pending |
| 1.4 | Remove OPC UA `uncaughtException` suppression; implement real error handling | Critical | 2–3 hrs | ⬜ pending |
| 1.5 | Implement WebSocket gateway for live edge telemetry (frontend already references it) | High | 2–3 hrs | ⬜ pending |
| 1.6 | Add rate limiting + request validation on all public endpoints | Medium | 2 hrs | ⬜ pending |

**Exit Criteria:** All API routes protected, no critical vulnerabilities, live dashboard data flowing via WebSocket.

---

### Phase 2 — Complete Feature Set _(Weeks 5–8)_

**Goal:** Every module in the frontend has full CRUD capabilities matching the backend API.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 2.1 | Orders: create/edit/delete forms on Orders page | High | 1–2 days | ⬜ pending |
| 2.2 | Alarms: acknowledge inline, bulk operations, export | Medium | 1 day | ⬜ pending |
| 2.3 | Traces: add filter by key_data_point + value range search | Medium | 1 day | ⬜ pending |
| 2.4 | Global API error handling in React (interceptor + toast notifications) | High | 2–3 hrs | ⬜ pending |
| 2.5 | Machines: add bulk import (CSV/Excel), template download | Low | 1 day | ⬜ pending |

**Exit Criteria:** All backend REST endpoints have corresponding frontend forms; no orphan API calls with no UI.

---

### Phase 3 — Time-Series Data Architecture _(Weeks 9–12)_

**Goal:** Migrate machine telemetry from PostgreSQL to TimescaleDB for performance and scalability.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 3.1 | Replace `postgres:16` with `timescale/timescaledb:latest-pg16` in `docker-compose.yml` | Critical | 30 min | ⬜ pending |
| 3.2 | Create hypertable for `data_points`; migrate existing data | Critical | 2–3 hrs | ⬜ pending |
| 3.3 | Update TypeScript DTOs and DataPointEntity to use Timescale extensions | High | 1 day | ⬜ pending |
| 3.4 | Implement retention policies (keep raw data 90 days, roll up to 1-min averages for 1 year) | High | 2 days | ⬜ pending |
| 3.5 | Add chunking configuration (daily chunks with automatic compression) | Medium | 1 day | ⬜ pending |
| 3.6 | Benchmarks: measure write throughput before/after migration | High | 2–3 hrs | ⬜ pending |
| 3.7 | Update all documentation referencing DB schema (architecture.md, deploy.md, onboarding.md) | Medium | 1 day | ⬜ pending |

**Exit Criteria:** Write performance >50K inserts/sec, data auto-compression active, all services using TimescaleDB APIs.

---

### Phase 4 — Production Workflows _(Weeks 13–16)_

**Goal:** Complete order lifecycle and production management features.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 4.1 | Order workflow states: `draft` → `released` → `in_progress` → `completed` / `cancelled` + SPS-Flags `udiONo`/`uiOPos`/`uiOpNo` im State-Übergang | Critical | 2–3 days | ⬜ pending |
| 4.2 | Production step tracking: Carrier Entity + dbProcessData-Routing (`iStepNo` → `stepNo`, `iResourceID` → `nextResourceId`) | Critical | 2 days | ⬜ pending |
| 4.3 | Material consumption tracking (link materials to orders) | Medium | 1–2 days | ⬜ pending |
| 4.4 | **Dispatcher-Service**: OPC UA Subscription auf `xStart` pro Station + stMES-Handshake logik (Lesen/Antworten via write-back) | Critical | 3–5 days | ⬜ pending |
| 4.5 | Carrier-CRUD REST API erstellen (create/read/update/delete Carriers mit dbProcessData-Feldern) | High | 1 day | ⬜ pending |
| 4.6 | Error handling & downtime logging per machine + Mapping auf `xErrL0`/`xErrL1`/`xErrL2` Bits | High | 1–2 days | ⬜ pending |
| 4.5 | Error handling & downtime logging per machine | High | 1–2 days | ⬜ pending |

**Exit Criteria:** Full order lifecycle flow with state transitions, material tracking (via Carrier parameters), SPS handshake via OPC UA subscriptions, and carrier routing.

---

### Phase 5 — Dashboard Intelligence: Line Overview + KPIs _(Weeks 17–20)_

**Goal:** Dashboard focuses on physical production line overview first (stations + carriers), then adds real-time OEE and historical trends.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 5.0 _(neu)_ | **Line Overview & Carrier Map**: Visuelles Linien-Diagramm aller Stationen +Carrier-Positionen; Handshake-Status (`xStart`/`xQryBusy`); Echtzeit-Werkstückträger-Tabelle mit Filter nach Status/Kategorie | Critical | 3–4 days | ⬜ pending |
| 5.1 | OEE calculation (Availability × Performance × Quality) with Timescale continuous aggregates | High | 3–4 days | ⬜ pending |
| 5.2 | Real-time KPI widgets on Dashboard: throughput, yield, machine status (live via WebSocket) | High | 2–3 days | ⬜ pending |
| 5.3 | Historical trend charts for key metrics (time-range selector) | High | 2–3 days | ⬜ pending |
| 5.4 | Machine availability and downtime Pareto chart | Medium | 1–2 days | ⬜ pending |
| 5.5 | Export dashboards to PDF per shift/day | Low | 1 day | ⬜ pending |

**Exit Criteria:** Dashboard shows line overview (all stations + carrier positions via WebSocket), real-time OEE, trend charts with custom date pickers, and actionable KPIs for operations managers.

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

### Phase 7 — Notifications & Advanced Features _(Weeks 25–28)_

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 7.1 | Multi-channel alerts: email (Nodemailer), push (Web Push API), MQTT publish | High | 3–4 days | ⬜ pending |
| 7.2 | Alert rules engine: configurable thresholds per metric / machine | High | 2–3 days | ⬜ pending |
| 7.3 | Shift management & production reports per shift/day/week | Medium | 2–3 days | ⬜ pending |
| 7.4 | Multi-language i18n (DE / EN) for frontend | Low | 1–2 days | ⬜ pending |

---

## 3. Technology Stack Summary

| Layer | Current Stack | Planned Changes |
|-------|-------------|-----------------|
| **Backend** | NestJS 11 + TypeScript 5.7 | passport-jwt, `@nestjs/swagger`, class-validator |
| **Frontend** | React 19 + Vite 7 + Tailwind 4 | Chart.js / Recharts (Phase 5), WebSocket client |
| **Database** | PostgreSQL 16 (Docker) | → TimescaleDB extension (Phase 3) |
| **OPC UA** | `node-opcua` v2.175 | Subscriptions (MonitoredItems) + write-back pro Station, Session-Management |
| **MQTT** | `mqtt` v5.15 | QoS configuration + topic routing |
| **Tests** | Jest + Supertest (E2E only) → Unit tests (Phase 6) |
| **Deploy** | pm2 / Docker Compose / nginx | Docker Swarm or K8s evaluation (future) |

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
_Last updated: July 2026_
_Next review: After Phase 1 completion (SPS-Handshake & Dashboard-Fokus in v1.1)_
