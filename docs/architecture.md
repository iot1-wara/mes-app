# Architektur

## System-Übersicht

```
┌──────────────┐     OPC UA      ┌──────────────┐       MQTT       ┌──────────────┐
│  Maschinen   │ ◄────────────► │              │ ◄─────────────► │  Broker /    │
│  (PLCs, SPS) │                │ Edge Gateway │                 │  Sensoren    │
└──────────────┘                │ ┌──────────┐ │                 └──────────────┘
                                │ │ OPC UA   │ │
                                │ │ Client   │ │
                                │ └──────────┘ │
                                │              │
                                │ ┌──────────┐ │
                                │ │ MQTT     │ │
                                │ │ Client   │ │
                                │ └──────────┘ │
                                └──────────────┘
                                        │
                            ┌───────────▼──────────┐
                            │  TimescaleDB         │
                            │  (Telemetrie/Zeitreihe)│
                            │  PostgreSQL Engine   │
                            └──────────────────────┘
```

## Module-Übersicht

| Modul | Path | Aufgabe |
|-------|------|---------|
| **Alarms** | `src/alarms/` | Alarm-Verwaltung: Erstellen, Query, Acknowledge, Löschen |
| **Machines** | `src/machines/` | Maschinen-Registry: Online-Status, Heartbeat, Location |
| **Orders** | `src/orders/` | Produktionsaufträge: CRUD, Fortschritt-tracking |
| **Traces** | `src/traces/` | Trace-Daten: Prozess-Dokumentation pro Auftrag/Maschine |
| **DataCollection** | `src/data-collection/` | Rohdaten-Sammlung: Zeitreihendaten von Maschinen |
| **Edge Gateway** | `src/opcua/` | OPC UA Client, MQTT Publisher, Health-Endpoints |

## Datenfluss

1. **ERFASSUNG**: OPC UA Client liottet Werte von Maschinen (Temperatur, Druck etc.)
2. **TRANSPORT**: MQTT publiziert die Daten an Broker für andere Systeme
3. **PERSISTENZ**: TimescaleDB speichert Zeitreihendaten (Hypertables mit daily chunks, auto-compression, retention policies) 
4. **VISUALISIERUNG**: React-Frontend zeigt Echtzeit-Dashboard

## Schlüsselkomponenten

### OPC UA Service (`src/opcua/opcua.service.ts`)
- Verbindet sich mit einem OPC UA Server
- Liest Nodes periodisch aus
- Reconnect-Logik bei Verbindungsabbrüchen

### MqttGatewayService (`src/opcua/mqtt-gateway.service.ts`)
- Subscribt auf MQTT-Themes für Maschinen-Events
- Publish von aggregierten Daten

### DataCollection Service (`src/data-collection/data-collection.service.ts`)
- Speichert Zeitreihendaten (DataPoints) pro Maschine in TimescaleDB Hypertable
- Bietet bulk-write API für effiziente Inserts (>50K inserts/sec)
- Continuous Aggregates: automatische hourly/daily Rollups mit Refresh-Policies

### Database Schema
- **data_points** — Hypertable (daily chunks, compression after 7 days, retention 90 days)
- **data_points_hourly** — Continuous Aggregate (avg/min/max per slot)
- **data_points_dashboard** — Dashboard-aggregated view (5-min rollup)
- Automatic hypertable creation on app startup via `TimescaleMigrationService`

### Edge Controller (`src/opcua/edge.controller.ts`)
- Health-Check Endpoints
- OPC UA/MQTT Status-Anzeige
- Direkte Lese-/Schreibzugriffe auf OPC UA Nodes
