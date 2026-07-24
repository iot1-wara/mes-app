# MVP KONZEPT: MES Produktionsoberfläche mit dbProcessData (DB151) Integration

## 1. Ziel & Umfang des MVP

### Primäres UI-Konzept
**Einheitliche Arbeitsoberfläche für den Operator**, die drei Kernbereiche integriert:
1. **Produktionsführung** (Aufträge + Workplan) in Echtzeit
2. **Werkstück-Tracking & dbProcessData-Sicht** (Carrier-Steuerung mit SPS-Daten)
3. **Alarm-Handling** (priorisierte Liste mit direktem Feedback an SPS)

### Warum diese Struktur?
Der Operator hat keinen Bedarf, zwischen 5+ Seiten zu wechseln. Alle kritischen Produktionsdaten (dbProcessData DB151 Felder + Alarme + Auftragstatus) auf EINER Seite, scrollbar und klar getrennt. Die vorhandenen Pages bleiben als "Admin-Seiten" erhalten.

---

## 2. MVP-Kernseite: `ProductionControl.tsx` 

**Neue Datei:** `frontend/src/pages/ProductionControl.tsx`

### Bereich A - Produktions-KPI-Header (fixierte Leiste)
```
┌─────────────────────────────────────────────────────────┐
│ KPI: |  OEE 87% │  Yield 99.2% │  Active 4/12 │ Alarms 2│
└─────────────────────────────────────────────────────────┘
```
*Verwendung der bestehenden Dashboard-KPIs:* `GET /dashboard/oee`, `/dashboard/trend`, `/alarms/stats/active-count`.

### Bereich B - Produktionsleitung (Visual Flow + dbProcessData)

**Visuelle Produktionslinie:** bestehend aus Stationen mit Workplan-Schritten. Jede Station zeigt:
- **Station-Name & Status** (online/offline/error mitFarbe-Kodes)
- **Aktuelles dbProcessData DB151-Felder als Daten-Carousel** auf jeder Station:

```
  ┌──────────────────────────┐
  │ Station 3 - Montagemodul │
  │ ● Online   [█▓░] 87% OEE│
  │                          │
  │ dbProcessData (DB151):   │
  │ Werkst.: WERKST-042      │ iCarrierID → String "WERKST-042"
  │ Schritt: 3 / 7            │ iStepNo → Int(2) = 3
  │ Ziel:     Station 5       │ iResourceID → Int(2) = 5
  │ Farbe:   ROT (1)          │ iPar1   → Int(1) = 1 (R=rot)
  │ Kugeln:  3R / 5G / 7B    │ iPar2..iPar4 → Red/Green/Blue
  │ Stamp:  14:23:07          │ ldtTimeStamp → Timestamp formatiert
  │                          │
  │ Handshake: [● xStart]    │
  │         [█ xQryBusy] [- xAck]     │ (drei Status-Lichter)
  └──────────────────────────┘
```

**Implementierung:**  
- Die Daten kommen vom **bestehenden Carrier-Service** `GET /orders/carriers/list` (bereits verfügbar!)  
- iCarrierID und iResourceID werden als String aus `CarrierEntity.next_resource_id` gelesen, aber für dbProcessData-Kompatibilität wird im Dispatcher ein **Int-Cast beim SPS-Lesezugriff** durchgeführt
- Farb-Kodierung der Par-Werte:
  - iPar1=0 → kein Deckel
  - iPar1=1 → Rote Dose  
  - iPar1=2 → Blaue Dose
  - iPar1=3 → Grüne Dose

### Bereich C - Workplan-Liste (Werkstuecktraeger)

**Sortierbare Tabelle mit allen aktiven dbProcessData-Einträgen:**

| Spalte       | Quelle                         | Format                  |
|------------- | ------------------------------ | ----------------------- |
| Nr.          | auto (1,2,3...)                | Nummerierung            |
| Werkstueck   | `iCarrierID` (SPS: Int(128))  | String "WERKST-XXX"     |
| Schritt      | `iStepNo` (SPS: Int(2))       | Fortschrittsbalken StepN/total  
| Zielstation  | `iResourceID` (SPS: Int(2))   | Station Name            |
| Parameter    | `iPar1-4`                      | Komprimiert z.B. "R/3/5/7" |
| Zeitstempel  | `ldtTimeStamp`                 | HH:mm:ss formatiert     |
| Status       | Carrier.status                 | Farbiges Badget         |

**Aktionen pro Zeile:**
- **"Start"** → setzt xStart=true, initiiert Handshake mit SPS (über dispatcher)
- **"Step vorwaerts"** → inkrementiert iStepNo und verschiebt an iResourceID
- **"Alarm melden"** → öffnet Alarm-Footer

### Bereich D - Alarm-Footer (einklappbar / akkordeon-artig)

**Unten, standardmäßig eingeklappt, ein Alarm-Banner:**
```
┌─────────────────────────────────────────────┐
│ ⚠️ 2 aktive Alarme [Alarme anzeigen ▼]     │
└─────────────────────────────────────────────┘
```

Beim Aufklappen: **Inline-Alarm-Tabelle** direkt in ProductionControl integriert.

| Spalte              | Aktion                                  |
| ------------------- | --------------------------------------- |
| Status-Licht        | xErrL0 (rot) / xErrL1 (gelb) / xErrL2 (gruen) |
| Station             | iResourceID + Station-Name               |
| Alarmtext           | Von SPS ueber MQTT oder xError gesetzt  |
| Zeit                | ldtTimeStamp als Alarm-Zeit               |
| Ack                 | Button -> loescht xErrL0/L1/L2 in dbProcessData   |

---

## 3. dbProcessData Mapping (DB151 <-> MES)

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
