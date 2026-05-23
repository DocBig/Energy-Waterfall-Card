# Energy Waterfall Card

Eine benutzerdefinierte Home Assistant Lovelace-Karte, die den Energiefluss aus PV-Anlage, Batterie und Netz als Wasserfall-Diagramm mit Live-Anzeige und Verlaufshistorie darstellt.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![HA](https://img.shields.io/badge/Home%20Assistant-2023.3%2B-blue)

🇬🇧 [English documentation](README.md)

---

## Screenshots

### Vertikales Layout
![Vertical Layout](screenshots/vertical.jpg)

### Horizontales Layout (Dark Mode)
![Horizontal Dark](screenshots/horizontal_dark.jpg)

### Vollbild-Overlay
![Overlay](screenshots/overlay.jpg)

---

## Funktionen

- **Zwei Layout-Modi:** Horizontal (Zeit → links nach rechts) und Vertikal (Zeit ↑ unten nach oben)
- **Verlaufshistorie** aus der HA History API (konfigurierbar, Standard 10 Stunden)
- **Live-Balken** mit Echtzeit-Update (1-Sekunden-Intervall) — ohne DOM-Rebuild, Tooltips bleiben stabil
- **Interaktive Tooltips** mit konfigurierbarer Anzeigedauer — auch auf dem Live-Balken
  - Nullwerte werden automatisch ausgeblendet (einstellbarer Mindestwert)
  - Gesamt-Zeile zeigt den aktuellen Hausverbrauch inkl. optionalem Batterie-Überschuss
- **Min/Max-Anzeige** — Hover auf `↑↓` in der Legende zeigt Tooltip mit Min/Max-Werten und Uhrzeiten sowie **Marker im Chart** (Tick + gestrichelte Linie + Label)
- **Vollbild-Overlay** — per Klick auf `⤢` öffnet sich die Karte groß (ESC oder Klick zum Schließen)
  - Skalierbarer Schrift-Faktor (`overlay_scale`) für Achsen, Tooltips und Legende
  - Min/Max-Marker auch im Overlay funktionsfähig
- **kW-Sensor-Unterstützung** — pro Sensor einstellbar ob Werte in W oder kW geliefert werden
- **Automatisch skalierte kW-Achse** mit einstellbarer Mindest-Skala und Headroom
- **Adaptive Stundenmarker** — Intervall wird automatisch angepasst wenn Platz knapp wird
- **Farbwähler** im visuellen Editor mit Hex-Eingabe
- **Separate Farben** für Akku-Laden und Akku-Entladen
- **Batterie-Invertierung** für Wechselrichter mit umgekehrtem Vorzeichen (z.B. nicht-Deye)
- **Responsive** — ResizeObserver mit Debounce, passt sich Kartenbreite an
- **Dark/Light-Mode** — Vollbild-Overlay übernimmt automatisch das aktive HA-Theme
- **Zweisprachig** — Deutsch und Englisch (automatisch per HA-Spracheinstellung), inkl. Editor
- **Keine externen Abhängigkeiten** — reines Vanilla JS, kein Lit, kein Import

---

## Installation

### Manuell

1. Ordner `/config/www/community/Energy-Waterfall-Card/` erstellen
2. Datei `energy-waterfall-card.js` in diesen Ordner kopieren
3. In Home Assistant unter **Einstellungen → Dashboards → ⋮ → Ressourcen** eine neue Ressource hinzufügen:
   - URL: `/hacsfiles/Energy-Waterfall-Card/energy-waterfall-card.js`
   - Typ: `JavaScript-Modul`
4. Seite neu laden

### HACS (manuell als benutzerdefiniertes Repository)

1. HACS öffnen → Menü → Benutzerdefinierte Repositories
2. URL des Repositories eingeben, Kategorie: `Lovelace`
3. Karte installieren und Dashboard neu laden

---

## Konfiguration

### Minimale Konfiguration

```yaml
type: custom:energy-waterfall-card
entities:
  pv_power: sensor.pv_power
  battery_power: sensor.battery_power
  grid_power: sensor.grid_power
  load_power: sensor.load_power
```

### Vollständige Konfiguration

```yaml
type: custom:energy-waterfall-card
title: Energie-Verlauf
layout: vertical              # "horizontal" oder "vertical"

entities:
  pv_power: sensor.pv_power           # PV-Leistung
  battery_power: sensor.battery_power # Batterie (positiv = Entladen, negativ = Laden)
  grid_power: sensor.grid_power       # Netz (positiv = Bezug, negativ = Einspeisung)
  load_power: sensor.load_power       # Hausverbrauch

# Einheit pro Sensor (true = Sensor liefert kW, wird intern zu W konvertiert)
entities_kw:
  pv_power: false
  battery_power: false
  grid_power: false
  load_power: false

# Zeiteinstellungen
time_window_h: 10             # Zeitfenster der Historie in Stunden (1–48)
slot_duration_min: 4          # Dauer eines Datenpunkt-Slots in Minuten (1–30)
tick_interval_min: 60         # Stundenmarker-Intervall in Minuten (15–360)
tick_height_pct: 80           # Höhe/Breite der Stundenmarker in % (10–100)
tick_width_px: 1              # Linienstärke der Stundenmarker in px (0.5–5)

# Anzeige
height: 200                   # Kartenhöhe in px (100–800)
live_bar_size: 15             # Größe des Live-Blocks in px (10–100)
tooltip_timeout_s: 5          # Tooltip-Anzeigedauer nach Mausstillstand in Sekunden (1–30)
tooltip_min_w: 5              # Mindestwert für Tooltip-Anzeige in Watt (0–100)
overlay_scale: 1.4            # Schrift-Faktor im Vollbild-Overlay (1.0–3.0)
min_scale_w: 5000             # Mindest-Skalierung der Energieachse in Watt
headroom_pct: 15              # Zusätzlicher Platz über dem höchsten Wert in % (0–50)

# Optionen
invert_battery: false         # Batterie-Vorzeichen invertieren (für nicht-Deye Wechselrichter)

# Farben (Hex-Format)
colors:
  solar: "#FFD400"
  battery_charge: "#00C853"
  battery_discharge: "#FF6D00"
  grid: "#FF3B30"
```

---

## Parameter-Referenz

| Parameter | Standard | Beschreibung |
|---|---|---|
| `title` | `"Energie-Verlauf"` | Kartenüberschrift (leer lassen zum Ausblenden) |
| `layout` | `"horizontal"` | `"horizontal"` oder `"vertical"` |
| `entities.pv_power` | — | **Pflicht.** Entity ID der PV-Leistung |
| `entities.battery_power` | — | **Pflicht.** Entity ID der Batterieleistung |
| `entities.grid_power` | — | **Pflicht.** Entity ID der Netzleistung |
| `entities.load_power` | — | **Pflicht.** Entity ID des Hausverbrauchs |
| `entities_kw.pv_power` | `false` | Sensor liefert kW statt W |
| `entities_kw.battery_power` | `false` | Sensor liefert kW statt W |
| `entities_kw.grid_power` | `false` | Sensor liefert kW statt W |
| `entities_kw.load_power` | `false` | Sensor liefert kW statt W |
| `time_window_h` | `10` | Zeitfenster der Historie in Stunden |
| `slot_duration_min` | `4` | Slot-Dauer in Minuten (bestimmt Auflösung) |
| `tick_interval_min` | `60` | Stundenmarker-Intervall in Minuten |
| `tick_height_pct` | `80` | Ausdehnung der Stundenmarker in % |
| `tick_width_px` | `1` | Linienstärke der Stundenmarker |
| `tooltip_timeout_s` | `5` | Tooltip-Anzeigedauer nach Mausstillstand in Sekunden |
| `tooltip_min_w` | `5` | Mindestwert in Watt unter dem Werte nicht im Tooltip erscheinen |
| `live_bar_size` | `15` | Größe des Live-Blocks in px |
| `overlay_scale` | `1.4` | Schrift-Faktor im Vollbild-Overlay (1.0–3.0) |
| `height` | `200` | Kartenhöhe in px |
| `min_scale_w` | `5000` | Mindest-Skalierung der Energieachse in Watt |
| `headroom_pct` | `15` | Zusätzlicher Platz über Peakwert in % |
| `invert_battery` | `false` | Batterie-Vorzeichen invertieren |
| `colors.solar` | `#FFD400` | Farbe Solar (Hex) |
| `colors.battery_charge` | `#00C853` | Farbe Akku laden (Hex) |
| `colors.battery_discharge` | `#FF6D00` | Farbe Akku entladen (Hex) |
| `colors.grid` | `#FF3B30` | Farbe Netz Bezug (Hex) |

---

## kW-Sensor-Unterstützung

Manche Wechselrichter liefern Sensorwerte in Kilowatt statt Watt. Die Karte arbeitet intern immer in Watt — aktiviere `entities_kw` pro Sensor damit die Werte automatisch mit 1000 multipliziert werden:

```yaml
entities_kw:
  pv_power: true       # sensor liefert z.B. 6.5 (= 6500 W)
  battery_power: true
  grid_power: true
  load_power: true
```

Im visuellen Editor erscheint neben jedem Entity-Feld eine `kW`-Checkbox.

---

## Tooltip

Beim Hover über einen Slot:

```
12:34
⚡ Gesamt: 3.21 kW  (+0.64 kW 🔋)
☀ Solar: 1.57 kW
🔋 Akku laden: 0.64 kW
⚡ Netz Bezug: 1.64 kW
```

- **Gesamt** = Solar + Akku entladen + Netz Bezug (= Hausverbrauch)
- **(+X.XX kW 🔋)** erscheint nur wenn Batterie gerade lädt
- Werte unter `tooltip_min_w` Watt werden nicht angezeigt (Standard: 5W)
- Tooltip verschwindet nach `tooltip_timeout_s` Sekunden Inaktivität

---

## Min/Max-Anzeige

Hover auf `↑↓` in der Legende:

1. **Tooltip** mit Max- und Min-Wert des Gesamtflusses inkl. Uhrzeit
2. **Marker im Chart** an der zeitlichen Position:
   - Goldener Tick + gestrichelte Linie + Label für das Maximum
   - Blauer Tick + gestrichelte Linie + Label für das Minimum

Die Marker verschwinden wenn die Maus die Legende verlässt. Funktioniert auch im Vollbild-Overlay.

---

## Vollbild-Overlay

Klick auf **⤢** öffnet ein Vollbild-Overlay.

- **Schließen:** Klick auf **✕**, Klick auf Hintergrund oder **ESC**
- **Theme:** Übernimmt automatisch Light/Dark-Mode
- **Schriftgröße:** `overlay_scale` skaliert Achsen, Tooltips und Legende
- **Tooltips + Min/Max:** vollständig funktionsfähig

---

## Sensor-Vorzeichen

| Sensor | Positiv | Negativ |
|---|---|---|
| `pv_power` | PV erzeugt Strom | — |
| `battery_power` | Batterie entlädt | Batterie lädt |
| `grid_power` | Netzbezug | Netzeinspeisung |
| `load_power` | Verbrauch | — |

Bei umgekehrtem Batterie-Vorzeichen: `invert_battery: true`

---

## Layout-Modi

### Horizontal
- Zeit: **links** (alt) → **rechts** (neu)
- Energie: **oben** = Solar + Laden, **unten** = Entladen + Netzbezug
- Live-Balken ganz **rechts**
- Zeitbeschriftungen auf zwei versetzten Ebenen
- Stundenmarker-Intervall adaptiv

### Vertikal
- Zeit: **unten** (alt) → **oben** (neu)
- Energie: **links** = Solar + Laden, **rechts** = Entladen + Netzbezug
- Live-Streifen ganz **oben**
- Stundenmarker alle 2 Stunden

---

## Technische Details

- **Keine ES-Module:** `(function(){...})()`, kein `type: module`
- **History API:** `history/history_during_period` via HA WebSocket (HA 2023.3+)
- **Lücken:** Forward-fill und Backward-fill Interpolation
- **Performance:** Live-Updates ändern nur SVG-Attribute, kein `innerHTML`-Reset
- **ResizeObserver:** Debounced mit 150ms
- **Overlay:** In `document.documentElement`, außerhalb aller Shadow DOMs
- **Min/Max-Marker:** `createElementNS` ins SVG, bei mouseleave entfernt
- **kW-Konvertierung:** `toW(val, isKw)` — multipliziert mit 1000 wenn Flag gesetzt

---

## Kompatibilität

| | |
|---|---|
| Home Assistant | 2023.3 und neuer |
| Browser | Chrome, Firefox, Safari, Edge |
| Mobile | Vollständig responsive |
| Wechselrichter | Deye, Sungrow, Huawei, Fronius u.a. |

---

## Lizenz

MIT License — frei verwendbar, veränderbar und weitergabefähig.
