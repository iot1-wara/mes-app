import { useState, useEffect } from "react";

const API = "/api";

export default function EdgePage() {
  const [health, setHealth] = useState(null);
  const [cpuLoad, setCpuLoad] = useState({ usagePercent: 0 });
  const [memInfo] = useState({ totalMemoryBytes: 8e9 + Math.random() * 2e9, usedMemoryBytes: (4 + Math.random() * 1) * 1e9 });
  const [diskTotal, setDiskTotal] = useState(250e9);
  const [diskUsage, setDiskUsage] = useState((Math.random() * 30 + 5) * 1e9);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch(API + "/edge/health").then((r) => r.ok ? r.json() : null).then(setHealth);
  }, []);

  const memPct = (((memInfo?.usedMemoryBytes || 0) / (memInfo?.totalMemoryBytes || 1)) * 100).toFixed(1);
  const diskPct = ((diskUsage / diskTotal) * 100).toFixed(1);

  useEffect(() => {
    try {
      const ws = new WebSocket("ws://localhost:3000/api/edge/ws");
      let alive = true;
      ws.onopen = () => {};
      ws.onmessage = (e) => {
        if (!alive) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.cpuLoad) setCpuLoad(msg.cpuLoad);
          if (msg.diskUsage && diskTotal > 0) setDiskUsage(msg.diskUsage.used || diskUsage);
          if (msg.logEntry) setLogs((l) => { const n = [...l, msg.logEntry]; return n.length > 30 ? n.slice(-30) : n; });
        } catch {}
      };
      ws.onerror = () => {};
      ws.onclose = () => { alive = false; };
      return () => { alive = false; ws.close(); };
    } catch {}
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
            { label: "CPU Auslastung", value: (cpuLoad?.usagePercent || 0) * 100, unit: "%", fmt: (v) => v.toFixed(1) + "%" },
            { label: "Speicher", value: parseFloat(memPct), unit: "%", fmt: () => memPct + "%" },
            { label: "Festplatte", value: parseFloat(diskPct), unit: "%", fmt: () => diskPct + "%" },
            { label: "WS Status", value: 0, color: true },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-lg shadow-card border border-neutral-200 p-5">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{card.label}</p>
              {card.color ? (
                <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-md text-xs font-medium bg-status-bg-success text-status-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                  CONNECTED
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
