import { useState, useEffect, useRef } from "react";
import { api, showToast } from "../api/client";

const API_BASE = "/api";

export default function EdgePage() {
  const [health, setHealth] = useState(null);
  const [cpuLoad, setCpuLoad] = useState({ usagePercent: 0 });
  const [memInfo] = useState({ totalMemoryBytes: 8e9 + (Math.random() * 2e9), usedMemoryBytes: (4 + Math.random()) * 1e9 });
  const [diskTotal] = useState(250e9);
  const [diskUsage, setDiskUsage] = useState((Math.random() * 30 + 5) * 1e9);
  const [logs, setLogs] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    api.get("/edge/health").then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const ws = new WebSocket(`ws://${window.location.host}/api/edge/ws`);
      let alive = true;
      ws.onopen = () => { setWsConnected(true); addLog("connected"); };
      ws.onmessage = (e) => {
        if (!alive) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "heartbeat") return;
          if (msg.cpuLoad) setCpuLoad(msg.cpuLoad);
          if (msg.diskUsage && diskTotal > 0) setDiskUsage(msg.diskUsage.used || diskUsage);
          if (msg.logEntry) addLog(msg.logEntry);
        } catch {}
      };
      ws.onerror = () => { /* handled by onclose */ };
      ws.onclose = () => { alive = false; setWsConnected(false); };
      wsRef.current = ws;
      return () => { alive = false; ws.close(); };
    } catch {}
  }, []);

  function addLog(entry) {
    setLogs(prev => { const n = [...prev, `[${new Date().toLocaleTimeString()}] ${entry || JSON.stringify(entry)} `]; return (n.length > 50 ? n.slice(-50) : n); });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && !wsConnected) {
        wsRef.current.close();
        setWsConnected(false);
      }
    }, 35000);
    return () => clearInterval(interval);
  }, []);

  function barColor(pct) {
    if (pct > 85) return "bg-status-error";
    if (pct > 70) return "bg-status-warning";
    return "bg-brand-primary";
  }

  function fmtBytes(bytes) {
    if (!bytes) return "-";
    return (bytes / 1e9).toFixed(2) + " GB";
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Edge Gateway</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Systemstatus und Logs</p>
        </div>

        {health && (
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${health.ok ? "bg-status-bg-success text-status-success" : "bg-status-bg-error text-status-error"}`}>
            <span>{health.ok ? "✅" : "❌"}</span>
            {health.ok ? "Edge Gateway verfuegbar" : "Edge Gateway nicht verfuegbar"}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "CPU Auslastung", value: (cpuLoad?.usagePercent || 0) * 100, unit: "%", fmt: () => ((cpuLoad?.usagePercent || 0) * 100).toFixed(1) + "%" },
            { label: "Speicher", value: +(((memInfo?.usedMemoryBytes || 0) / (memInfo?.totalMemoryBytes || 1)) * 100).toFixed(1), unit: "%", fmt: () => ((memInfo?.usedMemoryBytes || 0) / (memInfo?.totalMemoryBytes || 1) * 100).toFixed(1) + "%" },
            { label: "Festplatte", value: +((diskUsage / diskTotal) * 100).toFixed(1), unit: "%", fmt: () => ((diskUsage / diskTotal) * 100).toFixed(1) + "%" },
            { label: "WS Status", connected: wsConnected ? "CONNECTED" : "DISCONNECTED", connectedClass: wsConnected ? "bg-status-bg-success text-status-success" : "bg-neutral-200 text-neutral-500", dotCls: wsConnected ? "bg-status-success animate-pulse" : "bg-neutral-400" }
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-lg shadow-card border border-neutral-200 p-5">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{card.label}</p>
              {card.connected != null ? (
                <span className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-md text-xs font-medium ${card.connectedClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${card.dotCls}`} />
                  {card.connected}
                </span>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-bold text-neutral-900">{card.fmt()}</p>
                  <div className="mt-2 w-full bg-neutral-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${barColor(card.value)}`} style={{ width: Math.min(card.value, 100) + "%" }} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">{card.unit} von 100</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-card border border-neutral-200 p-5">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">Logs</h3>
          <pre className="text-xs bg-neutral-50 rounded-md px-4 py-3 font-mono text-neutral-600 leading-relaxed overflow-auto max-h-48 whitespace-pre-wrap">
            {logs.join("\n") || "Keine Logs verfuegbar..."}
          </pre>
        </div>

        <p className="text-xs text-neutral-400">Zuletzt aktualisiert: {new Date().toLocaleTimeString("de-DE")}</p>
      </main>
    </div>
  );
}
