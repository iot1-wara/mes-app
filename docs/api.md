# API-Dokumentation

## Basis-URL
```
http://localhost:3000/api
```

---

## Alarme (`/api/alarms`)

### Alle aktiven Alarme
```
GET /api/alarms
```

### einzelnen Alarm abrufen
```
GET /api/alarms/:id
```

### Alarm erstellen
```
POST /api/alarms
Content-Type: application/json

{
  "machineId": "machine-01",
  "severity": "high",
  "message": "Überdruck in Druckzone B"
}
```

### Alarm bestätigen
```
POST /api/alarms/:id/acknowledge
```

### Alarm löschen
```
DELETE /api/alarms/:id
```

### Anzahl aktiver Alarme
```
GET /api/alarms/stats/active-count
```

---

## Maschinen (`/api/machines`)

### Alle Maschinen
```
GET /api/machines
```

### Maschine erstellen
```
POST /api/machines
{
  "name": "CNC-Maschine-01",
  "location": "Fertigung A",
  "type": "cnc"
}
```

### Maschinen aktualisieren
```
PATCH /api/machines/:id
```

### Maschinenauftrag löschen
```
DELETE /api/machines/:id
```
