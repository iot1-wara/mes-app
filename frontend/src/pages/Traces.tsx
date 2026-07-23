import { useState, useEffect } from "react";
import StatCard from "../components/StatCard";
import { api } from "../api/client";

export default function TracesPage() {
  const [traces, setTraces] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all");
  const [categoryInput, setCategoryInput] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [valueMin, setValueMin] = useState("");
  const [valueMax, setValueMax] = useState("");

  const validCategories = process.env.NODE_ENV === "production" ? [] : [];
  useEffect(() => {
    loadTraces();
    api.get("/machines").then((d) => {
      if (Array.isArray(d)) setMachines(d);
    }).catch(() => {});
  }, [filter, machineFilter, keyFilter, valueMin, valueMax]);

  async function loadTraces() {
    const params: Record<string, string> = {};
    if (filter !== "all") params.category = filter;
    if (machineFilter !== "all") params.machine_id = machineFilter;
    if (keyFilter) params.key_data_point = keyFilter;
    if (valueMin) params.value_min = valueMin;
    if (valueMax) params.value_max = valueMax;
    const qs = new URLSearchParams(params).toString();
    api.get("/traces" + (qs ? "?" + qs : "")).then((d) => {
      setTraces(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false)).catch(() => {});
  }

  const allCategories = [...new Set(traces.map(t => t.category).filter(Boolean))];

  const filtered = traces.filter((t) => {
    const catMatch = filter === "all" || (t.category||"").toLowerCase() === filter.toLowerCase();
    const machMatch = machineFilter === "all" || t.machineId === machineFilter;
    return catMatch && machMatch;
  });

  function catClass(c) {
    if (c === "production") return "bg-status-bg-success text-status-success";
    if (c === "temperature") return "bg-status-bg-info text-status-info";
    if (c === "pressure") return "bg-status-bg-warning text-status-warning";
    if (c === "material") return "bg-accent-lilac-bg text-brand-lilac";
    if (c === "op_input") return "bg-brand-primary/10 text-brand-primary";
    return "";
  }

  async function addTrace(e) {
    e.preventDefault();
    try {
      await api.post("/traces", { category: categoryInput });
      setCategoryInput("");
      await loadTraces();
    } catch {}
  }

  function clearFilters() {
    setFilter("all");
    setMachineFilter("all");
    setKeyFilter("");
    setValueMin("");
    setValueMax("");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Process Traces</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Erfassungsdaten aller Stationen</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Gesamt" value={String(traces.length)} icon="" />
          <StatCard label="Kategorien" value={String(allCategories.length)} icon="" />
          <StatCard label="Maschinen" value={String(machines.length)} icon="" />
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          {["all", ...allCategories].map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${filter === c ? "bg-brand-primary text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"}`}>
              {c === "all" ? "Alle" : c}
            </button>
          ))}
          <select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)} className="px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg">
            <option value="all">Alle Maschinen</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.machineName}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap items-center bg-white p-3 rounded-lg border border-neutral-200">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Erweiterte Filter:</span>
          <input type="text" value={keyFilter} onChange={(e) => setKeyFilter(e.target.value)} placeholder="key_data_point (partial match)..." className="flex-1 min-w-[200px] border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
          <input type="number" value={valueMin} onChange={(e) => setValueMin(e.target.value)} placeholder="min werte..." className="w-[120px] border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
          <input type="number" value={valueMax} onChange={(e) => setValueMax(e.target.value)} placeholder="max werte..." className="w-[120px] border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
          <button onClick={clearFilters} className="px-3 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200">Zuricksetzen</button>
        </div>

        <form onSubmit={addTrace} className="flex gap-2">
          <input type="text" value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} placeholder="Kategorie eingeben..." className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
          <button type="submit" className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-[var(--color-brand-primary-dark)]">Hinzufugen</button>
        </form>

        {loading && <p className="text-center text-neutral-400 py-12 text-sm">Laden...</p>}

        {!loading && filtered.length === 0 && <p className="text-center text-neutral-400 py-12 text-sm">Keine Traces</p>}

        {filtered.length > 0 && (
          <div className="bg-white rounded-lg shadow-card border border-neutral-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Machine</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Kategorie</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Key Data Point</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Value</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Zeitstempel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((t) => {
                  const ts = t.collected_at ? new Date(t.collected_at).toLocaleString("de-DE") : (t.timestamp ? new Date(t.timestamp).toLocaleString("de-DE") : "-");
                  return (
                    <tr key={t.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3.5 text-xs font-mono text-neutral-500">{(t.id||"").substring(0, 8)}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-700">{t.machineId || "-"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${catClass(t.category)}`}>
                          {t.category ? t.category.charAt(0).toUpperCase() + t.category.slice(1) : "-"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-neutral-700 font-mono">{t.keyDataPoint || t.key_data_point || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-700 font-mono">{t.value ?? "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-700 font-mono">{t.value ?? "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-600">{ts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
