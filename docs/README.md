# MES Edge Gateway — Dokumentation

## Übersicht

Das MES Edge Gateway ist eine industrielle Datensammlung-Steuerungsplattform für die Produktion. Es sammelt Echtzeitdaten von Maschinen über OPC UA und MQTT, verwaltung Produktionsaufträge, erfasst Trace-Daten und überwacht Alarme — direkt am Produktionsstandort (Edge).

### Tech-Stack

| Layer | Technologie |
|-------|------------|
| Backend | NestJS 11, TypeORM, PostgreSQL |
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Protokolle | OPC UA (`node-opcua`), MQTT (`mqtt` v5) |
| Infrastruktur | Docker Compose, pm2 |
