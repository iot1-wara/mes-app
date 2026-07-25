import { useState, useEffect } from "react";
import StatCard from "../components/StatCard";
import { api } from "../api/client";

export default function CarriersPage() {
  const [carriers, setCarriers] = useState<any[]>([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", current_station_id: "", next_resource_id: "", iStepNo: 0, nextStepNo: 1 });

  useEffect(() => {
    Promise.all([
      api.get("/orders/carriers").catch(() => []),
      api.get("/orders/carriers/stats").catch(() => null),
    ]).then(([d, s]) => {
      setCarriers(Array.isArray(d) ? d : []);
      if (s) setStats(s);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? carriers : carriers.filter(c => c.status === filter);
  const statusColors: Record<string, string> = {
    idle: "bg-status-bg-warning text-status-warning",
    in_process: "bg-status-bg-info text-status-info",
    at_station: "bg-status-bg-success text-status-success",
    completed: "bg-neutral-stroke text-neutral-mid",
  };

  function handleStatusChange(id: string, newStatus: string) {
    api.patch(`/orders/carriers/${id}`, { status: newStatus }).then(() => {
      setCarriers(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    }).catch(() => {});
  }

  function handleDelete(id: string) {
    if (!confirm("Werkstückträger wirklich löschen?")) return;
    api.del(`/orders/carriers/${id}`).then(() => {
      setCarriers(prev => prev.filter(c => c.id !== id));
    }).catch(() => {});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = form.id ? `/orders/carriers/${form.id}` : "/orders/carriers";
    const method = form.id ? "patch" : "post";
    api[method](url, {
      name: form.name,
      current_station_id: form.current_station_id,
      next_resource_id: form.next_resource_id,
      iStepNo: form.iStepNo,
      nextStepNo: form.nextStepNo,
    }).then(() => {
      api.get("/orders/carriers").then(d => setCarriers(Array.isArray(d) ? d : [])).catch(() => {});
      setShowModal(false);
      setForm({ id: null, name: "", current_station_id: "", next_resource_id: "", iStepNo: 0, nextStepNo: 1 });
    }).catch(() => {});
  }

  function openEdit(c: any) {
    setForm({
      id: c.id,
      name: c.name || "",
      current_station_id: c.current_station_id || "",
      next_resource_id: c.next_resource_id || "",
      iStepNo: c.iStepNo ?? 0,
      nextStepNo: c.nextStepNo ?? 1,
    });
    setShowModal(true);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-neutral-900">Werkstückträger</h1>
        <p className="text-sm text-neutral-mid mb-6">Verwaltung aller Produktions-Werkstückträger</p>

        {!loading && (
          <div className="flex gap-3">
            <button onClick={() => { setShowModal(true); setForm({ id: null, name: "", current_station_id: "", next_resource_id: "", iStepNo: 0, nextStepNo: 1 }); }} className="bg-brand-primary text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-[var(--color-brand-primary-dark)] active:bg-[#b96306] transition-colors">
              + Neuer Werkstückträger
            </button>
          </div>
        )}

        <div className="flex gap-1.5" role="group">
          {["all", "idle", "in_process", "at_station", "completed"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${filter === s ? "bg-brand-primary text-white" : "bg-white text-neutral-dark border border-neutral-border hover:bg-neutral-stroke"}`}>
              {s === "all" ? "Alle" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        <table className="w-full bg-white rounded-[var(--radius-lg)] overflow-hidden shadow-card border border-neutral-border">
          <thead>
            <tr className="bg-neutral-stroke">
              <th className="px-6 py-3.5 text-left text-xs uppercase tracking-wider font-semibold text-neutral-mid">ID</th>
              <th className="px-6 py-3.5 text-left text-xs uppercase tracking-wider font-semibold text-neutral-mid">Name</th>
              <th className="px-6 py-3.5 text-left text-xs uppercase tracking-wider font-semibold text-neutral-mid">Station</th>
              <th className="px-6 py-3.5 text-left text-xs uppercase tracking-wider font-semibold text-neutral-mid">Nächste Ressource</th>
              <th className="px-6 py-3.5 text-left text-xs uppercase tracking-wider font-semibold text-neutral-mid">Status</th>
              <th className="px-6 py-3.5 text-right text-xs uppercase tracking-wider font-semibold text-neutral-mid">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-mid">Laden...</td></tr>
            ) : filtered.length > 0 ? (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-neutral-stroke hover:bg-neutral-stroke/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono text-neutral-mid">{(c.id || "").substring(0, 8)}</td>
                  <td className="px-6 py-4 text-base text-neutral-dark font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-base text-neutral-mid">{c.current_station_id?.substring(0, 8) || "-"}</td>
                  <td className="px-6 py-4 text-base text-neutral-mid">{c.next_resource_id?.substring(0, 8) || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || "bg-neutral-100 text-neutral-mid"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-3 justify-end">
                      {c.status !== "completed" && (
                        <button onClick={() => handleStatusChange(c.id, "completed")} className="text-neutral-mid hover:text-status-success font-medium px-1 py-0.5 rounded-md transition-colors text-xs hover:bg-status-bg-success">
                          Fertig
                        </button>
                      )}
                      {c.status !== "completed" && (
                        <button onClick={() => openEdit(c)} className="text-neutral-mid hover:text-brand-primary font-medium px-1 py-0.5 rounded-md transition-colors text-xs hover:bg-neutral-stroke">
                          Edit
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)} className="text-neutral-mid hover:text-status-error font-medium px-1 py-0.5 rounded-md transition-colors text-xs hover:bg-status-bg-error">
                          Loeschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-mid">Keine Werkstückträger gefunden</td></tr>
            )}
          </tbody>
        </table>

        {showModal && (
          <div onClick={() => setShowModal(false)} className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[var(--radius-lg)] shadow-card w-full max-w-md p-6">
              <h2 className="text-[var(--text-xl-size)] font-bold text-neutral-black mb-4">{form.id ? "Werkstückträger bearbeiten" : "Neuer Werkstückträger"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full bg-white border border-neutral-border rounded-md px-3 py-2 text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all" />
                </div>
                <div>
                  <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">Aktuelle Station</label>
                  <input type="text" value={form.current_station_id} onChange={(e) => setForm(f => ({ ...f, current_station_id: e.target.value }))} className="w-full bg-white border border-neutral-border rounded-md px-3 py-2 text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all" />
                </div>
                <div>
                  <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">Nächste Ressource</label>
                  <input type="text" value={form.next_resource_id} onChange={(e) => setForm(f => ({ ...f, next_resource_id: e.target.value }))} className="w-full bg-white border border-neutral-border rounded-md px-3 py-2 text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">Schritt Start</label>
                    <input type="number" value={form.iStepNo} onChange={(e) => setForm(f => ({ ...f, iStepNo: Number(e.target.value) }))} className="w-full bg-white border border-neutral-border rounded-md px-3 py-2 text-neutral-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">Nächster Schritt</label>
                    <input type="number" value={form.nextStepNo} onChange={(e) => setForm(f => ({ ...f, nextStepNo: Number(e.target.value) }))} className="w-full bg-white border border-neutral-border rounded-md px-3 py-2 text-neutral-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => { setShowModal(false); setForm({ id: null, name: "", current_station_id: "", next_resource_id: "", iStepNo: 0, nextStepNo: 1 }); }} className="px-4 py-2 text-sm font-medium text-neutral-dark bg-neutral-stroke rounded-lg hover:bg-neutral-border transition-colors">
                    Abbrechen
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-[var(--color-brand-primary-dark)] active:bg-[#b96306] transition-colors">
                    {form.id ? "Aktualisieren" : "Erstellen"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
