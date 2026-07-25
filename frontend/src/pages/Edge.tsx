import { useState, useEffect, useRef, useCallback } from "react";
import { api, showToast } from "../api/client";

interface StationStatus {
  stationId: number;
  address: string;
  connected: boolean;
  lastEventAt?: string | null;
  nodesResolved: boolean;
}

interface StationConfig {
  id: number;
  address: string;
  name: string;
  nodePrefix: string;
  stMesDbName: string;
  dbProcessDataDbName: string;
  userName: string;
  password: string;
  opcuaStationId?: number;
}

interface Machine {
  id: string;
  name: string;
  status: string;
  location: string;
  opcua_station_id?: number;
}

interface HandshakeEvent {
  type: string;
  stationId: number;
  timestamp: string;
  data?: Record<string, any>;
}

export default function EdgePage() {
  const [tab, setTab] = useState<"monitor" | "config">("monitor");
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [events, setEvents] = useState<HandshakeEvent[]>([]);
  const [config, setConfig] = useState<StationConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<StationConfig[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [saved, setSaved] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [nodeReaderField, setNodeReaderField] = useState("");
  const [nodeReaderStation, setNodeReaderStation] = useState<number>(1);
  const [nodeReaderResult, setNodeReaderResult] = useState<Record<string, any> | null>(null);
  const [liveValues, setLiveValues] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);

  // Load stations status
  const loadStations = useCallback(async () => {
    try {
      const res = await api.get("/edge/opcua/status");
      if (Array.isArray(res)) setStations(res as StationStatus[]);
    } catch {}
  }, []);

  // Load config
  const loadConfig = useCallback(async () => {
    try {
      const res = await api.get("/edge/opcua/config");
      if (Array.isArray(res)) {
        setConfig(res);
        setEditingConfig(JSON.parse(JSON.stringify(res)));
      }
    } catch {}
  }, []);

  const loadMachines = useCallback(async () => {
    try {
      const res = await api.get("/machines");
      if (Array.isArray(res)) setMachines(res as Machine[]);
    } catch {}
  }, []);

  useEffect(() => {
    loadStations();
    loadConfig();
    loadMachines();
  }, [loadStations, loadConfig, loadMachines]);

  // Polling for status updates
  useEffect(() => {
    const interval = setInterval(loadStations, 3000);
    return () => clearInterval(interval);
  }, [loadStations]);

  // WebSocket for live event stream
  useEffect(() => {
    try {
      const ws = new WebSocket(`ws://${window.location.host}/api/edge/ws`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          // Filter OPC UA events and ignore heartbeats
          if (msg.eventType || msg.type === "xStart" || msg.type === "stMesStateChange" || msg.type === "dbProcessDataChange") {
            const event: HandshakeEvent = {
              type: msg.type || msg.eventType,
              stationId: msg.stationId ?? 0,
              timestamp: new Date().toISOString(),
              data: msg.data,
            };
            setEvents(prev => [...prev.slice(-100), event]);
          }
        } catch {}
      };
      ws.onerror = () => {};
      return () => { ws.close(); };
    } catch {}
  }, []);

  // Save config handler
  const handleSaveConfig = async () => {
    try {
      await api.patch("/edge/opcua/config", editingConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      // Also sync all machine assignments to DB
      for (const station of editingConfig) {
        if (station.opcuaStationId) {
          try {
            await api.patch("/machines/" + station.opcuaStationId, { opcua_station_id: station.id });
          } catch {}
        }
      }
      
      showToast("Konfiguration gespeichert!", "success");
    } catch (err: any) {
      showToast("Fehler beim Speichern: " + err.message, "error");
    }
  };


  // Reload OPC UA connections
  const handleReload = async () => {
    setReloading(true);
    try {
      await api.post("/edge/opcua/config/reload", null);
      showToast("OPC UA Stationen neu geladen!", "success");
    } catch (err: any) {
      showToast("Neuladen fehlgeschlagen: " + err.message, "error");
    } finally {
      setReloading(false);
    }
  };

  // Add/remove station config
  const addStation = () => {
    const maxId = editingConfig.length > 0 ? Math.max(...editingConfig.map(s => s.id)) : 0;
    setEditingConfig([...editingConfig, { id: maxId + 1, address: "", name: `Station ${maxId + 1}`, nodePrefix: "", stMesDbName: "stMES", dbProcessDataDbName: "dbProcessData", userName: "", password: "" }]);
  };

  const removeStation = (id: number) => {
    setEditingConfig(editingConfig.filter(s => s.id !== id));
  };

  const updateStationField = (id: number, field: keyof StationConfig, value: string | number) => {
    setEditingConfig(editingConfig.map(s => {
      if (s.id === id) return { ...s, [field]: value };
      return s;
    }));
  };

  return (
    <div className="min-h-screen">
      <main className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-page-grey rounded-xl shadow-card border border-neutral-border p-5">
          <h1 className="text-[var(--text-3xl-size)] leading-tight font-bold text-neutral-black">Edge Gateway</h1>
          <p className="text-sm text-neutral-mid mt-1">OPC UA Stations monitor + Config</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-neutral-border pt-4">
          {(["monitor", "config"] as const).map(t => (
            <button
              key={t}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors text-sm ${
                tab === t ? "bg-brand-primary text-white" : "text-neutral-mid hover:bg-page-grey"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "monitor" ? "Monitor" : "Config (Admin)"}
            </button>
          ))}
        </div>

        {/* ===== MONITOR TAB ===== */}
        {tab === "monitor" && (
          <div className="space-y-6">
            {/* Stations Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stations.map(station => (
                <div key={station.stationId} className={`bg-white rounded-xl shadow-card border p-5 ${station.connected ? "border-status-success" : "border-status-error/50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[var(--text-xl-size)] leading-snug font-bold text-neutral-black truncate">{station.address || `(Station ${station.stationId})`}</h3>
                      <span className="text-xs text-neutral-mid">#{station.stationId}</span>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${station.connected ? "bg-status-bg-success text-status-success" : "bg-status-bg-error text-status-error"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${station.connected ? "bg-status-success animate-pulse" : "bg-status-error"}`} />
                      {station.connected ? "Online" : "Offline"}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-neutral-dark">
                    <div style={{ fontSize: "var(--text-xs-size)" }}>Nodes resolved: <span className={`font-medium ${station.nodesResolved ? "text-status-success" : "text-status-warning"}`}>{station.nodesResolved ? "Ja" : "Nein"}</span></div>
                    {station.lastEventAt && (
                      <div style={{ fontSize: "var(--text-xs-size)" }} className="mt-1.5 text-neutral-mid">Letztes Event: {new Date(station.lastEventAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>
                    )}
                  </div>

                  {/* xStart live value */}
                  <div className="mt-3 pt-3 border-t border-neutral-border">
                    <div style={{ fontSize: "var(--text-xs-size)" }} className="flex items-center gap-2 text-neutral-mid">
                      <span>xStart:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${liveValues.xStart ? "bg-status-bg-success/30" : "bg-page-grey"} border border-neutral-border`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${liveValues.xStart ? "bg-status-success" : "bg-neutral-300"}`} />
                        {liveValues.xStart ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {!stations.length && (
                <div className="sm:col-span-2 lg:col-span-3 rounded-xl border-2 border-dashed border-neutral-border p-8 flex items-center justify-center bg-page-grey">
                  <p style={{ fontSize: "var(--text-sm-size)" }} className="text-neutral-mid">Keine Stationen konfiguriert. Wechsle zum Tab "Config".</p>
                </div>
              )}
            </div>

            {/* Live Event Stream */}
            <div className="bg-white rounded-xl shadow-card border border-neutral-border p-5">
              <h3 style={{ fontSize: "var(--text-lg-size)" }} className="leading-snug font-bold text-neutral-black mb-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${events.length > 0 ? "bg-status-success animate-pulse" : "bg-neutral-300"}`} />
                Live Events ({events.length})
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg p-3 border border-neutral-border bg-page-grey font-mono text-xs">
                {events.length === 0 ? (
                  <p className="text-neutral-mid italic">Warte auf OPC UA Events...</p>
                ) : (
                  events.slice().reverse().map((evt, i) => (
                    <div key={i} className={`px-2 py-1 rounded border ${
                      evt.type === "xStart" ? "bg-accent-lilac-bg/30 text-brand-lilac border-transparent" :
                      evt.type === "stMesStateChange" ? "bg-status-bg-success/20 text-status-success border-transparent" :
                      "bg-white/50 text-neutral-dark border-neutral-border/50"
                    }`}>
                      <span className="text-neutral-mid">{new Date(evt.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                      {" "}
                      <span className="font-bold">Station {evt.stationId}</span>
                      {" "}
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-uppercase font-bold ${
                        evt.type === "xStart" ? "bg-accent-lilac-bg text-brand-lilac" :
                        evt.type === "stMesStateChange" ? "bg-status-bg-success text-status-success" :
                        "bg-neutral-border text-neutral-mid"
                      }`}>
                        {evt.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <button onClick={loadStations} style={{ fontSize: "var(--text-sm-size)" }} className="px-4 py-2 rounded-lg bg-white border border-neutral-border text-neutral-dark hover:bg-page-grey transition-colors font-medium disabled:opacity-50">
                ↻ Stationen aktualisieren
              </button>
              <button onClick={handleReload} disabled={reloading} style={{ fontSize: "var(--text-sm-size)" }} className="px-4 py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity font-medium disabled:opacity-50">
                {reloading ? "⏳ Lade neu..." : "⟳ OPC UA Stationen neu laden"}
              </button>
            </div>
          </div>
        )}

        {/* ===== CONFIG TAB ===== */}
        {tab === "config" && (
          <div className="space-y-6">
            {/* Config Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 style={{ fontSize: "var(--text-xl-size)" }} className="leading-snug font-bold text-neutral-black">OPC UA Station Configuration</h2>
                <p style={{ fontSize: "var(--text-sm-size)" }} className="text-neutral-mid mt-1 max-w-2xl">Konfiguriere die Stationen, mit denen das Edge Gateway kommuniziert. Änderungen werden sofort gespeichert erfordern jedoch einen OPC UA Reload.</p>
              </div>
              <button onClick={addStation} style={{ fontSize: "var(--text-sm-size)" }} className="px-4 py-2 rounded-lg bg-status-success text-white hover:opacity-90 transition-opacity font-medium flex-shrink-0">
                + Station hinzufügen
              </button>
            </div>

            {/* Config Editor */}
            <div className="space-y-4">
              {editingConfig.map((station) => (
                <div key={station.id} className="bg-white rounded-xl shadow-card border border-neutral-border p-5 relative group">
                  <button onClick={() => removeStation(station.id)} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-300 hover:text-status-error opacity-0 group-hover:opacity-100 transition-opacity bg-page-grey hover:bg-white" title="Station entfernen">✕</button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Name</label>
                      <input value={station.name} onChange={e => updateStationField(station.id, "name", e.target.value)} style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Address (opc.tcp://...)</label>
                      <input value={station.address} onChange={e => updateStationField(station.id, "address", e.target.value)} placeholder="opc.tcp://192.168.1.100:4840" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Zugeordnete Maschine</label>
                      <select value={station.opcuaStationId ?? ""} onChange={e => updateStationField(station.id, "opcuaStationId", e.target.value || "")} style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors">
                        <option value="">— Keine Maschine —</option>
                        {machines.map(m => (
                          <option key={m.id} value={m.opcua_station_id || ""}>
                            {m.name} ({m.location}) {m.status ? `(${m.status})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Node Prefix (optional)</label>
                      <input value={station.nodePrefix} onChange={e => updateStationField(station.id, "nodePrefix", e.target.value)} placeholder="PLC1." style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">stMES DB Name</label>
                      <input value={station.stMesDbName} onChange={e => updateStationField(station.id, "stMesDbName", e.target.value)} placeholder="stMES" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">dbProcessData DB Name</label>
                      <input value={station.dbProcessDataDbName} onChange={e => updateStationField(station.id, "dbProcessDataDbName", e.target.value)} placeholder="DB151" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Username (optional)</label>
                      <input value={station.userName} onChange={e => updateStationField(station.id, "userName", e.target.value)} placeholder="administrator" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Password (optional)</label>
                      <input value={station.password} onChange={e => updateStationField(station.id, "password", e.target.value)} type="password" placeholder="••••••••" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                  </div>

                  {/* Machine assignment badge */}
                  {station.opcuaStationId && (
                    <div className="mt-3 pt-3 border-t border-neutral-border">
                      <span style={{ fontSize: "var(--text-xs-size)" }} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent-lilac-bg text-brand-lilac font-medium">
                        ⊡ Zugeordnete Maschine: #{station.opcuaStationId}
                      </span>
                    </div>
                  )}

                  {/* Node-ID format preview */}
                  <div className="mt-4 pt-4 border-t border-neutral-border">
                    <p style={{ fontSize: "var(--text-xs-size)" }} className="font-medium text-neutral-mid mb-2">Generierte Node-ID Patterns (Preview):</p>
                    <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                      {["xStart", "xBusy", "xAck", "iCarrierID"].map(field => (
                        <span key={field} className="px-2 py-1 bg-page-grey rounded border border-neutral-border text-brand-lilac">
                          ns=4;s={station.dbProcessDataDbName || "DB151"}:{field}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {!editingConfig.length && (
                <div className="rounded-xl border-2 border-dashed border-neutral-border p-8 flex items-center justify-center bg-page-grey">
                  <p style={{ fontSize: "var(--text-sm-size)" }} className="text-neutral-mid">Noch keine Stationen konfiguriert. Klicke + um eine hinzuzufügen.</p>
                </div>
              )}
            </div>

            {/* Save/Reload Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-neutral-border">
              <button onClick={handleSaveConfig} style={{ fontSize: "var(--text-sm-size)" }} className="px-6 py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity font-medium flex items-center gap-1 disabled:opacity-50">
                {saved ? "✅ Gespeichert!" : "Speichern"}
              </button>
              <button onClick={handleReload} disabled={reloading} style={{ fontSize: "var(--text-sm-size)" }} className="px-6 py-2 rounded-lg bg-white border border-neutral-border text-neutral-dark hover:bg-page-grey transition-colors font-medium disabled:opacity-50">
                {reloading ? "⏳ Lade neu..." : "⟳ OPC UA Verbindungen neu laden"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: "var(--text-xs-size)" }} className="text-neutral-mid">Zuletzt aktualisiert: {new Date().toLocaleTimeString("de-DE")}</p>
      </main>
    </div>
  );
}
