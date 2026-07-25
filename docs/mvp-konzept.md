# MVP KONZEPT: MES Produktionsoberfläche mit dbProcessData (DB151) Integration

## 1. Ziel & Umfang des MVP

### Primäres UI-Konzept
**Zwei getrennte Hauptseiten nach ISA-95 Prinzip (Monitor vs. Dispatch):**

### Seite 1 — Dashboard (`/dashboard`) = Monitor (alles lesend)
Alle KPIs, Trends, Charts und eine Mini-Monitor-Linie als Ubersicht:
1. **OEE/Verfugbarkeit/Performance/Qualitaet KPI-Kacheln** mit Trend-Pfeilen
2. **Durchsatz-Trend-Chart** (Zeitreihe) + Pareto-Downtime-Chart nebeneinander
3. **Mini-Linie:** Alle Stationen als kleine Dots mit Carrier-Namen + Handshake-Lichter (nur LESSEND — click öffnet Production Control Seite)
4. **Alarm-Ack im Dashboard** als inline-Akkordeon-Footer (Standard eingeklappt, nur Ack-Button pro Eintrag)

### Seite 2 — Produktionssteuerung (`/control`) = Dispatch/Interaktiv (alles schreibend möglich)
Fur den Operator zum Steuern der Produktion:
1. **Produktionslinie** (horizontal scrollbar — Stationsblöcke mit dbProcessData-Feldern als Kacheln pro Station)
2. **Pro Station:** Handschake-Buttons (xStart/xQryBusy/xAck), Parameter-Eingabe, Schritt-vorwaerts
3. **Jede Station-Kachel zeigt alle 7 dbProcessData-Felder** als Inline-Info + Edit-Modal für iPar1-4

### Warum zwei Seiten? — ISA-95 Trennung (Monitor vs Dispatch)
```
Dashboard (/dashboard):       Production Control (/control):
├─ Was sehe ich?              ├─ Was will ich tun?
├─ OEE/KPIs/Charts            ├─ xStart/xQryBusy/xAck Buttons
├─ Trends/Pareto              ├─ Schritt vorwaerts pro Station
└─ Mini-Linie (nur lesend)    └─ Parameter editieren pro Station
```

---

## 2. UI-Konzept im Detail

### A. Dashboard (`/dashboard`) — KPI-Ubersicht

```
┌───────────────────────────────────────────────────────┐
│ Dashboard: Produktionsübersicht in Echtzeit           │
├───────────────────────────────────────────────────────┤
│ [OEE 87%] [Yield 99.2%] [Aufträge 4/12] [Alarme 2] │
├───────────────────────────────────────────────────────┤
│ Durchsatz-Trend (24h)                                │
│ ┌──────────────────┐   Downtime Pareto               │
│ │ Kurven-Chart      │   Spritzgießen  ████████ 45min │
│ │                  │   Montage     ██████ 28min      │
│ └──────────────────┘   ...                          │
├───────────────────────────────────────────────────────┤
│ [Mini-Linie: S1● S2█▓ S3- S4· S5░]                │ → Zur Produktionssteuerung
├───────────────────────────────────────────────────────┤
│ [⚠ 2 aktive Alarme ▼ Alarm anzeigen (Inline)]       │
└───────────────────────────────────────────────────────┘
```

### B. Produktionssteuerung (`/control`) — Interaktive Steuerung

```
┌───────────────────────────────────────────────────────┐
│ [KPI-Header: OEE/Yield/Orders/Alarms]               │
├───────────────────────────────────────────────────────┤
│ Produktionslinie (horizontal scrollbar):             │
│                                                       │
│ ┌──────┐  ┌──────┐   ┌──────┐  ┌──────┐        ───→│
│ │S1●on │──│S2█on │───│S3-err│──│S4●on │         │
│ │Werkst│  │C-ACT │   │     -│  │C-XYZ │         │
│ │Sch.3/7│  │Par:R │   │Idle -│ │Par:B  │         │
│ │[×Start]│  │[Param]│  [Ack] │  │[×Start]│        │
│ │[→Step │  │[→Step │  └──────┘  │[→Step │         │
│ └──────┘  └──────┘              └──────┘        │
│                                                       │
├───────────────────────────────────────────────────────┤
│ [⚠ Alarm-Ack Footer (einklappbar)]                  │
└───────────────────────────────────────────────────────┘

Pro Station-Block in Production Control:
- dbProcessData als Mini-Carousel auf der Kachel
- [×Start] = xStart=true → Handshake starten
- [Param]  = iPar1-4 Edit Modal öffnen
- [→Step]  = Schritt vorwaerts (iStepNo inkrementieren)
```

---

## 3. Produktionstechnische Architektur

### Was auf welcher Seite lebt:

| Funktion | Dashboard (`/dashboard`) | Production Control (`/control`) | /carriers |
|----------|------------------------|--------------------------------|-----------|
| OEE/Yield KPIs | ✅ Hauptinhalt | Mini-KPI-Header (nur Anzeige) | — |
| Trends/Pareto Charts | ✅ Hauptinhalt | Nein | — |
| Linie mit Carriern (Mini-Monitor) | ✅ als Dots lesend | ✅ als Station-Karten interaktiv | — |
| dbProcessData-Felder lesen | Mini-Dots nur | ✅ Voll auf Station-Kacheln | ✅ Als Tabelle |
| xStart/xQryBusy xAck setzen | Nein | ✅ Auf jeder Station-Kachel | Nein |
| Schritt vorwaerts | Nein | ✅ Pro Station | Nein |
| Parameter (iPar1-4) editieren | Nein | ✅ Modal pro Station | ✅ Direkt in Tabelle |
| Active Orders Übersicht | Mini-Zähler (KPI-Kachel) | Mini-Zähler | — |
| Alarm-Ack | ✅ Als Footer-Akkordeon | Als Footer-Akkordeon | — |

### Workflow: Operator-Anmeldung → Workstation

1. **Login** → landet automatisch auf `/dashboard` (OEE/Yield/KPIs + Charts)
2. **Alarm gesehen?** → Klick im Dashboard-Footer → Inline Ack
3. **Produktion steuern?** → Sidebar: "Produktionssteuerung" → `/control`
4. Dort sieht er die Linie mit allen dbProcessData als Kacheln pro Station
5. Klick auf Station → Parameter-Modal / xStart setzen / Schritt vorwaerts

---

## 4. dbProcessData Mapping (DB151 <-> MES)

### Feld-zu-Feld-Karte mit Typanpassungen zur SPS-Kompatibilitaet

| dbProcessData SPs-Feld | Typ     | MES-Interface       | Anpassung im MVP                                     |
| ---------------------- | --------| ------------------- | ---------------------------------------------------- |
| `iCarrierID`           | Int(128)| String "WERKST-XXX" | **Neuer Service-Wrapper** castet SPS Int(128) -> BigInt, speichert als String fuer UI + vergleicht mit Carrier.carrierId |
| `iStepNo`              | Int(2)  | OrderEntity.iStepNo | Direkter Mapping (Int->Int) OK                    |
| `iResourceID`          | Int(2)  | CarrierEntity.next_resource_id | **Typ-Aenderung:** Von UUID-String auf INTEGER in DB + Entity |
| `iPar1`                | Int(1)  | process_data JSONB  | Weiterhin JSONB (Deckelfarbe: 0/1/2/3)             |
| `iPar2`                | Int(3)  | process_data JSONB  | Weiterhin JSONB (Rote Kugeln)                       |
| `iPar3`                | Int(5)  | process_data JSONB  | Weiterhin JSONB (Gruene Kugeln)                     |
| `iPar4`                | Int(7)  | process_data JSONB  | Weiterhin JSONB (Blaue Kugeln)                      |
| `ldtTimeStamp`         | LDT     | collected_at TS     | Weiterhin Timestamp; Format als HH:mm:ss             |

### Backend-Anderungen im MVP

1. **Carrier Entity erweitern** (`src/orders/carrier.entity.ts`):
   ```typescript
   // Neu: dbProcessData Mapping-Felder direkt als DB-Spalten
   @Column({ type: 'int', nullable: true })
   iPar1!: number;  // Deckelfarbe

   @Column({ type: 'int', nullable: true })
   iPar2!: number;  // Anzahl rote Kugeln

   @Column({ type: 'int', nullable: true })
   iPar3!: number;  // Anzahl grune Kugeln

   @Column({ type: 'int', nullable: true })
   iPar4!: number;  // Anzahl blaue Kugeln

   @Column({ type: 'timestamp', nullable: true })
   last_process_timestamp!: Date;  // ldtTimeStamp
   ```

2. **Neuer SPS-Dispatcher Service** (`src/orders/sps-dispatcher.service.ts`):
   - Mappt dbProcessData iCarrierID (BigInt vom SPS) zu Carrier-ID
   - Führt Int-Cast zwischen dbProcessData und JSONB durch
   - Schickt xStart/xAck/xQryBusy Handshake ueber OPC UA/MMQTT

3. **Neue API-Route**: `GET /orders/carriers/dbprocessdata` 
   - Liefert alle Carrier mit allen 7 dbProcessData-Feldern auf einmal
   - Formatiert iPar1 als "Farbe-Namen" statt Int-Wert fuer UI

---

## 4. MVP-UI-Userflow (Operator-Arbeitsweg)

```
Screen: ProductionControl.tsx (Default-Seite nach Login)

[Oben] KPI-Leiste (immer sichtbar) - aktuelle OEE/Yield/Order/Alarm counts

[Mittel] Produktionslinien-Ansicht scrollbar von links --> rechts, 
         jede Station zeigt dbProcessData-Werte live
   
[Unten Mitte] Workplan-Tabelle: Sortierbar nach Werkstueck/Schritt/Status
              Aktionen: Start | Step vorwaerts | Material erfassen  

[Baum] Akkordeon-Alarmfooter (standardmaessig eingeklappt)
       Klick -> erweitert sich inline in der Seite (kein Wechsel!)

[Rechts oben] manueller "Auftrag erstellen" Button + "Werkstueck manuell zuweisen"


### Workflow-Szenario: "Neuer Werktraeger an Station 1"

1. Operator druckt **"Auftrag erstellen"** und fuhlt Order + Workplan
2. Klicke auf **+ Werkstueck** am Auftragserstellung-Fenster
3. dbProcessData erscheint in der Produktionslinie mit iCarrierID="WERKST-001", iStepNo=0
4. SPS sendet xStart=true -> MES erkennt und setzt xQryBusy=true Handshake ab
5. Auf der **Workplan-Tabelle** steht WERKST-001 in Zeile 1, mit allen dbProcessData-Werten
6. Operator druckt **"Schritt vorwaerts"** -> iStepNo =1, iResourceID auf naechste Station


### Workflow-Szenario: "Fehler an Station 3"

1. SPS setzen xErrL1=true + Alarmtext via MQTT
2. **Alarm-Banner unten blinkt in gelb** mit Count=1
3. Operator klickt -> Alarm-Footer offnet sich inline
4. Eintrag zeigt: Station 3 (Montagemodul), iResourceID=3, Farbe=Gelb, xErrL1=true
5. nach Behebung: Operator druckt **"Ack"** am alarm-Eintrag -> loest xErrL1=0 an SPS zuruck + dismiss


### Workflow-Szenario: "Par-Werte manuell setzen"

Beispiel: Deckelfarbe "grun", 3 rote Kugeln, 5 grune, 7 blaue
1. In der Workplan-Tabelle bei der Zeile des Werksticks auf **"Parameter editieren"** klicken
2. Modal offnet sich mit Feldern fur iPar1 (Combo-Box: keine/Dose rot/Blaue/Grune) +  
   iPar2, iPar3, iPar4 als number inputs
3. Operator tragt Werte ein und bestatigt
4. Wird via SPSDispatcher an DBProcessData(iPar1..iPar4 uebernommmen

---

## 5. Stand Phase 9 (v1.5 — July 25, 2026)

Alle MVP-Phase-9-Aufgaben sind umgesetzt und produktionsbereit:

### Was erledigt wurde
| Bereich | Status | Details |
|---------|--------|---------|
| CarrierEntity dbProcessData-Felder | ✅ Completed | iPar1-4 (INTEGER), last_process_timestamp, partNumber, iCarrierID, iResourceID als INTEGER-Spalten |
| DB-Migration 002 | ✅ Completed | `database/migrations/002-add-carrier-database-migration.sql` legt alle neuen Spalten an |
| CarrierService.create()-Bugfix | ✅ Completed | Alle dto-fields werden korrekt auf Entity gemappt |
| SpsDispatcherService wiring | ✅ Completed | OrdersController integriert sps-dispatcher.service.ts; DispatcherService stub entfernt |
| WebSocket Protocol Alignment | ✅ Completed | Raw `ws` Server (edge-gateway.service.ts) + Frontend useWebSocket Hook kompatibel |
| Alarm Footer auf ProductionControl | ✅ Completed | Akkordeon mit unackAlarms count, severity coloring, ack/acknowledge buttons |
| OEE Yield-Korrektur Dashboard | ✅ Completed | availability normalisiert korrekt; yield zeigt oeeData.quality.toFixed(1) direkt an |
| Duplicate functions fixed | ✅ Completed | int128toString/stringToInt128 Duplikate in sps-dispatcher.service.ts entfernt |
| TypeScript compilation | ✅ Zero errors | Backend + Frontend kompilieren ohne Fehler |
| dev:full:nest npm script | ✅ Completed | Startet Backend+Frontend über `scripts/dev.ps1` |

### Noch ausstehend (nicht-blockierend)
| Aufgabe | Priorität | Status |
|---------|-----------|--------|
| OPC UA Node-Tree Analyse mit PLC-Hersteller (9.3.1) | Critical | ✅ done — Phase 10 S7-1500 Node Discovery implementiert (v1.6) |
| GitHub Secrets konfiguriert (I.6-I.8) | High | ⬜ pending — manueller Schritt im Repo Settings |
| Production Server Provisioning | High | ⬜ pending — benötigt real server access |

---

## 6. Phase 10 — Siemens S7-1500 OPC UA Node Discovery (v1.6)

Implementiert: Multi-Pattern Node-ID Resolver mit TIA Portal Address Space discovery.

Der OPC UA Service versucht nun automatisch die richtigen Node-IDs zu finden:

1. **Browse Discovery** — Durchsucht den Address Space nach DB-Blöcken (stMES, dbProcessData, DB151)
2. **Member Enumeration** — Enumeriert die Strukturmitglieder eines gefundenen DB-Blocks via OPC UA browse
3. **Multi-Pattern Fallback** — Wenn keine Discovery möglich:
   - S7 Compact Format: `ns=N;s=DB151:XStart`
   - TIA Portal Style: `ns=N;s=stMES|xStart` oder `ns=N;s=stMES_XStart`
   - Direct Prefix: `ns=N;s=<prefix>XStart` (konfigurierbar)
4. **Field Name Aliasing** — 40+ Varianten pro Feld für verschiedene TIA Portal Coding Standards

Konfiguration in `.env`:
```ini
OPC_UA_STATIONS=[
  {
    "id":1,
    "address":"opc.tcp://192.168.1.100:4840",
    "name":"Station 1",
    "nodePrefix":"PLC1.",
    "stMesDbName":"stMES",
    "dbProcessDataDbName":"DB151"
  }
]
OPC_UA_USERNAME=administrator
OPC_UA_PASSWORD=my_password
```

Bei den Default-Einstellungen (leere nodePrefix, stMesDbName=stMES, dbProcessDataDbName=dbProcessData) findet der Service die meisten TIA Portal Konfigurationen automatisch.

### Station-zu-Maschine Zuordnung (Edge Gateway Config)
Die Edge Gateway Config-Seite (`/edge`) erlaubt im Admin-Tab jede OPC UA Station einer Maschine zuzuordnen via `opcua_station_id` FK auf der Machine-Tabelle. Das Mapping wird über einen neuen Dashboard-Endpoint bereitgestellt:

| Endpoint | Zweck |
|----------|-------|
| `GET /edge/dashboard` | liefert alle 3 Schichten kombiniert: OPC-UA-Stations + Maschinen + Carrier |
| `PUT/PATCH /edge/opcua/config` | speichert Station Config in JSON-Datei + aktualisiert Environment |
| `POST /edge/opcua/config/reload` | hot-reload der OPC UA Verbindungen ohne App-Neustart |

### Werkstückträger-zu-Station Live-Zuordnung (v1.7)
Die implizite Zuordnung via `iResourceID ↔ machine.ID-Suffix` wurde durch ein explizites Mapping ersetzt:

| Schicht | Mechanismus | Quelle |
|---------|-------------|--------|
| OPC UA Service | `StationData.currentCarrierId` trackt letzten `iCarrierID` pro Station via dbProcessDataChange Event | `opcua.service.ts:stationData` |
| Edge Controller | enriches Station-Status mit `machineName` via `opcua_station_id` FK auf `MachineEntity` | `edge.controller.ts:/edge/dashboard` |
| Frontend ProductionControl | nutzt `dbProcessData.next_resource_id === machine.opcua_station_id` statt impliziter UUID-Parsing | `ProductionControl.tsx:stationsWithDpdata` |

Datenfluss während der Produktion:
```
1. SPS sendet iCarrierID → OpcUaService.trackt currentCarrierId pro Station
2. Edge Dashboard API enriches Status mit Machine-Namen via opcua_station_id FK
3. ProductionControl nutzt edgeDashboard für korrekte Zuordnung: Maschine ↔ OPC UA Station ↔ Carrier
```

Die implizite `parseInt(machine.id.split('-').pop())` Logik wurde durch explizites Mapping ersetzt — stabilisierend bei Änderungen der Maschinen-ID-Formatierung und Eliminierung von Suffix-Kollisionen.

---

## 7. Version History

| Version | Datum | Beschreibung |
|---------|-------|--------------|
| v1.5 | July 2026 | Phase 9: Carrier dbProcessData-Felder, SpsDispatcher, WebSocket Protocol |
| v1.6 | July 2026 | Phase 10: Siemens S7-1500 OPC UA Node Discovery mit Multi-Pattern Resolver |
| v1.7 | July 2026 (today) | Edge Gateway Config UI + Station-Maschine FK + Werkstuicktraeger-zu-Station Live-Zuordnung |
