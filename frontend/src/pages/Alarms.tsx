import { useState, useEffect } from "react";
import { api, showToast } from "../api/client";
import StatCard from "../components/StatCard";

const API = "/api";

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    api.get("/alarms").then((d) => {
      setAlarms(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? alarms : alarms.filter((a) => (a.severity||"").toLowerCase() === filter.toLowerCase());
  const activeCount = alarms.filter((a) => !a.acknowledged_at).length;

  function sevClass(sev) {
    const s = (sev||"").toLowerCase();
    if (s === "info") return "bg-status-bg-info text-status-info";
    if (s === "warning") return "bg-status-bg-warning text-status-warning";
    if (s === "error" || s === "critical") return "bg-status-bg-error text-status-error";
    return "";
  }

  function toggleSelect(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function selectAll() {
    setSelected(prev => { const ids = filtered.map(a => a.id); if (prev.size === ids.length) return new Set(); else return new Set(ids); });
  }

  async function handleAcknowledge(id) {
    try {
      await api.post(`/alarms/${id}/acknowledge`, {});
      showToast("Alarm acknowledged", "success");
      setAlarms(prev => prev.map(a => a.id === id ? { ...a, acknowledged_at: new Date().toISOString() } : a));
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function handleBulkAcknowledge() {
    try {
      const res = await api.post("/alarms/bulk-acknowledge", { ids: Array.from(selected) });
      const acked = res.affected || res.length || selected.size;
      showToast(`${acked} Alarme acknowledged`, "success");
      setAlarms(prev => prev.map(a => selected.has(a.id) ? { ...a, acknowledged_at: new Date().toISOString() } : a));
      setSelected(new Set());
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Alarm wirklich loeschen?")) return;
    try {
      await api.del(`/alarms/${id}`);
      showToast("Alarm deleted", "success");
      setAlarms(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Alarme</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Ubersicht aller Alarme</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Aktiv" value={String(activeCount)} icon="" />
          <StatCard label="Acknowledged" value={String(alarms.length - activeCount)} icon="" />
          <StatCard label="Ausgewahlt ({selected.size})" value={String(selected.size)} icon="" />
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          {["all","info","warning","error","critical"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${filter === s ? "bg-brand-primary text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"}`}>
              {s}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button onClick={selectAll} className="px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50">
              {selected.size === filtered.length && filtered.length > 0 ? "Alle abwahlen" : "Alle waehlen"}
            </button>
            {selected.size > 0 && (
              <button onClick={handleBulkAcknowledge} className="px-3 py-2 text-xs font-medium text-white bg-status-success rounded-lg hover:bg-[var(--color-status-success-dark)]">
                Bulk Acknowledge ({selected.size})
              </button>
            )}
            <button onClick={() => {
              api.getText("/alarms/export/csv").then((csv) => {
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "alarms-export.csv";
                a.click();
                URL.revokeObjectURL(url);
              }).catch(err => showToast(err.message, "error"));
            }} className="px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50">
              Export CSV
            </button>
          </div>
        </div>

        {loading && <p className="text-center text-neutral-400 py-12 text-sm">Laden...</p>}

        {!loading && filtered.length === 0 && <p className="text-center text-neutral-400 py-12 text-sm">Keine Alarme</p>}

        {filtered.length > 0 && (
          <div className="bg-white rounded-lg shadow-card border border-neutral-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-10">
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="w-4 h-4 rounded border-neutral-300" />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Machine</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Nachricht</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Schweregrad</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((a) => (
                  <tr key={a.id} className={`hover:bg-neutral-50 transition-colors ${selected.has(a.id) ? "bg-brand-primary/5" : ""} ${a.acknowledged_at ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3.5">
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)} className="w-4 h-4 rounded border-neutral-300" />
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-neutral-500">{(a.id||"").substring(0, 8)}</td>
                    <td className="px-5 py-3.5 text-sm text-neutral-700">{a.machineId || "-"}</td>
                    <td className="px-5 py-3.5 text-sm text-neutral-700">{a.message || a.description || "-"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${sevClass(a.severity)}`}>
                        {a.severity ? a.severity.charAt(0).toUpperCase() + a.severity.slice(1) : "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!a.acknowledged_at && (
                        <button onClick={() => handleAcknowledge(a.id)} className="mx-1 px-3 py-1.5 text-xs font-medium text-status-success border border-status-success bg-white rounded-md hover:bg-status-bg-success">
                          Ack
                        </button>
                      )}
                      <button onClick={() => handleDelete(a.id)} className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-status-error rounded-md hover:bg-[var(--color-status-error-dark)]">
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

