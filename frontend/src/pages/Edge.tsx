import { useState, useEffect, useRef, useCallback } from "react";
import { api, showToast } from "../api/client";

interface StationStatus {
  stationId: number;
  address: string;
  connected: boolean;
  lastEventAt?: string | null;
  nodesResolved: boolean;
}

interface OpcUaConnectionConfig {
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

interface MqttMessage {
  topic: string;
  payload: any;
  timestamp: string;
}

interface MqttConfigStatus {
  connected: boolean;
  config: {
    brokerUrl: string;
    username?: string;
    password?: string;
    connected: boolean;
  };
}

export default function EdgePage() {
  const [tab, setTab] = useState<"monitor" | "config" | "mqtt-monitor" | "mqtt-config">("monitor");
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [events, setEvents] = useState<HandshakeEvent[]>([]);
  const [config, setConfig] = useState<OpcUaConnectionConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<OpcUaConnectionConfig[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [saved, setSaved] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [nodeReaderField, setNodeReaderField] = useState("");
  const [nodeReaderStation, setNodeReaderStation] = useState<number>(1);
  const [nodeReaderResult, setNodeReaderResult] = useState<Record<string, any> | null>(null);
  const [liveValues, setLiveValues] = useState<Record<string, number>>({});
   // MQTT Monitor state
  const [allMqttMessages, setAllMqttMessages] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<MqttMessage[]>([]);
  const [createdOrders, setCreatedOrders] = useState<{ orderId: string; name: string; payload: any; timestamp: string }[]>([]);
  const createdKeysRef = useRef<Set<string>>(new Set());
   const [mqttConfig, setMqttConfig] = useState<{ connected: boolean; config?: { brokerUrl?: string; connected?: boolean } , savedConfig?: { brokerUrl?: string; username?: string; password?: string } }>({ connected: false, config: { brokerUrl: 'mqtt://localhost:1883', connected: false }, savedConfig: {} });
  const [mqttBrokerUrl, setMqttBrokerUrl] = useState("mqtt://localhost:1883");
  const [mqttUsername, setMqttUsername] = useState("");
  const [mqttPassword, setMqttPassword] = useState("");
  const [mqttConnecting, setMqttConnecting] = useState(false);
  const [autoCreateOrder, setAutoCreateOrder] = useState(true);
  const autoCreateRef = useRef(autoCreateOrder);
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

   const loadMqttStatus = useCallback(async () => {
     try {
       const res: any = await api.get("/edge/mqtt/status");
       if (res?.connected !== undefined) {
         setMqttConfig({ connected: res.connected, config: { brokerUrl: res.config?.brokerUrl || mqttBrokerUrl, connected: res.connected }, savedConfig: { brokerUrl: res.savedConfig?.brokerUrl || mqttBrokerUrl, username: res.savedConfig?.username || "", password: "" } });
       }
     } catch {}
   }, []);


  // Load MQTT broker config from file
  useEffect(() => {
    const loadSavedConfig = async () => {
      if (!globalThis.__saved_mqtt_config) return;
      try {
        const cfg = JSON.parse(globalThis.__saved_mqtt_config as string);
        if (cfg.brokerUrl) setMqttBrokerUrl(cfg.brokerUrl);
        if (cfg.autoCreateOrder != null) setAutoCreateOrder(cfg.autoCreateOrder);
      } catch {}
    };
    loadSavedConfig();
  }, []);

   useEffect(() => {
     loadStations();
     loadConfig();
     loadMachines();
     loadMqttStatus();
     // Load saved config fields into input fields
     if (mqttConfig.savedConfig) {
       if (mqttConfig.savedConfig.brokerUrl) setMqttBrokerUrl(mqttConfig.savedConfig.brokerUrl);
       if (mqttConfig.savedConfig.username) setMqttUsername(mqttConfig.savedConfig.username);
     }
   }, [loadStations, loadConfig, loadMachines, loadMqttStatus]);

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

  // WebSocket for MQTT messages via EventBus
  useEffect(() => {
    try {
      const mqttWs = new WebSocket(`ws://${window.location.host}/api/edge/ws`);
      mqttWs.onopen = () => {
        mqttWs.send(JSON.stringify({ type: 'subscribe', topic: 'mqtt/' }));
      };
      mqttWs.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'mqtt/status') {
            setMqttConfig(prev => ({ ...prev, connected: msg.connected ?? false, config: { ...prev.config, brokerUrl: msg.brokerUrl || prev.config?.brokerUrl } }));
            return;
          }
          if (msg.type === 'mqtt/auto-create') {
            setAutoCreateOrder(msg.enabled);
            autoCreateRef.current = msg.enabled;
            return;
          }
          if (msg.type?.startsWith('mqtt/') && msg.payload) {
            const mqttMsg: MqttMessage = {
              topic: msg.type.substring(5),
              payload: msg.payload,
              timestamp: new Date(msg.timestamp || Date.now()).toISOString(),
            };
            if (mqttMsg.topic === "i4.0/production/orders") {
              const key = JSON.stringify(msg.payload);
              setPendingOrders(prev => [...prev.slice(-200), mqttMsg]);
              setAllMqttMessages(prev => [...prev.slice(-500), mqttMsg]);
              
              if (autoCreateRef.current && msg.payload?.bDeckelfarbe) {
                try {
                  const p = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
                  const res = await api.post("/edge/mqtt/order/import", p);
                  if (res?.success && res.orderId) {
                    createdKeysRef.current.add(key);
                    setPendingOrders(prev => prev.filter(m => JSON.stringify(m.payload) !== key));
                    setCreatedOrders(prev => [...prev, { orderId: res.orderId, name: res.orderName || res.orderId, payload: msg.payload, timestamp: new Date().toISOString() }]);
                    showToast(`Order angelegt: ${res.orderName || res.orderId}`, "success");
                  }
                } catch {}
              }
            }
            setAllMqttMessages(prev => [...prev.slice(-500), mqttMsg]);
          }
        } catch {}
      };
      return () => { mqttWs.close(); };
    } catch {}
  }, []);

  // Save config handler
  const handleSaveConfig = async () => {
    try {
      await api.patch("/edge/opcua/config", editingConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      // Also sync all machine assignments to DB
      for (const connection of editingConfig) {
        if (connection.opcuaStationId) {
          try {
            await api.patch("/machines/" + connection.opcuaStationId, { opcua_station_id: connection.id });
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
      showToast("OPC UA Connections neu geladen!", "success");
    } catch (err: any) {
      showToast("Neuladen fehlgeschlagen: " + err.message, "error");
    } finally {
      setReloading(false);
    }
  };

  // Add/remove connection config
  const addConnection = () => {
    const maxId = editingConfig.length > 0 ? Math.max(...editingConfig.map(s => s.id)) : 0;
    setEditingConfig([...editingConfig, { id: maxId + 1, address: "", name: `Connection ${maxId + 1}`, nodePrefix: "", stMesDbName: "stMES", dbProcessDataDbName: "dbProcessData", userName: "", password: "" }]);
  };

  const removeConnection = (id: number) => {
    setEditingConfig(editingConfig.filter(s => s.id !== id));
  };

  const updateConnectionField = (id: number, field: keyof OpcUaConnectionConfig, value: string | number) => {
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
          <p className="text-sm text-neutral-mid mt-1">OPC UA Connections monitor + Config</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-neutral-border pt-4">
          {(["monitor", "config", "mqtt-monitor", "mqtt-config"] as const).map(t => (
            <button
              key={t}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors text-sm ${
                tab === t ? "bg-brand-primary text-white" : "text-neutral-mid hover:bg-page-grey"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "monitor" ? "Monitor" : t === "config" ? "Config (Admin)" : t === "mqtt-monitor" ? "MQTT Monitor" : "MQTT Config (Admin)"}
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
                      <span className="font-bold">Connection {evt.stationId}</span>
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
                ↻ Connections aktualisieren
              </button>
              <button onClick={handleReload} disabled={reloading} style={{ fontSize: "var(--text-sm-size)" }} className="px-4 py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity font-medium disabled:opacity-50">
                {reloading ? "⏳ Lade neu..." : "⟳ OPC UA Connections neu laden"}
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
                <h2 style={{ fontSize: "var(--text-xl-size)" }} className="leading-snug font-bold text-neutral-black">OPC UA Connection Configuration</h2>
                <p style={{ fontSize: "var(--text-sm-size)" }} className="text-neutral-mid mt-1 max-w-2xl">Konfiguriere die Connections, mit denen das Edge Gateway kommuniziert. Änderungen werden sofort gespeichert erfordern jedoch einen OPC UA Reload.</p>
              </div>
              <button onClick={addConnection} style={{ fontSize: "var(--text-sm-size)" }} className="px-4 py-2 rounded-lg bg-status-success text-white hover:opacity-90 transition-opacity font-medium flex-shrink-0">
                + Connection hinzufügen
              </button>
            </div>

            {/* Config Editor */}
            <div className="space-y-4">
              {editingConfig.map((connection) => (
                <div key={connection.id} className="bg-white rounded-xl shadow-card border border-neutral-border p-5 relative group">
                  <button onClick={() => removeConnection(connection.id)} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-300 hover:text-status-error opacity-0 group-hover:opacity-100 transition-opacity bg-page-grey hover:bg-white" title="Connection entfernen">✕</button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Name</label>
                      <input value={connection.name} onChange={e => updateConnectionField(connection.id, "name", e.target.value)} style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Address (opc.tcp://...)</label>
                      <input value={connection.address} onChange={e => updateConnectionField(connection.id, "address", e.target.value)} placeholder="opc.tcp://192.168.1.100:4840" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Zugeordnete Maschine</label>
                      <select value={connection.opcuaStationId ?? ""} onChange={e => updateConnectionField(connection.id, "opcuaStationId", e.target.value || "")} style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors">
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
                      <input value={connection.nodePrefix} onChange={e => updateConnectionField(connection.id, "nodePrefix", e.target.value)} placeholder="PLC1." style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">stMES DB Name</label>
                      <input value={connection.stMesDbName} onChange={e => updateConnectionField(connection.id, "stMesDbName", e.target.value)} placeholder="stMES" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">dbProcessData DB Name</label>
                      <input value={connection.dbProcessDataDbName} onChange={e => updateConnectionField(connection.id, "dbProcessDataDbName", e.target.value)} placeholder="DB151" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Username (optional)</label>
                      <input value={connection.userName} onChange={e => updateConnectionField(connection.id, "userName", e.target.value)} placeholder="administrator" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Password (optional)</label>
                      <input value={connection.password} onChange={e => updateConnectionField(connection.id, "password", e.target.value)} type="password" placeholder="••••••••" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                    </div>
                  </div>

                  {/* Machine assignment badge */}
                  {connection.opcuaStationId && (
                    <div className="mt-3 pt-3 border-t border-neutral-border">
                      <span style={{ fontSize: "var(--text-xs-size)" }} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent-lilac-bg text-brand-lilac font-medium">
                        ⊡ Zugeordnete Maschine: #{connection.opcuaStationId}
                      </span>
                    </div>
                  )}

                  {/* Node-ID format preview */}
                  <div className="mt-4 pt-4 border-t border-neutral-border">
                    <p style={{ fontSize: "var(--text-xs-size)" }} className="font-medium text-neutral-mid mb-2">Generierte Node-ID Patterns (Preview):</p>
                    <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                      {["xStart", "xBusy", "xAck", "iCarrierID"].map(field => (
                        <span key={field} className="px-2 py-1 bg-page-grey rounded border border-neutral-border text-brand-lilac">
                          ns=4;s={connection.dbProcessDataDbName || "DB151"}:{field}
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

        {/* ===== MQTT MONITOR TAB ===== */}
        {tab === "mqtt-monitor" && (
          <div className="space-y-6">
            {/* Status Header */}
            <div className="bg-white rounded-xl shadow-card border border-neutral-border p-5 flex flex-wrap items-center gap-4">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${mqttConfig.connected ? "bg-status-success/20 text-status-success" : "bg-status-warning/20 text-status-warning"}`}>
                {mqttConfig.connected ? "Verbunden" : "Nicht verbunden"}
              </span>
               <span className="font-medium text-neutral-mid text-sm">Broker: {mqttConfig.config?.brokerUrl}</span>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border border-neutral-border">
              <label className="inline-flex items-center gap-2 cursor-pointer" style={{ fontSize: "var(--text-sm-size)" }}>
                <input type="checkbox" checked={autoCreateOrder} onChange={async e => {
                  const checked = e.target.checked;
                  autoCreateRef.current = checked;
                  await api.post("/edge/mqtt/order/auto-create", { enabled: checked });
                  setAutoCreateOrder(checked);
                }} className="w-4 h-4 rounded accent-brand-primary" />
                <span className="font-medium text-neutral-dark">Auto-Create Order bei MQTT Message</span>
              </label>
            </div>

            {/* Pending Orders */}
            {pendingOrders.length > 0 ? (
              <div className="bg-white rounded-xl shadow-card border border-neutral-border p-5">
                <h3 style={{ fontSize: "var(--text-lg-size)" }} className="leading-snug font-bold text-neutral-black mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-status-warning animate-pulse" />
                  Offene Bestellungen ({pendingOrders.length})
                </h3>
                <div className="max-h-[400px] overflow-y-auto space-y-1 rounded-lg p-3 border border-neutral-border bg-page-grey">
                  {pendingOrders.map((msg, i) => (
                    <div key={i} className="px-2 py-1.5 rounded bg-status-warning-bg/30 flex justify-between items-center gap-2">
                      <span className="text-neutral-dark text-xs truncate">{JSON.stringify(msg.payload)}</span>
                      {!autoCreateOrder && (
                        <button onClick={async () => {
                          try {
                            const p = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
                            const res = await api.post("/edge/mqtt/order/import", p);
                            if (res?.success && res.orderId) {
                              setPendingOrders(prev => prev.filter((m, j) => j !== i));
                              setCreatedOrders(prev => [...prev, { orderId: res.orderId, name: res.orderName || res.orderId, payload: msg.payload, timestamp: new Date().toISOString() }]);
                            }
                          } catch {}
                        }} className="px-3 py-1 rounded text-xs bg-brand-primary text-white hover:opacity-90 font-medium shrink-0">
                          Erstellen
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : !mqttConfig.connected ? (
              <div className="rounded-xl border-2 border-dashed border-status-error/30 p-8 flex items-center justify-center bg-status-error-bg">
                <p style={{ fontSize: "var(--text-sm-size)" }} className="text-status-error font-medium">Broker nicht verbunden — keine Orders möglich</p>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-neutral-border p-8 flex items-center justify-center bg-page-grey">
                <p style={{ fontSize: "var(--text-sm-size)" }} className="text-neutral-mid">{autoCreateOrder ? 'Orders werden automatisch angelegt…' : 'Warte auf MQTT Messages von i4.0/production/orders…'}</p>
              </div>
            )}

            {/* Created Orders */}
            {createdOrders.length > 0 && (
              <div className="bg-white rounded-xl shadow-card border border-neutral-border p-5">
                <h3 style={{ fontSize: "var(--text-lg-size)" }} className="leading-snug font-bold text-neutral-black mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-status-success animate-pulse" />
                  Erstellte Orders ({createdOrders.length})
                </h3>
                <div className="max-h-[400px] overflow-y-auto space-y-1 rounded-lg p-3 border border-neutral-border bg-page-grey">
                  {createdOrders.map((order, i) => (
                    <div key={i} className="px-2 py-1.5 rounded bg-status-success-bg/30 text-status-success text-xs">
                      ✓ {order.name || order.orderId.slice(0, 8)} — {new Date(order.timestamp).toLocaleTimeString("de-DE")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== MQTT CONFIG TAB ===== */}
        {tab === "mqtt-config" && (
          <div className="space-y-6">
            {/* Status Header */}
            <div className="bg-white rounded-xl shadow-card border border-neutral-border p-5 flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${mqttConfig.connected ? "bg-status-success/20 text-status-success" : "bg-status-error/20 text-status-error"}`}>
                {mqttConfig.connected ? "● Verbunden" : "○ Nicht verbunden"}
              </span>
              <span className="font-medium text-neutral-mid text-sm">Broker: {mqttConfig.config?.brokerUrl}</span>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-neutral-border p-5">
              <h2 style={{ fontSize: "var(--text-xl-size)" }} className="leading-snug font-bold text-neutral-black mb-4">MQTT Broker Configuration</h2>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Broker URL</label>
                  <input value={mqttConfig.savedConfig?.brokerUrl || mqttBrokerUrl} onChange={e => setMqttBrokerUrl(e.target.value)} placeholder="mqtt://broker.emqx.io" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Username (optional)</label>
                  <input value={mqttConfig.savedConfig?.username || mqttUsername} onChange={e => setMqttUsername(e.target.value)} placeholder="optional" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs-size)" }} className="block font-medium text-neutral-mid mb-1.5">Password (optional)</label>
                  <input type="password" value={mqttPassword} onChange={e => setMqttPassword(e.target.value)} placeholder="••••••••" style={{ fontSize: "var(--text-sm-size)" }} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm placeholder:text-neutral-mid focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors" />
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t border-neutral-border">
                  <button onClick={async () => {
                    try {
                      await api.post("/edge/mqtt/connect", { brokerUrl: mqttConfig.savedConfig?.brokerUrl || mqttBrokerUrl, username: mqttConfig.savedConfig?.username || mqttUsername || undefined, password: mqttPassword || undefined });
                      showToast("MQTT Broker connect gesendet", "success");
                      // Reload status after connect
                      const status = await api.get("/edge/mqtt/status");
                      if (status?.connected !== undefined) {
                        setMqttConfig({ connected: status.connected, config: { brokerUrl: mqttConfig.savedConfig?.brokerUrl || mqttBrokerUrl, connected: status.connected }, savedConfig: status.savedConfig });
                      }
                    } catch {}
                  }} disabled={mqttConnecting} style={{ fontSize: "var(--text-sm-size)" }} className={`px-5 py-2.5 rounded-lg text-white font-medium transition-colors ${mqttConnecting ? "bg-gray-400" : "bg-status-success hover:opacity-90"}`}>
                    {mqttConnecting ? "Verbinde..." : (mqttConfig.connected ? "Broker trennen" : "Broker verbinden")}
                  </button>
                  <button onClick={async () => {
                    try {
                      await api.post("/edge/mqtt/config", { brokerUrl: mqttConfig.savedConfig?.brokerUrl || mqttBrokerUrl, username: mqttConfig.savedConfig?.username || mqttUsername || undefined, password: mqttPassword || undefined });
                      // Reload status to refresh saved config in input fields
                      const status = await api.get("/edge/mqtt/status");
                      if (status?.connected !== undefined) {
                        setMqttConfig({ connected: status.connected, config: { brokerUrl: status.config?.brokerUrl || mqttBrokerUrl, connected: status.connected }, savedConfig: status.savedConfig });
                        if (status.savedConfig?.brokerUrl) setMqttBrokerUrl(status.savedConfig.brokerUrl);
                        if (status.savedConfig?.username) setMqttUsername(status.savedConfig.username);
                      }
                      showToast("Konfiguration gespeichert!", "success");
                    } catch {}
                  }} style={{ fontSize: "var(--text-sm-size)" }} className="px-5 py-2.5 rounded-lg bg-white border border-neutral-border text-neutral-dark hover:bg-page-grey transition-colors font-medium">
                    Konfiguration speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: "var(--text-xs-size)" }} className="text-neutral-mid">Zuletzt aktualisiert: {new Date().toLocaleTimeString("de-DE")}</p>
      </main>
    </div>
  );
}
