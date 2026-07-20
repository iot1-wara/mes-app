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
                            │  PostgreSQL          │
                            │  (Produktionsdaten)   │
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
3. **PERSISTENZ**: TypeORM speichert strukturierte Daten in PostgreSQL
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
- Speichert Zeitreihendaten (DataPoints) pro Maschine
- Bietet bulk-write API für effiziente Inserts

### Edge Controller (`src/opcua/edge.controller.ts`)
- Health-Check Endpoints
- OPC UA/MQTT Status-Anzeige
- Direkte Lese-/Schreibzugriffe auf OPC UA Nodes
