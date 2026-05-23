(function () {
  "use strict";

  const translations = {
    de: {
      missing_entities:  "Einige Sensoren sind nicht verfügbar",
      solar:             "Solar",
      battery_charge:    "Akku laden",
      battery_discharge: "Akku entladen",
      grid_buy:          "Netz Bezug",
      loading:           "Lade Historie …",
      connecting:        "Verbinde …",
      energy_now:        "Energie jetzt",
      total:             "Gesamt",
      minmax:            "Min / Max",
      minmax_max:        "Max",
      minmax_min:        "Min",
      // Editor
      e_title:           "Titel",
      e_sensors:         "Sensoren (Entity IDs)",
      e_kw_hint:         "'kW' aktivieren wenn Sensor in Kilowatt liefert",
      e_pv:              "☀ PV-Leistung",
      e_battery:         "🔋 Akku-Leistung",
      e_grid:            "⚡ Netz-Leistung",
      e_load:            "🏠 Hausverbrauch",
      e_options:         "Optionen",
      e_layout:          "Layout",
      e_layout_h:        "Horizontal (Zeit → links nach rechts)",
      e_layout_v:        "Vertikal (Zeit ↑ unten nach oben)",
      e_invert:          "Batterie-Vorzeichen invertieren (für nicht-Deye Wechselrichter)",
      e_time:            "Zeiteinstellungen",
      e_window:          "Zeitfenster (h)",
      e_slot:            "Slot-Dauer (min)",
      e_tick:            "Stundenmarker-Intervall (min)",
      e_tick_h:          "Stundenmarker-Ausdehnung (%)",
      e_tick_w:          "Stundenmarker-Stärke (px)",
      e_tooltip:         "Tooltip-Anzeigedauer (s)",
      e_tooltip_min_w:   "Tooltip Mindestwert (W)",
      e_display:         "Anzeige",
      e_height:          "Karten-Höhe (px)",
      e_minscale:        "Minimal-Skala (W)",
      e_headroom:        "Headroom (%)",
      e_livebar:         "Live-Block Größe (px)",
      e_overlay_scale:   "Vollbild Schrift-Faktor",
      e_colors:          "Farben",
      e_color_solar:     "☀ Solar",
      e_color_charge:    "🔋 Akku Laden",
      e_color_discharge: "🔋 Akku Entladen",
      e_color_grid:      "⚡ Netz Bezug",
    },
    en: {
      missing_entities:  "Some sensors are not available",
      solar:             "Solar",
      battery_charge:    "Battery charging",
      battery_discharge: "Battery discharging",
      grid_buy:          "Grid import",
      loading:           "Loading history …",
      connecting:        "Connecting …",
      energy_now:        "Energy now",
      total:             "Total",
      minmax:            "Min / Max",
      minmax_max:        "Max",
      minmax_min:        "Min",
      // Editor
      e_title:           "Title",
      e_sensors:         "Sensors (Entity IDs)",
      e_kw_hint:         "Check 'kW' if sensor provides values in kilowatts",
      e_pv:              "☀ PV Power",
      e_battery:         "🔋 Battery Power",
      e_grid:            "⚡ Grid Power",
      e_load:            "🏠 House Load",
      e_options:         "Options",
      e_layout:          "Layout",
      e_layout_h:        "Horizontal (time → left to right)",
      e_layout_v:        "Vertical (time ↑ bottom to top)",
      e_invert:          "Invert battery sign (e.g. for non-Deye inverters)",
      e_time:            "Time Settings",
      e_window:          "Time Window (h)",
      e_slot:            "Slot Duration (min)",
      e_tick:            "Tick Interval (min)",
      e_tick_h:          "Tick Height (%)",
      e_tick_w:          "Tick Width (px)",
      e_tooltip:         "Tooltip Timeout (s)",
      e_tooltip_min_w:   "Tooltip Min Value (W)",
      e_display:         "Display",
      e_height:          "Card Height (px)",
      e_minscale:        "Min Scale (W)",
      e_headroom:        "Headroom (%)",
      e_livebar:         "Live Bar Size (px)",
      e_overlay_scale:   "Fullscreen Font Scale",
      e_colors:          "Colors",
      e_color_solar:     "☀ Solar",
      e_color_charge:    "🔋 Battery Charging",
      e_color_discharge: "🔋 Battery Discharging",
      e_color_grid:      "⚡ Grid Import",
    },
  };
  function tr(lang, key) {
    return (translations[lang] || translations.en)[key] || key;
  }

  function toHex(val, fallback) {
    if (!val) return fallback;
    if (typeof val === "string") return val.startsWith("#") ? val : fallback;
    if (Array.isArray(val) && val.length >= 3)
      return "#" + val.slice(0,3).map(v => Math.round(v).toString(16).padStart(2,"0")).join("");
    return fallback;
  }

  function toW(val, isKw) { return isKw ? val * 1000 : val; }

  function calcMix(load_w, bat_power_w, grid_w, invert_battery) {
    const bat = invert_battery ? -bat_power_w : bat_power_w;
    const batt_discharge = Math.max(0,  bat);
    const batt_charge    = Math.max(0, -bat);
    const grid_buy       = Math.max(0, grid_w);
    const solar_to_house = Math.max(0, load_w - batt_discharge - grid_buy);
    return { solar_to_house, batt_charge, batt_discharge, grid_buy };
  }

  class SlotBuffer {
    constructor(slotCount) {
      this.slots    = [];
      this.maxSlots = slotCount;
      this._accum   = { solar:0, charge:0, discharge:0, grid:0, count:0 };
    }
    sample(mix) {
      this._accum.solar     += mix.solar_to_house;
      this._accum.charge    += mix.batt_charge;
      this._accum.discharge += mix.batt_discharge;
      this._accum.grid      += mix.grid_buy;
      this._accum.count++;
    }
    commit() {
      if (this._accum.count === 0) return;
      this._push({
        solar_to_house: this._accum.solar     / this._accum.count,
        batt_charge:    this._accum.charge    / this._accum.count,
        batt_discharge: this._accum.discharge / this._accum.count,
        grid_buy:       this._accum.grid      / this._accum.count,
      });
      this._accum = { solar:0, charge:0, discharge:0, grid:0, count:0 };
    }
    _push(slot) {
      this.slots.push(slot);
      if (this.slots.length > this.maxSlots) this.slots.shift();
    }
  }

  function computeMaxScale(slots, liveMix, minScale, headroomPct) {
    let peak = 0;
    for (const s of slots) {
      peak = Math.max(peak, s.solar_to_house + s.batt_charge, s.batt_discharge + s.grid_buy);
    }
    peak = Math.max(peak,
      liveMix.solar_to_house + liveMix.batt_charge,
      liveMix.batt_discharge + liveMix.grid_buy
    );
    return Math.max(Math.ceil((peak * (1 + headroomPct / 100)) / 500) * 500, minScale);
  }

  // SVG-Helfer
  function svgRect(x, y, w, h, fill, opacity, rx) {
    if (h <= 0 || w <= 0) return "";
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0,h).toFixed(1)}" fill="${fill}" opacity="${opacity}" rx="${rx}" ry="${rx}"/>`;
  }
  function svgLine(x1, y1, x2, y2, stroke, opacity, width) {
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;
  }
  function mkIdRect(id, x, y, w, h, fill) {
    return `<rect id="${id}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0,h).toFixed(1)}" fill="${fill}" opacity="1" rx="3" ry="3"/>`;
  }

  // ============================================================
  // EnergyWaterfallCard
  // ============================================================
  class EnergyWaterfallCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config         = null;
      this._hassRef        = null;
      this._lang           = "de";
      this._slotBuffer     = null;
      this._liveMix        = { solar_to_house:0, batt_charge:0, batt_discharge:0, grid_buy:0 };
      this._maxScale       = 5000;
      this._historyLoaded  = false;
      this._loadingHistory = false;
      this._lastCommitTime = null;
      this._liveTimer      = null;
      this._resizeObserver = null;
      this._cardWidth      = 600;
      this._hoveredSlot    = null;
      this._tooltipTimer   = null;
      this._pendingRender  = false;
      this._resizeTimer    = null;
      this._renderAfterTooltip = null;
      this._checkState     = { missing:[], allGood:true };
    }

    set hass(hass) {
      const firstSet = !this._hassRef;
      this._hassRef  = hass;
      this._lang     = hass?.language || "de";
      if (hass && this._config && !this._historyLoaded && !this._loadingHistory) {
        this._loadingHistory = true;
        this._loadHistory();
        return;
      }
      this._updateCheckState();
      if (firstSet) this._render();
    }
    get hass() { return this._hassRef; }

    setConfig(config) {
      if (!config.entities)               throw new Error("energy-waterfall-card: entities required");
      if (!config.entities.pv_power)      throw new Error("pv_power required");
      if (!config.entities.battery_power) throw new Error("battery_power required");
      if (!config.entities.grid_power)    throw new Error("grid_power required");
      if (!config.entities.load_power)    throw new Error("load_power required");

      const defC = { solar:"#FFD400", battery_charge:"#00C853", battery_discharge:"#118522", grid:"#FF3B30" };
      const raw  = config.colors || {};

      const needsReload =
        this._config &&
        (this._config.time_window_h     !== (config.time_window_h     ?? 10)   ||
         this._config.slot_duration_min !== (config.slot_duration_min ?? 4)    ||
         this._config.invert_battery    !== (config.invert_battery    ?? false) ||
         JSON.stringify(this._config.entities) !== JSON.stringify(config.entities) ||
         JSON.stringify(this._config.entities_kw) !== JSON.stringify(config.entities_kw));

      this._config = {
        title:               "Energie-Verlauf",
        layout:              "horizontal",  // "horizontal" | "vertical"
        time_window_h:       10,
        slot_duration_min:   4,
        tick_interval_min:   60,
        tick_height_pct:     80,
        tick_width_px:       1,
        tooltip_timeout_s:   5,
        live_bar_size:       15,
        overlay_scale:       1.4,
        tooltip_min_w:       5,
        min_scale_w:         5000,
        headroom_pct:        15,
        height:              200,
        invert_battery:      false,
        ...config,
        entities_kw: { pv_power:false, battery_power:false, grid_power:false, load_power:false, ...(config.entities_kw||{}) },
        colors: {
          solar:             toHex(raw.solar,             defC.solar),
          battery_charge:    toHex(raw.battery_charge,    defC.battery_charge),
          battery_discharge: toHex(raw.battery_discharge, defC.battery_discharge),
          grid:              toHex(raw.grid,              defC.grid),
        },
      };

      if (needsReload) {
        this._historyLoaded  = false;
        this._loadingHistory = false;
        this._slotBuffer     = null;
      }

      this._updateCheckState();
      this._render();
    }

    getCardSize() {
      if (!this._config) return 3;
      // Dynamische Kartengröße basierend auf height-Config
      return Math.ceil((this._config.height || 200) / 50) + 1;
    }

    // HA resize support: called by HA when card size changes
    setCardSize(width, height) {
      if (width > 0 && width !== this._cardWidth) {
        this._cardWidth = width;
        if (this._resizeTimer) clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
          this._resizeTimer = null;
          this._render();
        }, 150);
      }
    }
    static getConfigElement() { return document.createElement("energy-waterfall-card-editor"); }
    static getStubConfig() {
      return {
        type: "custom:energy-waterfall-card",
        title: "Energie-Verlauf",
        entities: { pv_power:"", battery_power:"", grid_power:"", load_power:"" },
        time_window_h: 10, slot_duration_min: 4,
      };
    }

    connectedCallback() {
      this._startLiveTimer();
      this._resizeObserver = new ResizeObserver(entries => {
        for (const e of entries) {
          if (e.contentRect.width > 0 && e.contentRect.width !== this._cardWidth) {
            this._cardWidth = e.contentRect.width;
            // Debounce: render only after resize has stopped for 150ms
            if (this._resizeTimer) clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => {
              this._resizeTimer = null;
              this._render();
            }, 150);
          }
        }
      });
      this._resizeObserver.observe(this);
      const rect = this.getBoundingClientRect();
      if (rect.width > 0) this._cardWidth = rect.width;
      this._render();
    }

    disconnectedCallback() {
      this._stopLiveTimer();
      if (this._tooltipTimer)      clearTimeout(this._tooltipTimer);
      if (this._resizeTimer)        clearTimeout(this._resizeTimer);
      if (this._renderAfterTooltip) clearTimeout(this._renderAfterTooltip);
      if (this._resizeObserver)    { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    }

    _updateCheckState() {
      if (!this._hassRef || !this._config) { this._checkState = { missing:[], allGood:true }; return; }
      const missing = [];
      for (const [k, id] of Object.entries(this._config.entities)) {
        if (!this._hassRef.states[id]) missing.push(k);
      }
      this._checkState = { missing, allGood: missing.length === 0 };
    }

    async _loadHistory() {
      if (!this._hassRef || !this._config) { this._loadingHistory = false; return; }
      const { time_window_h, slot_duration_min, entities, invert_battery } = this._config;
      const slotCount  = Math.floor(time_window_h * 60 / slot_duration_min);
      this._slotBuffer = new SlotBuffer(slotCount);

      const endTime   = new Date();
      const startTime = new Date(endTime.getTime() - time_window_h * 3600 * 1000);

      try {
        const history = await this._hassRef.callWS({
          type:       "history/history_during_period",
          start_time: startTime.toISOString(),
          end_time:   endTime.toISOString(),
          entity_ids: [entities.pv_power, entities.battery_power, entities.grid_power, entities.load_power],
          minimal_response: true,
        });

        if (!history || typeof history !== "object") {
          console.warn("[energy-waterfall-card] unexpected history format", history);
        } else {
          const slotMs = slot_duration_min * 60 * 1000;
          const acc = Array.from({ length: slotCount }, () =>
            ({ pvS:0,pvC:0, batS:0,batC:0, gridS:0,gridC:0, loadS:0,loadC:0 })
          );

          let entries = {};
          if (Array.isArray(history)) {
            for (const series of history) {
              if (series.entity_id && Array.isArray(series.state_history)) {
                entries[series.entity_id] = series.state_history.map(p => ({
                  s:  p.state,
                  lu: new Date(p.last_changed || p.last_updated).getTime() / 1000,
                }));
              }
            }
          } else {
            entries = history;
          }

          for (const [entityId, points] of Object.entries(entries)) {
            if (!Array.isArray(points)) continue;
            for (const point of points) {
              let ts = point.lu ?? point.lc ?? point.last_changed ?? point.last_updated;
              if (ts === undefined || ts === null) continue;
              const ms  = ts < 1e10 ? ts * 1000 : ts;
              const idx = Math.floor((ms - startTime.getTime()) / slotMs);
              if (idx < 0 || idx >= slotCount) continue;
              const rawVal = parseFloat(point.s ?? point.state);
              if (isNaN(rawVal)) continue;
              const ekw = this._config.entities_kw || {};
              const a = acc[idx];
              if      (entityId === entities.pv_power)      { a.pvS   += toW(rawVal, ekw.pv_power);      a.pvC++;   }
              else if (entityId === entities.battery_power) { a.batS  += toW(rawVal, ekw.battery_power);  a.batC++;  }
              else if (entityId === entities.grid_power)    { a.gridS += toW(rawVal, ekw.grid_power);     a.gridC++; }
              else if (entityId === entities.load_power)    { a.loadS += toW(rawVal, ekw.load_power);     a.loadC++; }
            }
          }

          const computed = acc.map(a => {
            if (a.pvC && a.batC && a.gridC && a.loadC)
              return calcMix(a.loadS/a.loadC, a.batS/a.batC, a.gridS/a.gridC, invert_battery);
            return null;
          });

          // Forward-fill
          let lastGood = null;
          for (let i = 0; i < computed.length; i++) {
            if (computed[i] !== null) { lastGood = computed[i]; }
            else if (lastGood)        { computed[i] = { ...lastGood }; }
          }
          // Backward-fill
          let firstGood = null;
          for (let i = computed.length - 1; i >= 0; i--) {
            if (computed[i] !== null) { firstGood = computed[i]; }
            else if (firstGood)       { computed[i] = { ...firstGood }; }
          }

          for (const slot of computed) {
            if (slot) this._slotBuffer._push(slot);
          }
        }
      } catch (err) {
        console.error("[energy-waterfall-card] History load failed:", err);
      }

      this._historyLoaded  = true;
      this._loadingHistory = false;
      this._lastCommitTime = Date.now();
      this._updateMaxScale();
      this._render();
    }

    _startLiveTimer() {
      this._stopLiveTimer();
      this._liveTimer = setInterval(() => this._tick(), 1000);
    }
    _stopLiveTimer() {
      if (this._liveTimer) { clearInterval(this._liveTimer); this._liveTimer = null; }
    }

    _tick() {
      if (!this._hassRef || !this._config) return;
      const { entities, invert_battery, entities_kw } = this._config;
      const ekw  = entities_kw || {};
      const pv   = toW(parseFloat(this._hassRef.states[entities.pv_power]?.state),      ekw.pv_power);
      const bat  = toW(parseFloat(this._hassRef.states[entities.battery_power]?.state), ekw.battery_power);
      const grid = toW(parseFloat(this._hassRef.states[entities.grid_power]?.state),    ekw.grid_power);
      const load = toW(parseFloat(this._hassRef.states[entities.load_power]?.state),    ekw.load_power);
      if (isNaN(pv) || isNaN(bat) || isNaN(grid) || isNaN(load)) return;

      const mix  = calcMix(load, bat, grid, invert_battery);
      const prev = this._liveMix;
      const changed =
        mix.solar_to_house !== prev.solar_to_house ||
        mix.batt_charge    !== prev.batt_charge    ||
        mix.batt_discharge !== prev.batt_discharge ||
        mix.grid_buy       !== prev.grid_buy;

      this._liveMix = mix;
      if (this._slotBuffer) this._slotBuffer.sample(mix);

      const slotMs = this._config.slot_duration_min * 60 * 1000;
      let slotCommitted = false;
      if (this._lastCommitTime && (Date.now() - this._lastCommitTime) >= slotMs) {
        if (this._slotBuffer) this._slotBuffer.commit();
        this._lastCommitTime = Date.now();
        slotCommitted = true;
      }
      this._updateMaxScale();

      if (slotCommitted) {
        if (!this._pendingRender) {
          this._pendingRender = true;
          requestAnimationFrame(() => {
            this._pendingRender = false;
            const tip = this.shadowRoot && this.shadowRoot.getElementById("tip");
            if (tip && tip.style.display === "block") {
              if (this._renderAfterTooltip) clearTimeout(this._renderAfterTooltip);
              this._renderAfterTooltip = setTimeout(() => this._render(), 2000);
            } else {
              this._render();
            }
          });
        }
      } else if (changed) {
        this._updateLiveBar();
      }
    }

    _updateMaxScale() {
      if (!this._slotBuffer || !this._config) return;
      this._maxScale = computeMaxScale(
        this._slotBuffer.slots, this._liveMix,
        this._config.min_scale_w, this._config.headroom_pct
      );
    }

    // ── Live bar targeted update (no DOM rebuild) ───────────────────────────
    _updateLiveBar() {
      const svg = this.shadowRoot.getElementById("svg");
      if (!svg) return;
      const cfg  = this._config;
      const live = this._liveMix;
      const isV  = cfg.layout === "vertical";

      if (isV) {
        // Vertical: live bar is a horizontal strip at the very top
        const lbs   = cfg.live_bar_size || 15;             // configurable live strip height
        const labW  = 52;                                   // Space for time labels on the rightrechts
        const cardW = Math.max(200, this._cardWidth - labW - 32); // -32 for card padding
        const halfX = cardW / 2;                            // FIX: echte Kartenmitte
        const pxW   = halfX / this._maxScale;

        const lSW  = live.solar_to_house * pxW;
        const lBcW = live.batt_charge    * pxW;
        const lBdW = live.batt_discharge * pxW;
        const lGbW = live.grid_buy       * pxW;
        const leftW  = lSW + lBcW;
        const rightW = lBdW + lGbW;
        const lY = 2;

        const setR = (id, x, y, w, h) => {
          const el = svg.querySelector("#" + id);
          if (!el) return;
          el.setAttribute("x",      x.toFixed(1));
          el.setAttribute("y",      y.toFixed(1));
          el.setAttribute("width",  Math.max(0,w).toFixed(1));
          el.setAttribute("height", Math.max(0,h).toFixed(1));
        };
        setR("lb0", halfX - leftW,  lY, lBcW, lbs);
        setR("lb1", halfX - lSW,    lY, lSW,  lbs);
        setR("lb2", halfX,          lY, lBdW, lbs);
        setR("lb3", halfX + lBdW,   lY, lGbW, lbs);

        const frame = svg.querySelector("#lb4");
        if (frame) {
          frame.setAttribute("x",      (halfX - leftW - 2).toFixed(1));
          frame.setAttribute("width",  Math.max(0, leftW + rightW + 4).toFixed(1));
          frame.setAttribute("display", leftW + rightW > 0 ? "" : "none");
        }
      } else {
        // Horizontal (original)
        const lbs  = cfg.live_bar_size || 15;
        const lbW  = lbs + 24;                             // Total width of live area
        const lPad = 30;
        const wfW  = Math.max(200, this._cardWidth - lbW - lPad - 32);
        const half = cfg.height / 2;
        const pxW  = half / this._maxScale;
        const lX   = lPad + wfW + (lbW - lbs) / 2;

        const lBcH = live.batt_charge    * pxW;
        const lSH  = live.solar_to_house * pxW;
        const lBdH = live.batt_discharge * pxW;
        const lGbH = live.grid_buy       * pxW;
        const topH = lBcH + lSH;
        const botH = lBdH + lGbH;

        const setR = (id, x, y, w, h) => {
          const el = svg.querySelector("#" + id);
          if (!el) return;
          el.setAttribute("x",      x.toFixed(1));
          el.setAttribute("y",      y.toFixed(1));
          el.setAttribute("width",  w.toFixed(1));
          el.setAttribute("height", Math.max(0, h).toFixed(1));
        };
        setR("lb0", lX, half - topH,  lbs, lBcH);
        setR("lb1", lX, half - lSH,   lbs, lSH);
        setR("lb2", lX, half,          lbs, lBdH);
        setR("lb3", lX, half + lBdH,   lbs, lGbH);

        const frame = svg.querySelector("#lb4");
        if (frame) {
          frame.setAttribute("y",       (half - topH - 2).toFixed(1));
          frame.setAttribute("height",  Math.max(0, topH + botH + 4).toFixed(1));
          frame.setAttribute("display", topH + botH > 0 ? "" : "none");
        }
      }
    }

    _formatTime(date) {
      return date.toLocaleTimeString(this._lang === "de" ? "de-DE" : "en-US", { hour:"2-digit", minute:"2-digit" });
    }

    // ── Vollständiges Re-Render ─────────────────────────────────────────────
    _render() {
      if (!this._config) return;
      const shadow  = this.shadowRoot;
      const cfg     = this._config;
      const C       = cfg.colors;
      const lang    = this._lang;
      const slots   = this._slotBuffer ? this._slotBuffer.slots : [];
      const live    = this._liveMix;
      const scale   = this._maxScale;
      const loading = !this._hassRef || this._loadingHistory;
      const isV     = cfg.layout === "vertical";

      const expandBtn = `<div class="expand-btn" id="ewf-expand" title="Vollbild">⤢</div>`;
      const body = loading
        ? this._renderLoading(cfg)
        : isV
          ? this._renderVertical(cfg, C, lang, slots, live, scale)
          : this._renderHorizontal(cfg, C, lang, slots, live, scale);

      const warn = !this._checkState.allGood
        ? `<div class="warning">⚠ ${tr(lang,"missing_entities")}: ${this._checkState.missing.join(", ")}</div>`
        : "";

      shadow.innerHTML = `
        <style>${this._css(cfg, loading)}</style>
        <div class="card">
          ${cfg.title ? `<div class="title">${cfg.title}</div>` : ""}
          ${!loading ? expandBtn : ""}
          ${warn}
          ${body}
        </div>`;

      if (!loading && slots.length > 0) {
        isV
          ? this._attachEventsV(slots, cfg, C)
          : this._attachEventsH(slots, cfg, C);
      }
      if (!loading && slots.length > 0) {
        // Min/Max trigger in legend
        const mmTrigger = shadow.querySelector(".ewf-minmax-trigger");
        const tip2      = shadow.getElementById("tip");
        if (mmTrigger && tip2) {
          const toMs2 = (cfg.tooltip_timeout_s ?? 5) * 1000;
          const hide2 = () => {
            tip2.style.display = "none";
            const svgEl = shadow.getElementById("svg");
            if (svgEl) this._hideMinMaxMarkers(svgEl);
          };
          // Pre-calculate dims for marker positioning
          const svgEl  = shadow.getElementById("svg");
          const isVV   = cfg.layout === "vertical";
          const lbsX   = cfg.live_bar_size || 15;
          const lbWX   = lbsX + 24;
          const lPadX  = 30;
          const wfWX   = Math.max(200, this._cardWidth - lbWX - lPadX - 32);
          const labWX  = 52;
          const cardWX = Math.max(200, this._cardWidth - labWX - 32);
          const halfXX = cardWX / 2;
          const halfH  = cfg.height / 2;
          const scaleX = this._maxScale;
          const nX     = slots.length;
          const dims   = isVV ? {
            slotH: cfg.height / Math.max(1, nX), halfX: halfXX,
            pxW: halfXX / scaleX, offsetY: (cfg.live_bar_size||15) + 8,
            n: nX, isV: true,
          } : {
            slotW: wfWX / Math.max(1, nX), half: halfH,
            pxW: halfH / scaleX, lPad: lPadX, n: nX, isV: false,
          };
          mmTrigger.addEventListener("mouseenter", (e) => {
            if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
            this._showMinMaxTooltip(tip2, slots, cfg, e.clientX, e.clientY, svgEl, isVV, dims);
          });
          mmTrigger.addEventListener("mousemove", (e) => {
            tip2.style.left = Math.min(e.clientX + 14, window.innerWidth - 215) + "px";
            tip2.style.top  = Math.max(8, e.clientY - 120) + "px";
          });
          mmTrigger.addEventListener("mouseleave", () => {
            if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
            this._tooltipTimer = setTimeout(hide2, toMs2);
          });
        }
      }
      if (!loading) {
        const expandEl = shadow.getElementById("ewf-expand");
        if (expandEl) {
          expandEl.addEventListener("click", (e) => {
            e.stopPropagation();
            this._openOverlay();
          });
        }
      }
    }

    _css(cfg, loading) {
      return `
        :host { display:block; }
        .card {
          padding:16px;
          background:var(--ha-card-background,var(--card-background-color,#fff));
          border-radius:var(--ha-card-border-radius,12px);
          position:relative; box-sizing:border-box;
          font-family:var(--primary-font-family,sans-serif);
        }
        .title   { font-size:16px; font-weight:600; margin-bottom:8px; color:var(--primary-text-color,#333); }
        .warning { color:var(--error-color,#f44); font-size:12px; margin-bottom:8px; padding:4px 8px; background:rgba(255,152,0,.1); border-radius:4px; }
        .loading { height:${cfg.height}px; display:flex; align-items:center; justify-content:center; color:var(--secondary-text-color,#888); font-size:13px; opacity:.7; }
        svg { display:block; overflow:visible; cursor:crosshair; }
        .tooltip {
          position:fixed; display:none;
          background:var(--card-background-color,rgba(24,24,24,.95));
          color:var(--primary-text-color,#fff);
          padding:8px 12px; border-radius:8px;
          font-size:11px; pointer-events:none; z-index:9999;
          box-shadow:0 2px 12px rgba(0,0,0,.35);
          white-space:nowrap; line-height:1.7;
          border:1px solid rgba(255,255,255,.45);
          box-shadow:0 4px 16px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.3);
        }
        .legend {
          display:flex; gap:12px; flex-wrap:wrap;
          margin-top:6px; font-size:11px;
          color:var(--secondary-text-color,#888);
        }
        .legend-item { display:flex; align-items:center; gap:4px; }
        .legend-dot  { width:10px; height:10px; border-radius:2px; flex-shrink:0; }
        .expand-btn {
          position:absolute; top:12px; right:12px;
          width:28px; height:28px;
          background:var(--secondary-background-color,rgba(128,128,128,.15));
          border:1px solid var(--divider-color,rgba(128,128,128,.3));
          border-radius:6px; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          font-size:14px; color:var(--secondary-text-color,#888);
          opacity:0.7; transition:opacity .2s;
          user-select:none;
          z-index:10001;
        }
        .expand-btn:hover { opacity:1; }
        .ewf-overlay {
          position:fixed !important; inset:0 !important; z-index:999999 !important;
          background:rgba(0,0,0,.85);
          display:flex !important; align-items:center; justify-content:center;
          padding:20px; box-sizing:border-box;
          cursor:pointer;
        }
        .ewf-overlay-card {
          background:var(--ha-card-background,var(--card-background-color,#1c1c1e));
          border-radius:16px;
          padding:20px;
          box-shadow:0 8px 40px rgba(0,0,0,.6);
          cursor:default;
          max-width:100%; max-height:100%;
          overflow:auto;
          position:relative;
        }
        .ewf-close {
          position:absolute; top:12px; right:12px;
          width:32px; height:32px;
          background:rgba(128,128,128,.2);
          border:1px solid rgba(128,128,128,.3);
          border-radius:8px; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          font-size:18px; color:var(--primary-text-color,#fff);
          opacity:0.8;
        }
        .ewf-close:hover { opacity:1; background:rgba(128,128,128,.4); }
      `;
    }

    _legendHtml(C, lang) {
      return `
        <div class="legend">
          <div class="legend-item ewf-minmax-trigger" style="cursor:pointer;opacity:.75">
            <span style="font-size:13px">↑↓</span>
          </div>
          <div class="legend-item"><div class="legend-dot" style="background:${C.solar}"></div>${tr(lang,"solar")}</div>
          <div class="legend-item"><div class="legend-dot" style="background:${C.battery_charge}"></div>${tr(lang,"battery_charge")}</div>
          <div class="legend-item"><div class="legend-dot" style="background:${C.battery_discharge}"></div>${tr(lang,"battery_discharge")}</div>
          <div class="legend-item"><div class="legend-dot" style="background:${C.grid}"></div>${tr(lang,"grid_buy")}</div>
        </div>`;
    }

    _renderLoading(cfg) {
      return `<div class="loading">⏳ ${this._loadingHistory ? tr(this._lang,"loading") : tr(this._lang,"connecting")}</div>`;
    }

    // ── HORIZONTAL Layout ───────────────────────────────────────────────────
    _renderHorizontal(cfg, C, lang, slots, live, scale) {
      const height = cfg.height;
      const lbs    = cfg.live_bar_size || 15;
      const lbW    = lbs + 24;                             // 24px buffer around live bar
      const lPad   = 30;                                   // left space for kW labels
      const wfW    = Math.max(200, this._cardWidth - lbW - lPad - 32); // Chart width without labels+live+padding
      const totW   = lPad + wfW + lbW;                    // SVG total width
      const half   = height / 2;
      const pxW    = half / scale;

      const tickH   = cfg.tick_height_pct / 100;
      const tickTop = half - (height * tickH) / 2;
      const tickBot = half + (height * tickH) / 2;
      const tickW   = cfg.tick_width_px;

      let svg = "";

      // Grid lines – start at lPad
      for (const w of [500,1000,2500,5000]) {
        if (w > scale) break;
        svg += svgLine(lPad, half - w*pxW, lPad + wfW, half - w*pxW, "var(--primary-text-color,#888)", 0.07, 0.5);
        svg += svgLine(lPad, half + w*pxW, lPad + wfW, half + w*pxW, "var(--primary-text-color,#888)", 0.07, 0.5);
      }

      // Slots: index 0 = oldest = leftmost, offset lPad
      const n       = Math.max(1, slots.length);
      const slotW   = wfW / n;
      const slotGap = Math.max(0.5, slotW * 0.1);
      for (let i = 0; i < slots.length; i++) {
        const s   = slots[i];
        const x   = lPad + i * slotW;
        const w   = Math.max(1, slotW - slotGap);
        const rx  = Math.min(2, w / 2);
        const op  = this._hoveredSlot === i ? 1 : 0.85;
        const bcH = s.batt_charge    * pxW;
        const sH  = s.solar_to_house * pxW;
        const bdH = s.batt_discharge * pxW;
        const gbH = s.grid_buy       * pxW;
        svg += svgRect(x, half - bcH - sH, w, bcH, C.battery_charge,   op, rx);
        svg += svgRect(x, half - sH,       w, sH,  C.solar,            op, rx);
        svg += svgRect(x, half,            w, bdH, C.battery_discharge, op, rx);
        svg += svgRect(x, half + bdH,      w, gbH, C.grid,             op, rx);
      }

      // Horizontal time markers – adaptive interval to prevent label overlap
      const slotMs     = cfg.slot_duration_min * 60 * 1000;
      let   tickSlots  = Math.max(1, Math.floor(cfg.tick_interval_min * 60 * 1000 / slotMs));
      const minTickPx  = 18;  // Min distance per tick (2 staggered levels = can be tight)
      // Double interval only if really too tight
      while (slotW * tickSlots < minTickPx && tickSlots < slots.length) {
        tickSlots *= 2;
      }
      const startMs   = Date.now() - cfg.time_window_h * 3600 * 1000;
      let tickCount = 1;  // Start at 1 → first tick on lower level
      for (let i = 0; i < slots.length; i += tickSlots) {
        const x     = lPad + i * slotW + slotW / 2;
        const label = this._formatTime(new Date(startMs + i * slotMs + slotMs / 2));
        const yLbl  = tickCount % 2 === 0 ? height + 12 : height + (height > 280 ? 22 : 15) + 12;  // larger in overlay
        svg += svgLine(x, tickTop, x, tickBot, "var(--secondary-text-color,#aaa)", 0.5, tickW);
        svg += `<text x="${x.toFixed(1)}" y="${yLbl.toFixed(1)}" font-size="9" text-anchor="middle" fill="var(--secondary-text-color,#aaa)">${label}</text>`;
        tickCount++;
      }

      // Center and separator line
      svg += svgLine(lPad, half, totW, half, "var(--primary-text-color,#888)", 0.2, 1);
      svg += svgLine(lPad + wfW, 0, lPad + wfW, height, "var(--secondary-text-color,#aaa)", 0.35, 1);

      const lX  = lPad + wfW + (lbW - lbs) / 2;
      svg += `<text x="${(lX + lbs/2).toFixed(1)}" y="${(height+12).toFixed(1)}" font-size="9" text-anchor="middle" fill="var(--secondary-text-color,#aaa)">▶</text>`;


      // Live-Balken (horizontal, IDs lb0-lb4)
      const lBcH = live.batt_charge    * pxW;
      const lSH  = live.solar_to_house * pxW;
      const lBdH = live.batt_discharge * pxW;
      const lGbH = live.grid_buy       * pxW;
      const topH = lBcH + lSH;
      const botH = lBdH + lGbH;
      svg += mkIdRect("lb0", lX, half - topH,  lbs, lBcH, C.battery_charge);
      svg += mkIdRect("lb1", lX, half - lSH,   lbs, lSH,  C.solar);
      svg += mkIdRect("lb2", lX, half,          lbs, lBdH, C.battery_discharge);
      svg += mkIdRect("lb3", lX, half + lBdH,   lbs, lGbH, C.grid);
      svg += `<rect id="lb4" x="${(lX-2).toFixed(1)}" y="${(half-topH-2).toFixed(1)}"
        width="${(lbs+4).toFixed(1)}" height="${Math.max(0,topH+botH+4).toFixed(1)}"
        fill="none" stroke="var(--primary-text-color,#888)" stroke-opacity="0.3"
        stroke-width="1" rx="4" ry="4" display="${topH+botH>0?'':'none'}"/>`;

      // kW labels left – number without unit, "kW" only on outermost label
      const lblStep = scale <= 3000 ? 500 : scale <= 10000 ? 1000 : 2000;
      const minLblPy = 11;
      let lastYT = half, lastYB = half;  // start at center, move outward
      let maxWh = 0;
      const visWh = [];
      for (let w = lblStep; w <= scale; w += lblStep) {
        const yT = half - w*pxW + 3;
        // yT decreases (upward): lastYT - yT >= minLblPx
        if (lastYT - yT >= minLblPy) { visWh.push(w); lastYT = yT; maxWh = w; }
      }
      for (const w of visWh) {
        const num   = w >= 1000 ? (w/1000) : (w/1000).toFixed(1);
        const isLst = w === maxWh;
        const lbl   = isLst ? `${num}kW` : `${num}`;
        const yT    = half - w*pxW + 11;  // +11 instead of +3: spacing from top edge
        const yB    = half + w*pxW + 3;
        svg += `<text x="4" y="${yT.toFixed(1)}" font-size="9" fill="var(--secondary-text-color,#aaa)">${lbl}</text>`;
        svg += `<text x="4" y="${yB.toFixed(1)}" font-size="9" fill="var(--secondary-text-color,#aaa)">${lbl}</text>`;
      }

      // Hit rects (with lPad offset)
      for (let i = 0; i < slots.length; i++) {
        svg += `<rect class="hr" data-i="${i}" x="${(lPad + i*slotW).toFixed(1)}" y="0" width="${slotW.toFixed(1)}" height="${height}" fill="transparent"/>`;
      }

      return `<svg id="svg" width="${totW}" height="${height + (height > 280 ? 36 : 30)}" style="overflow:visible">${svg}</svg>
              <div class="tooltip" id="tip"></div>
              ${this._legendHtml(C, lang)}`;
    }

    // ── VERTICAL Layout ─────────────────────────────────────────────────────
    // 90° gegen Uhrzeigersinn:
    //   Time axis:   bottom = old (slots[0]), top = new (slots[last]) + live strip at the very top
    //   Energy:      left = Solar + Battery charging  |  right = Discharging + Grid
    //   Center:       vertical line through halfX
    _renderVertical(cfg, C, lang, slots, live, scale) {
      const lbs    = cfg.live_bar_size || 15;              // configurable live strip height
      const labW   = 52;                                   // Width for time labels on the right
      const cardW  = Math.max(200, this._cardWidth - labW - 32); // -32 for card padding
      const lbH    = lbs + 4;                              // Live strip height (2px Puffer zur Trennlinie)
      const wfW    = cardW;                                 // History uses full chart width
      const halfX  = cardW / 2;                            // Center of chart = cardW/2
      const pxW    = halfX / scale;                        // Pixel pro Watt

      const n       = Math.max(1, slots.length);
      const slotH   = cfg.height / n;                      // Height per time slot
      const slotGap = Math.max(0.3, slotH * 0.08);
      const wfH     = cfg.height;                          // Total history height
      const offsetY = lbH + 4;                             // History starts after live strip
      const totH    = offsetY + wfH + 40;                  // SVG total height (+kW labels at bottom)

      const tickW2   = cfg.tick_height_pct / 100;          // Time marker extension (as fraction of widite)
      const tickLeft  = halfX - (wfW * tickW2) / 2;
      const tickRight = halfX + (wfW * tickW2) / 2;
      const tickStroke = cfg.tick_width_px;

      const slotMs    = cfg.slot_duration_min * 60 * 1000;
      const tickSlots = Math.max(1, Math.floor(cfg.tick_interval_min * 60 * 1000 / slotMs));
      const startMs   = Date.now() - cfg.time_window_h * 3600 * 1000;

      let svg = "";

      // Grid lines (vertical lines at kW values)
      for (const w of [500,1000,2500,5000]) {
        if (w > scale) break;
        const xL = halfX - w * pxW;
        const xR = halfX + w * pxW;
        svg += svgLine(xL, offsetY, xL, offsetY + wfH, "var(--primary-text-color,#888)", 0.07, 0.5);
        svg += svgLine(xR, offsetY, xR, offsetY + wfH, "var(--primary-text-color,#888)", 0.07, 0.5);
      }

      // Slots:
      // slots[0] = oldest → very bottom → y = offsetY + wfH - slotH
      // slots[last] = newest → very top → y = offsetY
      for (let i = 0; i < slots.length; i++) {
        const s  = slots[i];
        // i=0 → bottom, i=last → top: y decreases as i increases
        const y  = offsetY + (n - 1 - i) * slotH;
        const h  = Math.max(1, slotH - slotGap);
        const ry = Math.min(2, h / 2);
        const op = this._hoveredSlot === i ? 1 : 0.85;

        const sW  = s.solar_to_house * pxW;
        const bcW = s.batt_charge    * pxW;
        const bdW = s.batt_discharge * pxW;
        const gbW = s.grid_buy       * pxW;

        // Left of center: solar (inner) + batt_charge (outer)
        svg += svgRect(halfX - sW - bcW, y, bcW, h, C.battery_charge,   op, ry);
        svg += svgRect(halfX - sW,       y, sW,  h, C.solar,            op, ry);
        // Right of center: batt_discharge (inner) + grid (outer)
        svg += svgRect(halfX,            y, bdW, h, C.battery_discharge, op, ry);
        svg += svgRect(halfX + bdW,      y, gbW, h, C.grid,             op, ry);
      }

      // Vertical time markers – fixed 2h, double if too tight
      const minTickPxV = 20;
      let tickSlotsV = Math.max(1, Math.floor(120 * 60 * 1000 / slotMs)); // 2h fix
      while (slotH * tickSlotsV < minTickPxV && tickSlotsV < slots.length) {
        tickSlotsV *= 2;
      }
      for (let i = 0; i < slots.length; i += tickSlotsV) {
        const y     = offsetY + (n - 1 - i) * slotH + slotH / 2;
        const label = this._formatTime(new Date(startMs + i * slotMs + slotMs / 2));
        const xLbl  = wfW + 4;  // vertical: no stagger needed
        svg += svgLine(tickLeft, y, tickRight, y, "var(--secondary-text-color,#aaa)", 0.5, tickStroke);
        svg += `<text x="${xLbl.toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="9"
          text-anchor="start" fill="var(--secondary-text-color,#aaa)">${label}</text>`;
      }

      // Vertical center line: goes through live strip AND history
      svg += svgLine(halfX, -8, halfX, offsetY + wfH, "var(--primary-text-color,#888)", 0.2, 1);
      // Separator line live/history: full width including label area
      svg += svgLine(0, offsetY, cardW, offsetY, "var(--secondary-text-color,#aaa)", 0.35, 1);

      // "Now" label on the right
      svg += `<text x="${(wfW + 2).toFixed(1)}" y="${(lbH/2 + 4).toFixed(1)}" font-size="9"
        text-anchor="start" fill="var(--secondary-text-color,#aaa)">▲</text>`;

      // Live strip (at the very top, IDs lb0-lb4)
      // Left: solar (inner) + batt_charge (outer)
      // Right: batt_discharge (inner) + grid (outer)
      const lSW  = live.solar_to_house * pxW;
      const lBcW = live.batt_charge    * pxW;
      const lBdW = live.batt_discharge * pxW;
      const lGbW = live.grid_buy       * pxW;
      const leftW  = lSW + lBcW;
      const rightW = lBdW + lGbW;
      const lY = 2;
      const lH = lbs;                                      // Live strip height = live_bar_size (exact)

      svg += mkIdRect("lb0", halfX - leftW,  lY, lBcW, lH, C.battery_charge);
      svg += mkIdRect("lb1", halfX - lSW,    lY, lSW,  lH, C.solar);
      svg += mkIdRect("lb2", halfX,          lY, lBdW, lH, C.battery_discharge);
      svg += mkIdRect("lb3", halfX + lBdW,   lY, lGbW, lH, C.grid);
      svg += `<rect id="lb4" x="${(halfX - leftW - 2).toFixed(1)}" y="${(lY-2).toFixed(1)}"
        width="${Math.max(0, leftW + rightW + 4).toFixed(1)}" height="${(lH+4).toFixed(1)}"
        fill="none" stroke="var(--primary-text-color,#888)" stroke-opacity="0.3"
        stroke-width="1" rx="4" ry="4" display="${leftW+rightW>0?'':'none'}"/>`;

      // kW labels (bottom) – number without unit, "kW" only on outermost label
      const lblStep  = scale <= 3000 ? 500 : scale <= 10000 ? 1000 : 2000;
      const minLblPx = 14;
      const lblY     = (offsetY + wfH + 26).toFixed(1);  // below time labels
      let lastXL = halfX, lastXR = halfX;  // start at center, move outward
      let maxW = 0;
      // first collect all visible w values
      const visW = [];
      for (let w = lblStep; w <= scale; w += lblStep) {
        const xL = halfX - w * pxW;
        const xR = halfX + w * pxW;
        // xL decreases (leftward): check sufficient distance to last label
        if (lastXL - xL >= minLblPx) { visW.push(w); lastXL = xL; lastXR = xR; maxW = w; }
      }
      // draw: numbers without unit, only append "kW" on outermost label
      for (const w of visW) {
        const num  = w >= 1000 ? (w/1000) : (w/1000).toFixed(1);
        const isLast = w === maxW;
        const lbl  = isLast ? `${num} kW` : `${num}`;
        const xL   = halfX - w * pxW;
        const xR   = halfX + w * pxW;
        // xL+6: slightly inward so label doesn't stick to edge
        svg += `<text x="${(xL+6).toFixed(1)}" y="${lblY}" font-size="9" text-anchor="middle" fill="var(--secondary-text-color,#aaa)">${lbl}</text>`;
        svg += `<text x="${(xR-6).toFixed(1)}" y="${lblY}" font-size="9" text-anchor="middle" fill="var(--secondary-text-color,#aaa)">${lbl}</text>`;
      }

      // Hit rects (invisible, for hover)
      for (let i = 0; i < slots.length; i++) {
        const y = offsetY + (n - 1 - i) * slotH;
        svg += `<rect class="hr" data-i="${i}" x="0" y="${y.toFixed(1)}" width="${wfW.toFixed(1)}" height="${slotH.toFixed(1)}" fill="transparent"/>`;
      }

      return `<svg id="svg" width="${(cardW + labW).toFixed(1)}" height="${totH}" style="overflow:visible">${svg}</svg>
              <div class="tooltip" id="tip"></div>
              ${this._legendHtml(C, lang)}`;
    }

    // ── Event-Handler HORIZONTAL ────────────────────────────────────────────
    _attachEventsH(slots, cfg, C) {
      const svg = this.shadowRoot.getElementById("svg");
      const tip = this.shadowRoot.getElementById("tip");
      if (!svg || !tip) return;

      const lbsH    = cfg.live_bar_size || 15;
      const lbWH    = lbsH + 24;
      const lPadH   = 30;
      const wfW     = Math.max(200, this._cardWidth - lbWH - lPadH - 32);
      const slotW   = wfW / slots.length;
      const slotMs  = cfg.slot_duration_min * 60 * 1000;
      const toMs    = (cfg.tooltip_timeout_s ?? 5) * 1000;

      const hideTip = () => { tip.style.display = "none"; this._hoveredSlot = null; };
      const resetTimer = () => {
        if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
        this._tooltipTimer = setTimeout(hideTip, toMs);
      };

      svg.addEventListener("mousemove", (e) => {
        const rect = svg.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        // Live bar area (right of wfW+lPadH)
        if (relX >= lPadH + wfW) {
          this._showLiveTooltip(tip, cfg, C, e.clientX, e.clientY);
          resetTimer();
          return;
        }
        const idx = Math.floor((relX - lPadH) / slotW);
        if (idx < 0 || idx >= slots.length) { hideTip(); return; }
        this._showTooltip(tip, slots[idx], idx, cfg, C, slotMs, e.clientX, e.clientY);
        this._highlightSlot(idx);
        resetTimer();
      });
      svg.addEventListener("mouseleave", resetTimer);


    }

    // ── Event-Handler VERTICAL ──────────────────────────────────────────────
    _attachEventsV(slots, cfg, C) {
      const svg = this.shadowRoot.getElementById("svg");
      const tip = this.shadowRoot.getElementById("tip");
      if (!svg || !tip) return;

      const labW   = 52;
      const lbH    = (cfg.live_bar_size || 15) + 4;
      const offsetY = lbH + 4;
      const n       = slots.length;
      const slotH   = cfg.height / Math.max(1, n);
      const slotMs  = cfg.slot_duration_min * 60 * 1000;
      const toMs    = (cfg.tooltip_timeout_s ?? 5) * 1000;

      const hideTip = () => { tip.style.display = "none"; this._hoveredSlot = null; };
      const resetTimer = () => {
        if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
        this._tooltipTimer = setTimeout(hideTip, toMs);
      };

      svg.addEventListener("mousemove", (e) => {
        const rect  = svg.getBoundingClientRect();
        const relY  = e.clientY - rect.top;
        // Live strip area (top)
        if (relY >= 0 && relY < offsetY) {
          this._showLiveTooltip(tip, cfg, C, e.clientX, e.clientY);
          resetTimer();
          return;
        }
        const relYChart = relY - offsetY;
        const rowFromTop = Math.floor(relYChart / slotH);
        const idx = (n - 1) - rowFromTop;
        if (idx < 0 || idx >= slots.length) { hideTip(); return; }
        this._showTooltip(tip, slots[idx], idx, cfg, C, slotMs, e.clientX, e.clientY);
        this._highlightSlot(idx);
        resetTimer();
      });
      svg.addEventListener("mouseleave", resetTimer);


    }

    // ── Gemeinsame Tooltip-Anzeige ──────────────────────────────────────────
    _showTooltip(tip, s, idx, cfg, C, slotMs, clientX, clientY) {
      const startMs = Date.now() - cfg.time_window_h * 3600 * 1000;
      const time    = this._formatTime(new Date(startMs + idx * slotMs + slotMs / 2));
      const dot = (col) => `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${col};margin-right:5px;vertical-align:middle"></span>`;
      const minW = cfg.tooltip_min_w ?? 5;  // Watts
      const row = (col, label, val) => val > minW
        ? `<div>${dot(col)}${label}: <b>${(val/1000).toFixed(2)} kW</b></div>` : "";
      // Total: Solar + Discharge + Grid = House load; (+Charge) = surplus
      const total    = s.solar_to_house + s.batt_discharge + s.grid_buy;
      const surplus  = s.batt_charge;
      const totalStr = `<b>${(total/1000).toFixed(2)} kW</b>`
                     + (surplus > minW ? ` &nbsp;<span style="opacity:.75">(+${(surplus/1000).toFixed(2)} kW 🔋)</span>` : "");
      tip.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid rgba(128,128,128,.3);padding-bottom:4px">${time}</div>
        <div style="margin-bottom:5px;padding-bottom:5px;border-bottom:1px solid rgba(128,128,128,.15)">⚡ ${tr(this._lang,"total")}: ${totalStr}</div>
        ${row(C.solar,             tr(this._lang,"solar"),             s.solar_to_house)}
        ${row(C.battery_charge,    tr(this._lang,"battery_charge"),    s.batt_charge)}
        ${row(C.battery_discharge, tr(this._lang,"battery_discharge"), s.batt_discharge)}
        ${row(C.grid,              tr(this._lang,"grid_buy"),          s.grid_buy)}
      `;
      tip.style.display = "block";
      tip.style.left    = Math.min(clientX + 14, window.innerWidth  - 215) + "px";
      tip.style.top     = Math.max(8,            clientY - 115)            + "px";
    }

    _openOverlay() {
      if (document.getElementById("ewf-overlay")) return;

      const cfg   = this._config;
      const C     = cfg.colors;
      const lang  = this._lang;
      const isV   = cfg.layout === "vertical";
      const slots = this._slotBuffer ? this._slotBuffer.slots : [];
      const live  = this._liveMix;
      const scale = this._maxScale;

      // Verfügbarer Platz im Viewport
      const vw = window.innerWidth  - 80;
      const vh = window.innerHeight - 80;

      // Overlay-Element
      // Insert overlay style globally into document (Shadow DOM doesn't apply here)
      if (!document.getElementById("ewf-global-style")) {
        const gs = document.createElement("style");
        gs.id = "ewf-global-style";
        // Read theme variables directly from document.documentElement
        const docStyle = getComputedStyle(document.documentElement);
        const cardBg  = docStyle.getPropertyValue("--ha-card-background").trim()
                     || docStyle.getPropertyValue("--card-background-color").trim()
                     || "";
        const textCol = docStyle.getPropertyValue("--primary-text-color").trim() || "";
        const secText = docStyle.getPropertyValue("--secondary-text-color").trim() || "";
        const divider = docStyle.getPropertyValue("--divider-color").trim() || "";

        gs.textContent = `
          .ewf-overlay {
            position:fixed !important; inset:0 !important; z-index:999999 !important;
            background:rgba(0,0,0,.75) !important;
            display:flex !important; align-items:center; justify-content:center;
            padding:20px; box-sizing:border-box; cursor:pointer;
          }
          .ewf-overlay-card {
            background:${cardBg || "var(--ha-card-background,#fff)"};
            color:${textCol || "var(--primary-text-color,#333)"};
            border-radius:16px; padding:20px;
            box-shadow:0 8px 40px rgba(0,0,0,.4);
            cursor:default; max-width:98vw; max-height:95vh;
            overflow:auto; position:relative;
          }
          .ewf-close {
            position:absolute; top:12px; right:12px;
            width:32px; height:32px;
            background:rgba(128,128,128,.2);
            border:1px solid rgba(128,128,128,.3);
            border-radius:8px; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
            font-size:18px; color:#fff; opacity:0.8;
            z-index:10001;
          }
          .ewf-close:hover { opacity:1; background:rgba(128,128,128,.4); }
          .ewf-overlay-card svg text { fill:${secText || "var(--secondary-text-color,#888)"}; }
        `;
        document.documentElement.appendChild(gs);
      }

      const overlay = document.createElement("div");
      overlay.id = "ewf-overlay";
      overlay.className = "ewf-overlay";

      // Overlay card
      const card = document.createElement("div");
      card.className = "ewf-overlay-card";

      // Schließen-Button
      const closeBtn = document.createElement("div");
      closeBtn.className = "ewf-close";
      closeBtn.innerHTML = "✕";
      closeBtn.addEventListener("click", (e) => { e.stopPropagation(); overlay.remove(); });

      // Close on background click
      overlay.addEventListener("click", () => overlay.remove());
      card.addEventListener("click", (e) => e.stopPropagation());

      // ESC-Taste
      const onKey = (e) => { if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", onKey); } };
      document.addEventListener("keydown", onKey);

      // Größere Darstellung: height anpassen
      const overlayHeight = isV ? Math.min(vh * 0.85, 800) : Math.min(vh * 0.7, 400);
      const overlayCfg    = { ...cfg, height: overlayHeight };

      // SVG rendern
      const tmpWidth = isV ? Math.min(vw * 0.6, 500) : Math.min(vw, 900);
      const savedWidth = this._cardWidth;
      this._cardWidth = tmpWidth + 80;

      const svgHtml = isV
        ? this._renderVertical(overlayCfg, C, lang, slots, live, scale)
        : this._renderHorizontal(overlayCfg, C, lang, slots, live, scale);

      this._cardWidth = savedWidth;

      // Inline styles for overlay content (SVG, tooltip, legend)
      const textC  = getComputedStyle(document.documentElement).getPropertyValue("--primary-text-color").trim() || "#333";
      const secC   = getComputedStyle(document.documentElement).getPropertyValue("--secondary-text-color").trim() || "#888";
      const bgC    = getComputedStyle(document.documentElement).getPropertyValue("--ha-card-background").trim()
                  || getComputedStyle(document.documentElement).getPropertyValue("--card-background-color").trim()
                  || "#fff";

      card.innerHTML = `
        <style>
          .ewf-overlay-card svg { display:block; overflow:visible; }
          .ewf-overlay-card .title { font-size:18px; font-weight:700; margin-bottom:12px; color:${textC}; }
          .tooltip {
            position:fixed; display:none;
            background:${bgC};
            color:${textC};
            padding:${Math.round(8 * (cfg.overlay_scale || 1.4))}px ${Math.round(12 * (cfg.overlay_scale || 1.4))}px;
            border-radius:8px;
            font-size:${Math.round(11 * (cfg.overlay_scale || 1.4))}px;
            pointer-events:none; z-index:10000;
            box-shadow:0 4px 16px rgba(0,0,0,.3), 0 0 0 1px rgba(128,128,128,.3);
            white-space:nowrap; line-height:1.7;
            border:1px solid rgba(128,128,128,.4);
          }
          .legend { display:flex; gap:${Math.round(12 * (cfg.overlay_scale || 1.4))}px; flex-wrap:wrap; margin-top:8px; font-size:${Math.round(11 * (cfg.overlay_scale || 1.4))}px; color:${secC}; }
          .legend-item { display:flex; align-items:center; gap:4px; }
          .legend-dot { width:10px; height:10px; border-radius:2px; }
          .hr { fill:transparent; cursor:crosshair; }
          svg text { fill:${secC}; font-size:${Math.round(9 * (cfg.overlay_scale || 1.4))}px !important; }
        </style>
        ${svgHtml}
      `;
      card.appendChild(closeBtn);

      // Min/Max trigger in overlay legend
      setTimeout(() => {
        const mmOvTrigger = card.querySelector(".ewf-minmax-trigger");
        const tipOv       = card.querySelector("#tip");
        if (mmOvTrigger && tipOv) {
          const toMs3 = (cfg.tooltip_timeout_s ?? 5) * 1000;
          const svgOv  = card.querySelector("#svg");
          const isVOv  = cfg.layout === "vertical";
          const nOv    = slots.length;
          const lbsOv  = cfg.live_bar_size || 15;
          const lbWOv  = lbsOv + 24;
          const lPadOv = 30;
          const wfWOv  = Math.max(200, tmpWidth + 80 - lbWOv - lPadOv - 32);
          const labWOv = 52;
          const cardWOv= Math.max(200, tmpWidth + 80 - labWOv - 32);
          const halfOv = overlayHeight / 2;
          const scOv   = this._maxScale;
          const dimsOv = isVOv ? {
            slotH: overlayHeight / Math.max(1, nOv), halfX: cardWOv / 2,
            pxW: (cardWOv/2) / scOv, offsetY: lbsOv + 8, n: nOv,
          } : {
            slotW: wfWOv / Math.max(1, nOv), half: halfOv,
            pxW: halfOv / scOv, lPad: lPadOv, n: nOv,
          };
          mmOvTrigger.addEventListener("mouseenter", (e) => {
            this._showMinMaxTooltip(tipOv, slots, cfg, e.clientX, e.clientY, svgOv, isVOv, dimsOv);
          });
          mmOvTrigger.addEventListener("mousemove", (e) => {
            tipOv.style.left = Math.min(e.clientX + 14, window.innerWidth - 215) + "px";
            tipOv.style.top  = Math.max(8, e.clientY - 120) + "px";
          });
          mmOvTrigger.addEventListener("mouseleave", () => {
            setTimeout(() => {
              tipOv.style.display = "none";
              if (svgOv) this._hideMinMaxMarkers(svgOv);
            }, toMs3);
          });
        }
      }, 0);

      overlay.appendChild(card);
      // Adopt theme classes from HA (dort setzt HA dark/light mode)
      // Copy theme-relevant classes from body/html to overlay
      const themeClasses = Array.from(document.body.classList)
        .filter(c => c.includes("theme") || c.includes("dark") || c.includes("light"));
      themeClasses.forEach(c => overlay.classList.add(c));

      // HA sets theme variables on <html> element as style attributes
      // Wir kopieren den kompletten computed style context indem wir
      // add overlay as child of <body> (has access to all CSS vars)
      // but with z-index above everything
      document.documentElement.appendChild(overlay);

      // Tooltip-Events im Overlay aktivieren
      const tip = card.querySelector("#tip");
      const svg = card.querySelector("#svg");
      if (svg && tip && slots.length > 0) {
        const slotMs = cfg.slot_duration_min * 60 * 1000;
        const toMs   = (cfg.tooltip_timeout_s ?? 5) * 1000;
        const hideTip = () => { tip.style.display = "none"; };
        const resetTimer = () => {
          if (this._overlayTipTimer) clearTimeout(this._overlayTipTimer);
          this._overlayTipTimer = setTimeout(hideTip, toMs);
        };
        if (isV) {
          const lbH2    = (cfg.live_bar_size || 15) + 4;
          const offsetY2 = lbH2 + 4;
          const n2      = slots.length;
          const slotH2  = overlayHeight / Math.max(1, n2);
          svg.addEventListener("mousemove", (e) => {
            const rect = svg.getBoundingClientRect();
            const relY = e.clientY - rect.top - offsetY2;
            if (relY < 0) { this._showLiveTooltip(tip, cfg, C, e.clientX, e.clientY); resetTimer(); return; }
            const idx = (n2-1) - Math.floor(relY / slotH2);
            if (idx < 0 || idx >= slots.length) { hideTip(); return; }
            this._showTooltip(tip, slots[idx], idx, cfg, C, slotMs, e.clientX, e.clientY);
            resetTimer();
          });
          svg.addEventListener("mouseleave", resetTimer);
        } else {
          const lbs2  = cfg.live_bar_size || 15;
          const lbW2  = lbs2 + 24;
          const lPad2 = 30;
          const wfW2  = Math.max(200, tmpWidth + 80 - lbW2 - lPad2 - 32);
          const slotW2 = wfW2 / slots.length;
          svg.addEventListener("mousemove", (e) => {
            const rect = svg.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            if (relX >= lPad2 + wfW2) { this._showLiveTooltip(tip, cfg, C, e.clientX, e.clientY); resetTimer(); return; }
            const idx = Math.floor((relX - lPad2) / slotW2);
            if (idx < 0 || idx >= slots.length) { hideTip(); return; }
            this._showTooltip(tip, slots[idx], idx, cfg, C, slotMs, e.clientX, e.clientY);
            resetTimer();
          });
          svg.addEventListener("mouseleave", resetTimer);
        }
      }
    }

    _computeMinMax(slots, slotMs, cfg) {
      if (!slots || slots.length === 0) return null;
      const startMs = Date.now() - cfg.time_window_h * 3600 * 1000;
      let maxVal = -Infinity, minVal = Infinity;
      let maxIdx = 0, minIdx = 0;
      for (let i = 0; i < slots.length; i++) {
        const s   = slots[i];
        const val = s.solar_to_house + s.batt_discharge + s.grid_buy;
        if (val > maxVal) { maxVal = val; maxIdx = i; }
        if (val < minVal) { minVal = val; minIdx = i; }
      }
      const timeOf = (idx) => {
        const ms = startMs + idx * slotMs + slotMs / 2;
        return this._formatTime(new Date(ms));
      };
      return { maxVal, minVal, maxTime: timeOf(maxIdx), minTime: timeOf(minIdx), maxIdx, minIdx };
    }

    // Draw markers in SVG (called on hover over ↑↓)
    _showMinMaxMarkers(svg, mm, slots, cfg, isV, dims) {
      this._hideMinMaxMarkers(svg);
      if (!mm || !svg) return;

      const { slotW, slotH, half, pxW, halfX, offsetY, lPad, n } = dims;
      const color_max = "rgba(255,180,0,.95)";
      const color_min = "rgba(80,160,255,.95)";
      const TICK = 4;   // Tick length
      const OFF  = 47;  // fixed offset above/below the bar

      const el = (tag) => document.createElementNS("http://www.w3.org/2000/svg", tag);

      const makeMarker = (idx, val, isMax) => {
        const color = isMax ? color_max : color_min;
        const lbl   = `${(val/1000).toFixed(2)} kW`;
        const g     = el("g");
        g.setAttribute("class", "ewf-minmax-marker");

        if (isV) {
          // ── Vertikal ──────────────────────────────────────────────────
          // Slot center (y-axis = time)
          const slotY  = offsetY + (n - 1 - idx) * slotH + slotH / 2;
          // Use slot width: tick above/below the entire slot
          const slotTop    = offsetY + (n - 1 - idx) * slotH;
          const slotBottom = slotTop + slotH;
          // Max: label left of center line, OFF px from slot edge
          // Min: label right of center line, OFF px to the right
          const tickX  = isMax ? halfX - 2 : halfX + 2;  // nah an Mittellinie
          const lblX   = isMax ? halfX - OFF - 2 : halfX + OFF + 2;
          const anchor = isMax ? "end" : "start";

          // Tick (vertical, height = slotH for clear position)
          const tick = el("line");
          tick.setAttribute("x1", tickX.toFixed(1));
          tick.setAttribute("y1", (slotY - TICK*2).toFixed(1));
          tick.setAttribute("x2", tickX.toFixed(1));
          tick.setAttribute("y2", (slotY + TICK*2).toFixed(1));
          tick.setAttribute("stroke", color);
          tick.setAttribute("stroke-width", "2");
          g.appendChild(tick);

          // Dashed line: from tick to label
          const dash = el("line");
          dash.setAttribute("x1", tickX.toFixed(1));
          dash.setAttribute("y1", slotY.toFixed(1));
          dash.setAttribute("x2", lblX.toFixed(1));
          dash.setAttribute("y2", slotY.toFixed(1));
          dash.setAttribute("stroke", color);
          dash.setAttribute("stroke-width", "1");
          dash.setAttribute("stroke-dasharray", "3,2");
          g.appendChild(dash);

          // Label
          const text = el("text");
          text.setAttribute("x", lblX.toFixed(1));
          text.setAttribute("y", (slotY + 3).toFixed(1));
          text.setAttribute("font-size",   "9");
          text.setAttribute("font-weight", "700");
          text.setAttribute("text-anchor", anchor);
          text.setAttribute("fill", color);
          text.setAttribute("filter", "drop-shadow(0 0 3px rgba(0,0,0,.5))");
          text.textContent = lbl;
          g.appendChild(text);

        } else {
          // ── Horizontal ────────────────────────────────────────────────
          // Slot center (x-axis = time)
          const slotX = lPad + idx * slotW + slotW / 2;
          // Max: label + tick OFF px above center line (top)
          // Min: label + tick OFF px below center line (bottom)
          const tickY = isMax ? half - OFF : half + OFF;
          const lblY  = isMax ? tickY - TICK - 2 : tickY + TICK + 9;

          // Tick (horizontal above/below center line)
          const tick = el("line");
          tick.setAttribute("x1", (slotX - TICK*2).toFixed(1));
          tick.setAttribute("y1", tickY.toFixed(1));
          tick.setAttribute("x2", (slotX + TICK*2).toFixed(1));
          tick.setAttribute("y2", tickY.toFixed(1));
          tick.setAttribute("stroke", color);
          tick.setAttribute("stroke-width", "2");
          g.appendChild(tick);

          // Dashed line: vertical from center to tick
          const dash = el("line");
          dash.setAttribute("x1", slotX.toFixed(1));
          dash.setAttribute("y1", half.toFixed(1));
          dash.setAttribute("x2", slotX.toFixed(1));
          dash.setAttribute("y2", tickY.toFixed(1));
          dash.setAttribute("stroke", color);
          dash.setAttribute("stroke-width", "1");
          dash.setAttribute("stroke-dasharray", "3,2");
          g.appendChild(dash);

          // Label
          const text = el("text");
          text.setAttribute("x", slotX.toFixed(1));
          text.setAttribute("y", lblY.toFixed(1));
          text.setAttribute("font-size",   "9");
          text.setAttribute("font-weight", "700");
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("fill", color);
          text.setAttribute("filter", "drop-shadow(0 0 3px rgba(0,0,0,.5))");
          text.textContent = lbl;
          g.appendChild(text);
        }

        return g;
      };

      svg.appendChild(makeMarker(mm.maxIdx, mm.maxVal, true));
      svg.appendChild(makeMarker(mm.minIdx, mm.minVal, false));
    }

    _hideMinMaxMarkers(svg) {
      if (!svg) return;
      svg.querySelectorAll(".ewf-minmax-marker").forEach(el => el.remove());
    }

    _showMinMaxTooltip(tip, slots, cfg, clientX, clientY, svg, isV, dims) {
      const slotMs = cfg.slot_duration_min * 60 * 1000;
      const mm     = this._computeMinMax(slots, slotMs, cfg);
      if (!mm) return;
      const lang = this._lang;
      tip.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid rgba(128,128,128,.3);padding-bottom:4px">↑↓ ${tr(lang,"minmax")}</div>
        <div><span style="color:rgba(255,180,0,1)">↑</span> ${tr(lang,"minmax_max")}: <b>${(mm.maxVal/1000).toFixed(2)} kW</b> &nbsp;<span style="opacity:.65">${mm.maxTime}</span></div>
        <div><span style="color:rgba(100,180,255,1)">↓</span> ${tr(lang,"minmax_min")}: <b>${(mm.minVal/1000).toFixed(2)} kW</b> &nbsp;<span style="opacity:.65">${mm.minTime}</span></div>
      `;
      tip.style.display = "block";
      tip.style.left    = Math.min(clientX + 14, window.innerWidth  - 215) + "px";
      tip.style.top     = Math.max(8,            clientY - 90)             + "px";
      // Show markers in SVG if svg and dims were passed
      if (svg && dims) this._showMinMaxMarkers(svg, mm, slots, cfg, isV, dims);
    }

    _showLiveTooltip(tip, cfg, C, clientX, clientY) {
      const live = this._liveMix;
      const dot  = (col) => `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${col};margin-right:5px;vertical-align:middle"></span>`;
      const lang = this._lang;
      const minWL = cfg.tooltip_min_w ?? 5;  // Watts
      const rowL = (col, label, val) => val > minWL
        ? `<div>${dot(col)}${label}: <b>${(val/1000).toFixed(2)} kW</b></div>` : "";
      const totalL   = live.solar_to_house + live.batt_discharge + live.grid_buy;
      const surplusL = live.batt_charge;
      const totalStrL = `<b>${(totalL/1000).toFixed(2)} kW</b>`
                      + (surplusL > minWL ? ` &nbsp;<span style="opacity:.75">(+${(surplusL/1000).toFixed(2)} kW 🔋)</span>` : "");
      tip.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid rgba(128,128,128,.3);padding-bottom:4px">▶ ${tr(lang,"energy_now")}</div>
        <div style="margin-bottom:5px;padding-bottom:5px;border-bottom:1px solid rgba(128,128,128,.15)">⚡ ${tr(lang,"total")}: ${totalStrL}</div>
        ${rowL(C.solar,             tr(lang,"solar"),             live.solar_to_house)}
        ${rowL(C.battery_charge,    tr(lang,"battery_charge"),    live.batt_charge)}
        ${rowL(C.battery_discharge, tr(lang,"battery_discharge"), live.batt_discharge)}
        ${rowL(C.grid,              tr(lang,"grid_buy"),          live.grid_buy)}
      `;
      tip.style.display = "block";
      tip.style.left    = Math.min(clientX + 14, window.innerWidth  - 215) + "px";
      tip.style.top     = Math.max(8,            clientY - 115)            + "px";
    }

    _highlightSlot(idx) {
      if (this._hoveredSlot === idx) return;
      this._hoveredSlot = idx;
      this.shadowRoot.querySelectorAll(".hr").forEach(el => {
        el.style.fill = parseInt(el.dataset.i) === idx ? "rgba(255,255,255,.07)" : "transparent";
      });
    }
  }

  // ============================================================
  // EnergyWaterfallCardEditor
  // ============================================================
  class EnergyWaterfallCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config   = null;
      this._hass     = null;
      this._rendered = false;
    }
    set hass(h) {
      const langChanged = this._hass?.language !== h?.language;
      this._hass = h;
      // Language changed → rebuild DOM to update labels
      if (langChanged && this._rendered) {
        this._rendered = false;
      }
    }

    setConfig(config) {
      const defC = { solar:"#FFD400", battery_charge:"#00C853", battery_discharge:"#118522", grid:"#FF3B30" };
      const raw  = config.colors || {};
      this._config = {
        ...config,
        colors: {
          solar:             toHex(raw.solar,             defC.solar),
          battery_charge:    toHex(raw.battery_charge,    defC.battery_charge),
          battery_discharge: toHex(raw.battery_discharge, defC.battery_discharge),
          grid:              toHex(raw.grid,              defC.grid),
        },
      };
      if (!this._rendered) { this._buildDOM(); this._rendered = true; }
      else                 { this._syncValues(); }
    }

    _buildDOM() {
      const c   = this._config || {};
      const ent = c.entities   || {};
      const col = c.colors     || {};
      const L   = (key) => tr(this._hass?.language || 'de', key);
      const ekw = c.entities_kw || {};

      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; padding:4px 0; font-family:var(--primary-font-family,sans-serif); }
          .row  { margin-bottom:12px; }
          label { display:block; font-size:12px; color:var(--secondary-text-color,#888); margin-bottom:3px; font-weight:500; }
          input[type=text], input[type=number], select {
            width:100%; box-sizing:border-box;
            background:var(--secondary-background-color,#f0f0f0);
            color:var(--primary-text-color,#333);
            border:1px solid var(--divider-color,#ccc);
            border-radius:6px; padding:7px 10px; font-size:13px;
          }
          input[type=checkbox] { width:18px; height:18px; cursor:pointer; accent-color:var(--primary-color,#03a9f4); }
          .check-row { display:flex; align-items:center; gap:10px; }
          .check-row label { margin:0; font-size:13px; color:var(--primary-text-color,#333); font-weight:400; }
          .color-row { display:flex; align-items:center; gap:10px; }
          .color-row input[type=text] { flex:1; }
          input[type=color] { width:42px; height:36px; border:none; border-radius:6px; padding:2px; cursor:pointer; background:var(--secondary-background-color,#f0f0f0); flex-shrink:0; }
          .section { font-size:11px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:var(--secondary-text-color,#888); margin:18px 0 8px; padding-bottom:4px; border-bottom:1px solid var(--divider-color,rgba(0,0,0,.12)); }
          .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        </style>
        <div>
          <div class="row"><label>${L("e_title")}</label><input type="text" id="title" value="${c.title||""}"></div>

          <div class="section">${L("e_sensors")}</div>
          <div style="font-size:11px;color:var(--secondary-text-color,#888);margin-bottom:4px">${L("e_kw_hint")}</div>
          <div class="grid2">
            <div class="row"><label>${L("e_pv")}</label>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="text" id="pv_power" value="${ent.pv_power||""}" placeholder="sensor.pv_power" style="flex:1">
                <label style="display:flex;align-items:center;gap:3px;font-size:11px;white-space:nowrap;margin:0;font-weight:400;color:var(--primary-text-color,#333)">
                  <input type="checkbox" id="kw_pv_power" ${(ekw.pv_power)?"checked":""}> kW</label>
              </div></div>
            <div class="row"><label>${L("e_battery")}</label>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="text" id="battery_power" value="${ent.battery_power||""}" placeholder="sensor.battery_power" style="flex:1">
                <label style="display:flex;align-items:center;gap:3px;font-size:11px;white-space:nowrap;margin:0;font-weight:400;color:var(--primary-text-color,#333)">
                  <input type="checkbox" id="kw_battery_power" ${(ekw.battery_power)?"checked":""}> kW</label>
              </div></div>
            <div class="row"><label>${L("e_grid")}</label>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="text" id="grid_power" value="${ent.grid_power||""}" placeholder="sensor.grid_power" style="flex:1">
                <label style="display:flex;align-items:center;gap:3px;font-size:11px;white-space:nowrap;margin:0;font-weight:400;color:var(--primary-text-color,#333)">
                  <input type="checkbox" id="kw_grid_power" ${(ekw.grid_power)?"checked":""}> kW</label>
              </div></div>
            <div class="row"><label>${L("e_load")}</label>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="text" id="load_power" value="${ent.load_power||""}" placeholder="sensor.load_power" style="flex:1">
                <label style="display:flex;align-items:center;gap:3px;font-size:11px;white-space:nowrap;margin:0;font-weight:400;color:var(--primary-text-color,#333)">
                  <input type="checkbox" id="kw_load_power" ${(ekw.load_power)?"checked":""}> kW</label>
              </div></div>
          </div>

          <div class="section">${L("e_options")}</div>
          <div class="row">
            <label>${L("e_layout")}</label>
            <select id="layout">
              <option value="horizontal" ${(c.layout||"horizontal")==="horizontal"?"selected":""}>${L("e_layout_h")}</option>
              <option value="vertical"   ${c.layout==="vertical"?"selected":""}>${L("e_layout_v")}</option>
            </select>
          </div>
          <div class="row">
            <div class="check-row">
              <input type="checkbox" id="invert_battery" ${c.invert_battery?"checked":""}>
              <label for="invert_battery">${L("e_invert")}</label>
            </div>
          </div>

          <div class="section">${L("e_time")}</div>
          <div class="grid2">
            <div class="row"><label>${L("e_window")}</label><input type="number" id="time_window_h" min="1" max="48" value="${c.time_window_h||10}"></div>
            <div class="row"><label>${L("e_slot")}</label><input type="number" id="slot_duration_min" min="1" max="30" value="${c.slot_duration_min||4}"></div>
            <div class="row"><label>${L("e_tick")}</label><input type="number" id="tick_interval_min" min="15" max="360" step="15" value="${c.tick_interval_min||60}"></div>
            <div class="row"><label>${L("e_tick_h")}</label><input type="number" id="tick_height_pct" min="10" max="100" step="5" value="${c.tick_height_pct||80}"></div>
            <div class="row"><label>${L("e_tick_w")}</label><input type="number" id="tick_width_px" min="0.5" max="5" step="0.5" value="${c.tick_width_px||1}"></div>
            <div class="row"><label>${L("e_tooltip")}</label><input type="number" id="tooltip_timeout_s" min="1" max="30" value="${c.tooltip_timeout_s||5}"></div>
            <div class="row"><label>${L("e_tooltip_min_w")}</label><input type="number" id="tooltip_min_w" min="0" max="100" step="1" value="${c.tooltip_min_w??5}"></div>
          </div>

          <div class="section">${L("e_display")}</div>
          <div class="grid2">
            <div class="row"><label>${L("e_height")}</label><input type="number" id="height" min="100" max="800" step="10" value="${c.height||200}"></div>
            <div class="row"><label>${L("e_minscale")}</label><input type="number" id="min_scale_w" min="1000" max="20000" step="500" value="${c.min_scale_w||5000}"></div>
            <div class="row"><label>${L("e_headroom")}</label><input type="number" id="headroom_pct" min="0" max="50" step="5" value="${c.headroom_pct||15}"></div>
            <div class="row"><label>${L("e_livebar")}</label><input type="number" id="live_bar_size" min="10" max="100" step="5" value="${c.live_bar_size||15}"></div>
            <div class="row"><label>${L("e_overlay_scale")}</label><input type="number" id="overlay_scale" min="1.0" max="3.0" step="0.1" value="${c.overlay_scale||1.4}"></div>
          </div>

          <div class="section">${L("e_colors")}</div>
          ${this._cr("solar",            col.solar            ||"#FFD400", L("e_color_solar"))}
          ${this._cr("battery_charge",   col.battery_charge   ||"#00C853", L("e_color_charge"))}
          ${this._cr("battery_discharge",col.battery_discharge||"#118522", L("e_color_discharge"))}
          ${this._cr("grid",             col.grid             ||"#FF3B30", L("e_color_grid"))}
        </div>
      `;

      for (const key of ["solar","battery_charge","battery_discharge","grid"]) {
        const picker = this.shadowRoot.getElementById(`cp_${key}`);
        const text   = this.shadowRoot.getElementById(`ct_${key}`);
        picker.addEventListener("input",  () => { text.value = picker.value; });
        picker.addEventListener("change", () => { text.value = picker.value; this._changed(); });
        text.addEventListener("change",   () => {
          const v = text.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(v)) picker.value = v;
          this._changed();
        });
      }
      for (const id of ["kw_pv_power","kw_battery_power","kw_grid_power","kw_load_power"]) {
        const el = this.shadowRoot.getElementById(id);
        if (el) el.addEventListener("change", () => this._changed());
      }
      for (const id of ["title","pv_power","battery_power","grid_power","load_power",
          "layout","time_window_h","slot_duration_min","tick_interval_min",
          "tick_height_pct","tick_width_px","tooltip_timeout_s",
          "min_scale_w","headroom_pct","live_bar_size","overlay_scale","tooltip_min_w","height","invert_battery"]) {
        const el = this.shadowRoot.getElementById(id);
        if (el) el.addEventListener("change", () => this._changed());
      }
    }

    _cr(key, val, label) {
      return `<div class="row"><label>${label}</label><div class="color-row">
        <input type="color" id="cp_${key}" value="${val}">
        <input type="text"  id="ct_${key}" value="${val}" maxlength="7" placeholder="#rrggbb">
      </div></div>`;
    }

    _syncValues() {
      const c   = this._config || {};
      const ent = c.entities   || {};
      const col = c.colors     || {};
      const ekwS = c.entities_kw || {};
      const set = (id, v) => { const el = this.shadowRoot.getElementById(id); if (el && el !== document.activeElement) el.value = v; };
      const chk = (id, v) => { const el = this.shadowRoot.getElementById(id); if (el && el !== document.activeElement) el.checked = !!v; };
      set("title",             c.title             || "");
      set("layout",            c.layout            || "horizontal");
      set("pv_power",          ent.pv_power        || "");
      set("battery_power",     ent.battery_power   || "");
      set("grid_power",        ent.grid_power      || "");
      set("load_power",        ent.load_power      || "");
      set("time_window_h",     c.time_window_h     || 10);
      set("slot_duration_min", c.slot_duration_min || 4);
      set("tick_interval_min", c.tick_interval_min || 60);
      set("tick_height_pct",   c.tick_height_pct   || 80);
      set("tick_width_px",     c.tick_width_px     || 1);
      set("tooltip_timeout_s", c.tooltip_timeout_s || 5);
      set("tooltip_min_w",     c.tooltip_min_w     ?? 5);
      set("min_scale_w",       c.min_scale_w       || 5000);
      set("headroom_pct",      c.headroom_pct      || 15);
      set("live_bar_size",     c.live_bar_size     || 15);
      set("overlay_scale",     c.overlay_scale     || 1.4);
      set("height",            c.height            || 200);
      chk("invert_battery",    c.invert_battery);
      chk("kw_pv_power",      ekwS.pv_power);
      chk("kw_battery_power", ekwS.battery_power);
      chk("kw_grid_power",    ekwS.grid_power);
      chk("kw_load_power",    ekwS.load_power);
      for (const key of ["solar","battery_charge","battery_discharge","grid"]) {
        const hex = col[key] || "";
        set(`ct_${key}`, hex);
        const p = this.shadowRoot.getElementById(`cp_${key}`);
        if (p && /^#[0-9a-fA-F]{6}$/.test(hex)) p.value = hex;
      }
    }

    _changed() {
      const g  = (id) => (this.shadowRoot.getElementById(id)?.value || "").trim();
      const gn = (id, d) => parseFloat(g(id)) || d;
      const gb = (id) => this.shadowRoot.getElementById(id)?.checked || false;
      const config = {
        ...this._config,
        title:             g("title"),
        layout:            g("layout") || "horizontal",
        entities: {
          pv_power:      g("pv_power"),
          battery_power: g("battery_power"),
          grid_power:    g("grid_power"),
          load_power:    g("load_power"),
        },
        invert_battery:    gb("invert_battery"),
        entities_kw: {
          pv_power:      gb("kw_pv_power"),
          battery_power: gb("kw_battery_power"),
          grid_power:    gb("kw_grid_power"),
          load_power:    gb("kw_load_power"),
        },
        time_window_h:     gn("time_window_h",     10),
        slot_duration_min: gn("slot_duration_min",  4),
        tick_interval_min: gn("tick_interval_min", 60),
        tick_height_pct:   gn("tick_height_pct",   80),
        tick_width_px:     gn("tick_width_px",       1),
        tooltip_timeout_s: gn("tooltip_timeout_s",   5),
        tooltip_min_w:     gn("tooltip_min_w",       5),
        min_scale_w:       gn("min_scale_w",       5000),
        headroom_pct:      gn("headroom_pct",        15),
        live_bar_size:     gn("live_bar_size",        15),
        overlay_scale:     gn("overlay_scale",       1.4),
        height:            gn("height",             200),
        colors: {
          solar:             g("ct_solar")             || "#FFD400",
          battery_charge:    g("ct_battery_charge")    || "#00C853",
          battery_discharge: g("ct_battery_discharge") || "#118522",
          grid:              g("ct_grid")              || "#FF3B30",
        },
      };
      this.dispatchEvent(new CustomEvent("config-changed", { detail:{ config }, bubbles:true, composed:true }));
    }
  }

  // ============================================================
  // Registrierung
  // ============================================================
  if (!customElements.get("energy-waterfall-card"))
    customElements.define("energy-waterfall-card", EnergyWaterfallCard);
  if (!customElements.get("energy-waterfall-card-editor"))
    customElements.define("energy-waterfall-card-editor", EnergyWaterfallCardEditor);

  window.customCards = window.customCards || [];
  if (!window.customCards.find(c => c.type === "energy-waterfall-card")) {
    window.customCards.push({
      type:        "energy-waterfall-card",
      name:        "Energie-Wasserfall",
      description: "Wasserfall der Energieflüsse – horizontal oder vertikal",
      preview:     false,
      supportsSizeConfiguration: true,
      documentationURL: "https://github.com/DocBig/Energy-Waterfall-Card",
    });
  }

  console.info(
    "%c energy-waterfall-card %c v1.0.0 ",
    "background:#FFD400;color:#000;font-weight:bold;border-radius:3px 0 0 3px",
    "background:#00C853;color:#fff;font-weight:bold;border-radius:0 3px 3px 0"
  );
})();