# Style Guide Skill – MES Edge Gateway (Wara)

Dieser Skill gilt projektweit. Jeder Commit und jede Code-Review muss diese Konventionen prüfen.

---

## 1. Farbpalette

### Tokens (definiert in `frontend/src/tailwind.css @theme`)

| Token                        | Wert       | Verwendung                                    |
|------------------------------|------------|-----------------------------------------------|
| `--color-brand-primary`      | `#f58b00`  | **Primärakzent (Orange)** – CTAs, aktiver Nav-State, Logo-Akzent |
| `--color-brand-magenta`      | `#e8147a`  | Alias für magenta -- Legacy / spezifische Highlights |
| `--color-brand-orange`       | `#f58b00`  | Korrespondiert mit Primary (Orange)           |
| `--color-brand-cyan`         | `#00b4d8`  | Akzentfarbe – Infos, Secondary-Aktionen       |
| `--color-brand-lilac`        | `#9b72cf`  | Akzentfarbe – tertiäre Highlights             |
| `--color-neutral-black`      | `#1a1a1a`  | Headers, Haupttext                            |
| `--color-neutral-dark`       | `#333333`  | Sekundärtext, Sidebar-Label                   |
| `--color-neutral-mid`        | `#6b7280`  | Labels, Captions (ersetzt `text-gray-500`)    |
| `--color-neutral-light`      | `#9ca3af`  | Platzhalter, Icons, disabled                  |
| `--color-neutral-border`     | `#e5e7eb`  | Karten-/Tabellenränder                        |
| `--color-neutral-stroke`     | `#f3f4f6`  | Subtile Trennlinien                           |
| **Status – Erfolg**          |            |                                               |
| `--color-status-success`     | `#16a34a`  | OK, verbunden, aktiv                          |
| `--color-status-success-bg`  | `#f0fdf4`  | Success-Badge-Hintergrund                     |
| **Status – Warnung**         |            |                                               |
| `--color-status-warning`     | `#ca8a04`  | Warning, idle                                 |
| `--color-status-warning-bg`  | `#fefce8`  | Warning-Badge-Hintergrund                     |
| **Status – Fehler**          |            |                                               |
| `--color-status-error`       | `#dc2626`  | Alarm, offline, kritisch                       |
| `--color-status-error-bg`    | `#fef2f2`  | Error-Badge-Hintergrund                       |
| **Status – Info**            |            |                                               |
| `--color-status-info`        | `#2563eb`  | Standard-Aktion                               |
| `--color-status-info-bg`     | `#eff6ff`  | Info-Badge-Hintergrund                        |
| **Akzent – Pink**            |            |                                               |
| `--color-accent-pink`        | `#fdf2f8`  | Pink Badge-Hintergrund                        |
| **Akzent – Lilac BG**        |            |                                               |
| `--color-accent-lilac-bg`    | `#faf5ff`  | Lilac Badge-Hintergrund                       |
| **Primär – Dunkler (Hover)** |            |                                               |
| `--color-brand-primary-dark` | `#d97706` | Primary-Button Hover (orange)                    |
| **Status – Fehler – Dunkler** |          |                                               |
| `--color-status-error-dark`  | `#b91c1c` | Danger-Button Hover                             |

### Referenz im Code

```tsx
// ✅ Richtig – Token via Tailwind arbitrary value
<div className="bg-brand-primary text-white rounded-lg px-4 py-2">Neue Station</div>
<p className="text-neutral-mid text-sm">Beschreibungstext</p>
<span className={/* ... */}>{"  "}Online</span>

// Status-Badges (wichtig: bg-status-{type}-bg → Tailwind löst zu var(--color-status-{type}-bg))
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success-bg text-status-success">Online</span>

// ❌ Falsch – Hardcoded Hex-Farben im JS oder CSS
style={{ backgroundColor: "#ef4444" }}
className="text-red-500 border-gray-200"
```

---

## 2. Typografie

| Ebene      | Tailwind arbitrary             | Token-Wert     | Verwendung                                  |
|------------|-------------------------------|----------------|---------------------------------------------|
| H1         | `text-[var(--text-4xl-size)]` / `leading-[var(--text-4xl-line)] font-bold`  | 2.25rem (36px)  | Seitentitel                               |
| H2         | `text-[var(--text-3xl-size)]` / `leading-[var(--text-3xl-line)] font-bold`  | 1.875rem (30px) | Sekundärtitel, Section-Header             |
| H3         | `text-[var(--text-xl-size)]` / `leading-[var(--text-xl-line)] font-semibold` | 1.25rem (20px)  | Card-Titel, Panel-Header                   |
| Body       | `text-[var(--text-base-size)]` / `leading-[var(--text-base-line)]`         | 1rem (16px)     | Fließtext                                    |
| Small      | `text-[var(--text-sm-size)]` / `leading-[var(--text-sm-line)] text-neutral-mid` | 0.875rem (14px) | Captions, Labels                           |
| Micro      | `text-[var(--text-xs-size)]` / `leading-[var(--text-xs-line)] font-mono`   | 0.75rem (12px)  | ID-Hinweise, Code, Metadaten                   |

```tsx
// ✅ Richtig
<h1 className="text-[var(--text-4xl-size)] leading-[var(--text-4xl-line)] font-bold text-neutral-black mb-1">MES Dashboard</h1>
<p className="text-[var(--text-sm-size)] leading-[var(--text-sm-line)] text-neutral-mid mb-6">Willkommen bei der MES Edge Gateway Übersicht</p>

// ❌ Falsch – hardcoded Sizes
className="text-3xl font-bold"
className="text-xs text-gray-500"
```

---

## 3. Layout & Struktur

### Sidebar

| Regel                         | Wert                                    |
|-------------------------------|-----------------------------------------|
| Breite                        | `w-[var(--sidebar-width)]`              |
| Hintergrund                  | `bg-neutral-black` (nicht `slate-900`) |
| Nav-Item aktiv                 | `bg-brand-primary text-white`           |
| Nav-Item inaktiv             | `text-neutral-dark hover:bg-neutral-stroke hover:text-neutral-black transition-colors duration-150` |
| Nav-Item Border Radius        | `rounded-lg`                            |
| Nav-Item Padding              | `px-4 py-2.5`                           |
| Sidebar Divider               | `border-b border-[rgba(255,255,255,0.1)]` |

### Page Shell (Inhalt)

```tsx
// ✅ Richtig – Page Shell Pattern
return (
  <div className="pl-[var(--sidebar-width)] flex-1 overflow-auto">
    <main className="p-[var(--space-xl)]">
      <h1 className="...">Page Title</h1>
      <p className="text-sm text-neutral-mid mb-6">Subtitle / Beschreibung</p>
      {/* Content */}
    </main>
  </div>
);
```

### Grid Patterns

| Kontext                    | Pattern                                    |
|----------------------------|--------------------------------------------|
| StatCards (KPI)           | `grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4` |
| Quick Links               | `grid grid-cols-2 gap-3`                   |
| Form Fields (inline)      | `grid grid-cols-[minmax(180px,1fr)_auto] gap-4 items-center` |
| Table                     | `w-full border-collapse`                    |

---

## 4. Karten (Cards)

```tsx
// ✅ Richtig – Konsistentes Card Pattern
<div className="bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border p-6 hover:shadow-hover transition-shadow duration-200">
  <h3 className="text-xl font-semibold text-neutral-black mb-4">Karten-Titel</h3>
  <p className="text-base text-neutral-dark leading-[var(--text-base-line)]">Inhalt...</p>
</div>

// ❌ Falsch / Vermieden
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p5">  {/* "p5" = Tippfehler, gray statt neutral-token */}
<div style={{ padding: 20, borderRadius: 12 }}>                             {/* Inline-Styles */}

/* Ab jetzt: StatCard-Komponente als einzige Card-Primative verwenden */
import StatCard from "@/components/StatCard";
<StatCard label="Stationen" value={stats.machines} icon="🔧" colorClass="bg-brand-primary" />
```

### StatCard Farbklassen (color prop Mapping) -- Token-Namen MUESSEN exakt gematcht werden

**WICHTIG:** Alle Status Tokens folgen dem Pattern: `status-{type}` für text, `status-{type}-bg` für bg.
| color prop      | Tailwind class                         | Bedeutung       |
|-----------------|----------------------------------------|-----------------|
| `primary`       | `bg-brand-primary text-white`          | Hauptakzent (orange)    |
| `magenta`       | `bg-[#e8147a]/10 text-brand-magenta`   | Magenta-Highlight / Info  |
| `orange`        | `bg-brand-orange/10 text-brand-orange`   | Warnung         |
| `cyan`          | `bg-brand-cyan/10 text-brand-cyan`       | Sekundär-Info    |
| `lilac`         | `bg-brand-lilac/10 text-brand-lilac`     | Tertiär-Highlight|
| `success`        | `bg-status-success-bg text-status-success`   | Status OK     |
| `warning`        | `bg-status-warning-bg text-status-warning`   | Status Warning|
| `error`          | `bg-status-error-bg text-status-error`       | Status Error    |

---

## 5. Tabellen

```tsx
// ✅ Richtig – Konsistentes Table Pattern
<table className="w-full border-collapse bg-white rounded-[var(--radius-lg)] overflow-hidden shadow-card">
  <thead>
    <tr className="bg-neutral-stroke">
      <th className="px-6 py-3.5 text-xs uppercase tracking-wider font-semibold text-neutral-mid">Spalte</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-neutral-stroke hover:bg-neutral-stroke/50 transition-colors">
      <td className="px-6 py-4 text-base text-neutral-dark">{value}</td>
    </tr>
  </tbody>
</table>

// Status-Badges in Tabellenzellen
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-bg-success text-status-success">Online</span>
```

### Table Regeln

| Regel                         | Wert                                    |
|-------------------------------|-----------------------------------------|
| Header background             | `bg-neutral-stroke`                     |
| Row divider                   | `border-b border-neutral-stroke`        |
| Hover (zeile)                 | `hover:bg-neutral-stroke/50`            |
| Cell padding                  | `px-6 py-4`                             |
| Th text                       | `uppercase tracking-wider font-semibold`|
| ID / UUID cells               | `font-mono text-xs`                     |

---

## 6. Buttons

| Variante        | Klassen                                       | Verwendung                        |
|------------------|-----------------------------------------------|---------------------------------|
| **Primary**     | `bg-brand-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-brand-primary-dark)] active:bg-[#b96306] transition-colors` | Hauptaktion (erzeugen, speichern)  |
| **Secondary**   | `bg-neutral-stroke text-neutral-dark font-medium px-4 py-2 rounded-lg hover:bg-neutral-border transition-colors` | Sekundäraktion                   |
| **Danger**      | `bg-status-error text-white font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-status-error-dark)] active:bg-[#991b1b] transition-colors` | Löschen, kritisch                |
| **Ghost**       | `text-neutral-mid hover:text-neutral-black hover:bg-neutral-stroke font-medium px-3 py-1.5 rounded-md transition-colors` | Minimale Sichtbarkeit            |

```tsx
// ✅ Richtig
<button className="bg-brand-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-[var(--color-brand-primary-dark)] transition-colors">
  Neue Station
</button>

// ❌ Falsch – hardcoded Farben, falsche border-radius, missing transition
style={{ backgroundColor: "#f97316" }} className="border btn"
```

---

## 7. Formulare

| Element          | Klasse                                        | Verwendung                     |
|------------------|-----------------------------------------------|-------------------------------|
| Input/Select     | `w-full bg-white border border-neutral-border rounded-md px-3 py-2 text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all` |                           |
| Label            | `block text-sm font-medium text-neutral-dark mb-1.5`                          |                               |
| Error message    | `text-status-error text-xs mt-1.5 flex items-center gap-1`                    → Fehleranzeige              |

```tsx
// ✅ Richtig
<input
  type="text"
  className="w-full bg-white border border-neutral-border rounded-md px-3 py-2 text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all"
  placeholder="Station-ID eingeben..."
/>

// ❌ Falsch – keine Focus-Highlight, hardcoded Farben
className="border bg-gray-50 rounded px-3 py-2 text-black"
```

---

## 8. Inline Status / Badges

```tsx
// Online / OK
<span className={/* ... */}>{"  "}Online</span>

// Warnung / Idle
<span className={/* ... */}>{"  "}Idle</span>

// Error / Offline
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-bg-error text-status-error">Offline</span>

// Info / Standard
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-bg-info text-status-info">Aktiv</span>
```

### Status-Bullet (kleiner Punkt für Indikatoren)

```tsx
<span className="w-2 h-2 rounded-full bg-status-success"></span>  // OK
<span className="w-2 h-2 rounded-full bg-status-warning animate-pulse"></span>  // Warnung
<span className="w-2 h-2 rounded-full bg-status-error"></span>  // Error
```

---

## 9. Icons

| Regel                         | Wert                                    |
|-------------------------------|-----------------------------------------|
| Emoji verwenden              | ✅ Ja, als quick-icons in Nav & StatCards |
| Größere Icons                 | `w-6 h-6` + `text-[length:var(--text-lg-size)]`    |
| Inline Icon-Punkte             | `w-1.5 h-1.5 rounded-full bg-*`          |

---

## 10. Code-Qualität Checklist (vor jedem Commit)

### Muss erfüllt sein ⚠️

- [ ] **Keine Hex-Farben mehr** außer in Hover-Varianten (`hover:bg-[#...]`) oder in `tailwind.css @theme` — prüfe mit: `grep -rE '#[0-9a-fA-F]{6}' frontend/src/**/*.jsx frontend/src/**/*.tsx` (außer hover patterns)
- [ ] **Kein `React.createElement`** – alles JSX mit `export default function`
- [ ] **Kein Inline-`style={{}}` für Farben/Spacing** – alle Tokens via Tailwind-Klassen
- [ ] **Sidebar bleibt `w-[var(--sidebar-width)]` und `bg-neutral-black` (nicht slate-900)** — geprüft in Sidebar.jsx
- [ ] **Nav-Item aktiv = `bg-brand-primary`, inaktiv = `text-neutral-dark hover:bg-neutral-stroke`**
- [ ] **Text-Farben: strikt verboten `gray-*`, verwende ausschliesslich `neutral-*`-Tokens** — prüfe mit: `grep -rE 'gray-' frontend/src/**/*.jsx frontend/src/**/*.tsx` muss leer sein
- [ ] **Page Title = `text-[var(--text-4xl-size)]` + Subtitle = `text-sm text-neutral-mid mb-6`**
- [ ] **Cards: `rounded-lg`, `shadow-card`, `border border-neutral-border`** — geprüft in StatCard.jsx und allen Page-Komponenten
- [ ] **Table headers: `bg-neutral-stroke`, rows: `border-b border-neutral-stroke hover:bg-neutral-stroke/50`**
- [ ] **Buttons: Primary = `bg-brand-primary`, Danger = `bg-status-error`, Ghost = `text-neutral-mid`**
- [ ] **Status-Badges: Nutzen `status-bg-*` + `status-*` Tokens, nie direct hex oder Tailwind blue/red/green** — prüfe mit: `grep -rE 'bg-blue|bg-red|bg-green|bg-yellow' frontend/src/**/*.jsx frontend/src/**/*.tsx` muss leer sein
- [ ] **Alle Farbe tokens definiert in `frontend/src/tailwind.css @theme` nur** — kein Token Duplikat anderswo

### Sollte erfüllt sein 📐

- [ ] Komponenten in eigene Dateien ausgelagert (`components/`)
- [ ] API-Konstanten zentralisiert (`api/client.js`)
- [ ] Props typisiert / JSDoc `@param` verwendet
- [ ] Keine hardcoded Strings für API-Pfade (verwende `/api`-Konstante)

---

## 19. Selbstprüfung des Style Guides (Skill-Regeln)

Der Style Guide IST die autoritative Quelle -- ALLE Regeln hier gelten automatisiert und müssen vor jeder Änderung geprüft werden:

### Validierungs-Check (vor Code-Änderung ausführen):

```bash
# 1. Finde alle hardkodierten Hex-Farben in JSX/TSX (erlaubt: hover-only)
grep -rE '#[0-9a-fA-F]{6}' frontend/src/**/*.jsx frontend/src/**/*.tsx | grep -v 'hover:bg-\[' 

# 2. Finde verbotene Tailwind Farben (gray, blue, red, green, yellow als Farben)
grep -rE 'bg-gray-|text-gray-|border-gray-|bg-blue-|bg-red-|bg-green-|bg-yellow-' frontend/src/**/*.jsx frontend/src/**/*.tsx

# 3. Prüfe ob tailwind.css alle definierten Farben enthält
grep -c 'color-' frontend/src/tailwind.css  # muss > 0 sein
```

### Style Guide ist autoritativ -- keine Abweichung erlaubt!

- **Nie** eine neue Farbe erfinden oder ausserhalb des `@theme` Blocks definieren
- **Nie** ein bestehendes Token umbenennen oder seinen Wertaendern (nur erweitern)
- **Immer** zuerst im Style Guide Abschnitt 1 nachschauen welches Token zu verwenden ist
- **Immer** die Beispiele in den Abschnitten XX als einzige Referenz verwenden

---

## 11. Migration: Alt → Neu

### Vorher (aktuell im Code)

```tsx
// Sidebar.jsx – Nav active state
"bg-blue-600 text-white"

// Dashboard.jsx – Colors
style={{ backgroundColor: "#eff6ff" }}
style={{ backgroundColor: "#2563eb" }}
className="text-gray-500"
className="bg-slate-900"
```

### Nachher (mit Style Guide)

```tsx
// Sidebar.jsx – Nav active state
isActive ? "bg-brand-primary text-white" : "text-neutral-dark hover:bg-neutral-stroke hover:text-neutral-black transition-colors duration-150"

// Dashboard.jsx – Colors
className="bg-status-bg-info"
className="bg-brand-primary text-white"
className="text-neutral-mid"
className="bg-neutral-black"
```

---

## 12. Neue Komponenten: Richtlinien

Jede neue UI-Komponente muss diesen Regeln folgen:

1. **Namen**: `PascalCase` im Dateinamen und als exportierte Funktion
2. **Position**: `components/` für wiederverwendbar, `pages/` für seiten-spezifisch
3. **Props**: explizite destructurierte Props (`{ label, value, color }`), nicht `props.label`
4. **JSX statt createElement** – nur JSX Syntax
5. **Kein lokales CSS** – alles Tailwind arbitrary values oder Tokens
6. **A11y**: `role`, `aria-label` wo nötig; `alt` für Bilder

---

## 13. Loading / Empty States (zentralisiert)

### Spinner + Text Pattern

```tsx
// ✅ Richtig – Zentrale Loading-Komponente
function LoadingBar({ label = "Laden..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3">
      <svg className="w-8 h-8 animate-spin text-brand-primary" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="60 40" strokeLinecap="round"/>
      </svg>
      <p className="text-neutral-light text-sm">{label}</p>
    </div>
  );
}

// ✅ Richtig – Empty State Pattern
function EmptyState({ icon, title = "Keine Daten", subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3">
      <span className="text-4xl text-neutral-light">{icon}</span>
      <p className="text-neutral-mid text-base font-medium">{title}</p>
      {subtitle && <p className="text-neutral-light text-sm">{subtitle}</p>}
    </div>
  );
}

// ❌ Falsch – Inline-Text, keine Struktur
<p className="text-center text-gray-400 p-12">Laden...</p>
<p className="text-center text-gray-400 p-12">Keine Alarme</p>
```

---

## 14. Modal / Dialog System

### Regeln für alle Dialoge

| Regel                         | Wert                                    |
|-------------------------------|-----------------------------------------|
| Overlay                       | `fixed inset-0 z-50 flex items-center justify-center` |
| Backdrop                      | `"rgba(0,0,0,0.5)"` + optional `backdrop-blur-sm` (via style) |
| Panel                         | `bg-white rounded-[var(--radius-xl)] p-6 w-full max-w-lg mx-auto` mit `shadow-card` statt shadow-dropdown (nicht definiert) |
| Titel                         | `text-[var(--text-xl-size)] font-bold text-neutral-black mb-4` |
| Schliessen                    | onClick auf Overlay setze state auf false; ESC-Taste support |

```tsx
// ✅ Richtig – Konsistentes Modal Pattern
const [showModal, setShowModal] = useState(false);

function ConfirmDialog() {
  return (
    <>
      <div onClick={() => setShowModal(false)} style={{ background: "rgba(0,0,0,0.5)" }} className="fixed inset-0 z-50 flex items-center justify-center">
        <div onClick={e => e.stopPropagation()} className="bg-white rounded-[var(--radius-xl)] shadow-card p-6 w-full max-w-md mx-4">
          <h2 className="text-[var(--text-xl-size)] font-bold text-neutral-black mb-4">Bestaetigung</h2>
          <p className="text-neutral-dark mb-6">Sind Sie sicher?</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-dark bg-neutral-stroke rounded-lg hover:bg-neutral-border transition-colors">Abbrechen</button>
            <button onClick={handleConfirm} className="px-4 py-2 text-sm font-medium text-white bg-status-error rounded-lg hover:bg-[#b91c1c] active:bg-[#991b1b] transition-colors">Loeschen</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ❌ Falsch – Hardcoded colors, missing backdrop-blur, missing z-level
className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
style={{ backgroundColor: "#2563eb" }}
```

---

## 15. Toast / Notification System (für Future)

Pattern für kuenftige Implementierung:

```tsx
// Kuenftig: Toast-Komponente fuer Feedback (Erfolg, Fehler, Info)
function Toast({ type, message, onDismiss }) {
  var colorMap = {
    success: "border-l-4 border-status-success text-neutral-dark bg-white",
    error: "border-l-4 border-status-error text-neutral-dark bg-white",
    warning: "border-l-4 border-status-warning text-neutral-dark bg-white",
    info: "border-l-4 border-brand-primary text-neutral-dark bg-white",
  };
  return (
      <div className={`fixed bottom-4 right-4 z-[100] rounded-lg shadow-card px-5 py-4 ${colorMap[type]} max-w-sm`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onDismiss} className="ml-3 text-neutral-light hover:text-neutral-dark">{"\u00D7"}</button>
      </div>
    </div>
  );
}
```

**Nutze dieses Pattern fuer:**
- Speichern erfolgreich → `type="success"`
- Request fehlgeschlagen → `type="error"`
- Warnung (z.B. ueberschreiben) → `type="warning"`

---

## 16. Dark Mode Support (taille v4 @media)

In `frontend/src/tailwind.css` dark-mode Branch einrichten:

```css
/* Nach dem @theme Block ergaenzen */
@variant dark (&:where(.dark, .dark *));

@layer base {
  .dark {
    --color-neutral-black: #f9fafb;      /* Reverse: helle Schrift auf dunklem BG */
    --color-neutral-dark: #e5e7eb;        /* Helle Sekundaeertexte */
    --color-neutral-mid: #9ca3af;
    --color-neutral-light: #6b7280;
    --color-neutral-border: #374151;      /* Dunklere Borders */
    --color-neutral-stroke: #1f2937;      /* Subtile Trennlinien */
    --color-bg-white: #111827;            /* Dunkler Haupt-HG */
  }
}
```

**Dark-Mode Trigger:** Toggle-Button in der Sidebar (unten, unter "Edge aktiv"):
```tsx
<button onClick={() => document.documentElement.classList.toggle('dark')} 
  className="text-neutral-light hover:text-brand-primary transition-colors"
  aria-label="Dark mode umschalten">
  {"\uD83C\uDF19"}
</button>
```

---

## 17. Responsive Design Regeln

| Breakpoint          | Verhalten                                          |
|---------------------|----------------------------------------------------|
| `lg` (1024px+)      | Sidebar fix `w-[var(--sidebar-width)]`, Page Shell wie aktuell          |
| `< lg` (Tablet)     | Sidebar wird zu Bottom-Bar oder Hamburger-Menu    |
| `< md` (768px)      | Grid: StatCards werden `grid-cols-1`; Forms vertical |
| Inhalt              | padding reduziert sich zu `p-[var(--space-md)]` auf mobile, `p-[var(--space-xl)]` ab lg |

```tsx
// ✅ Richtig – Responsive Container
<div className="pl-0 lg:pl-[var(--sidebar-width)] p-[var(--space-md)] lg:p-[var(--space-xl)]">
  <h1 className="text-[var(--text-4xl-size)] ...">Page Title</h1>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
    {/* Items */}
  </div>
</div>

// ❌ Falsch – fix w-64 ohne media query
<div className="pl-64 p-8">
```

---

## 19. Selbstprüfung des Style Guides (Skill-Regeln)

### WICHTIG: Immer prüfen vor Code-Änderungen!

Dieser Style Guide ist die **autoritative Quelle** -- ALLE Regeln hier gelten automatisch und müssen vor jeder Änderung geprüft werden. Nie abweichen!

### Validierungs-Check (vor jeder code-relateden Aenderung MUST durchführen):

```bash
# 1. Finde alle hardkodierten Hex-Farben in JSX/TSX (erlaubt: hover-only)
grep -rE '#[0-9a-fA-F]{6}' frontend/src/**/*.jsx frontend/src/**/*.tsx | grep -v 'hover:bg-\['

# 2. Finde verbotene Tailwind Farben (gray, blue, red, green, yellow als Farben)
grep -rE 'bg-gray-|text-gray-|border-gray-|bg-blue-|bg-red-|bg-green-|bg-yellow-' frontend/src/**/*.jsx frontend/src/**/*.tsx

# 3. Prüfe ob tailwind.css alle definierten Farben enthält  
grep -c 'color-' frontend/src/tailwind.css   # muss > 0 sein
```

### Validierungs-Regeln:

1. **Keine Farbe ausserhalb von `tailwind.css @theme` definieren** -- Tokens MUESSEN in `frontend/src/tailwind.css` sein
2. **Vor jeder Änderung den Style Guide Abschnitt XX lesen, NICHT raten** -- Beispiele sind die einzige Referenz
3. **Nach jeder Änderung die Validierungs-Checks ausfuehren** -- keine "mutmasslich" OK
4. **Shadow-Utility-Namen pruefen** mit `grep -r 'shadow-' frontend/src/tailwind.css` bevor sie im Code verwendet werden
5. **Nie ein Token umbenennen oder Wert aendern** -- nur erweitern

---
