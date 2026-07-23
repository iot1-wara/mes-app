import { useState, useEffect } from "react";
import StatCard from "../components/StatCard";
import { api } from "../api/client";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [machines, setMachines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [carriers, setCarriers] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", priority: 5, machine_id: "", operation: "", quantity: 1 });
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [loadingCarrier, setLoadingCarrier] = useState(null);

  useEffect(() => {
    api.get("/orders").then((d) => { if (Array.isArray(d)) setOrders(d); }).catch(() => {});
    api.get("/orders/stats").then((s) => { if (s) setStats(s); }).catch(() => {});
    api.get("/machines").then((d) => { if (Array.isArray(d)) setMachines(d); }).catch(() => {});
  }, []);

  const refreshOrders = () => {
    api.get("/orders").then((d) => { if (Array.isArray(d)) setOrders(d); }).catch(() => {});
    api.get("/orders/stats").then((s) => { if (s) setStats(s); }).catch(() => {});
  };

  function handleDelete(id: string) {
    if (!confirm("Auftrag wirklich loeschen?")) return;
    api.del("/orders/" + id).then(() => refreshOrders()).catch(() => {});
  }

  const TRANSITION_MAP = {
    pending: ["released", "cancelled"],
    released: ["in_progress", "cancelled", "on_hold"],
    in_progress: ["completed", "on_hold", "cancelled"],
    on_hold: ["in_progress"],
    completed: [],
    cancelled: []
  };

  function handleStatusChange(id: string, newStatus: string) {
    api.post(`/orders/${id}/${newStatus}`, {}).then(() => refreshOrders()).catch(() => {});
  }

  async function createCarrier(orderId: string) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    
    await api.post("/orders/carriers", {
      order_id: orderId,
      name: `WERKST-${orderId.substring(0,6)}`,
      current_station_id: order.machine_id || "",
      next_resource_id: order.machine_id || "",
      iStepNo: 0,
      nextStepNo: 1,
    });
    refreshOrders();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = form.id ? "/orders/" + form.id : "/orders";
    const method = form.id ? "patch" : "post";
    api[method](url, {
      name: form.name,
      priority: +(form.priority || 5),
      machine_id: form.machine_id,
      operation: form.operation,
      quantity: +(form.quantity || 1)
    }).then(() => {
      refreshOrders();
      setShowModal(false);
      setForm({ id: null, name: "", priority: 5, machine_id: "", operation: "", quantity: 1 });
    }).catch(() => {});
  }

  function openEdit(order: any) {
    setForm({
      id: order.id,
      name: order.name || "",
      priority: order.priority || 5,
      machine_id: order.machine_id || "",
      operation: order.operation || "",
      quantity: order.quantity || 1
    });
    setShowModal(true);
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  useEffect(() => {
    api.get("/orders/carriers/list").then((d) => { if (Array.isArray(d)) setCarriers(d); }).catch(() => {});
  }, []);

  const statusColors: Record<string, string> = {
    pending: "bg-status-bg-warning text-status-warning",
    released: "bg-brand-lilac-bg text-brand-lilac",
    in_progress: "bg-status-bg-info text-status-info",
    completed: "bg-status-bg-success text-status-success",
    cancelled: "bg-neutral-200 text-neutral-500",
    on_hold: "bg-accent-lilac-bg text-brand-lilac"
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Auftraege</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Verwaltung aller Produktionsauftraege</p>
        </div>

        <div className="grid grid-cols-6 gap-4" style={{ width: 'fit-content' }}>
          <StatCard label="Alle" value={String(stats?.total ?? orders.length)} icon="" />
          <StatCard label="Pending" value={String(stats?.pending ?? orders.filter((o) => o.status === "pending").length)} icon=""/>
          <StatCard label="Released" value={String(stats?.released ?? '0')} icon=""/><StatCard label="In Progress" value={String(stats?.in_progress ?? orders.filter((o) => o.status === "in_progress").length)} icon=""/>
          <StatCard label="Completed" value={String(stats?.completed ?? orders.filter((o) => o.status === "completed").length)} icon=""/>
          <StatCard label="On Hold" value={String(stats?.on_hold ?? orders.filter((o) => o.status === "on_hold").length)} icon=""/>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-1.5" role="group">
            {["all", "pending", "released", "in_progress", "completed", "cancelled", "on_hold"].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${filter === s ? "bg-brand-primary text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"}`}>
                {s === "all" ? "Alle" : s}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCarrierModal(true)} className="bg-brand-accent text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-[#b98cff] transition-colors">
              + Neuer Werktraeger
            </button>
            <button onClick={() => { setShowModal(true); setForm({ id: null, name: "", priority: 5, machine_id: "", operation: "", quantity: 1 }); }} className="bg-brand-primary text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-[var(--color-brand-primary-dark)] transition-colors">
              + Neuer Auftrag
            </button>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="bg-white rounded-lg shadow-card border border-neutral-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Maschine</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Operation</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Fortschritt</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((o) => {
                  const progress = o.quantity > 0 ? ((o.completed_quantity ?? 0) / o.quantity * 100).toFixed(0) : '0';
                  return (
                    <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-mono text-neutral-500">{(o.id||"").substring(0,8)}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-800 font-medium">{o.name}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-600">{machines.find((m) => m.id === o.machine_id)?.name || o.machine_id?.substring(0,8) || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-600">{o.operation || "-"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-primary transition-all" style={{ width: `${progress}%`}} />
                          </div>
                          <span className="text-xs text-neutral-500">{o.completed_quantity ?? 0}/{o.quantity}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[o.status] || "bg-neutral-100"}`}>
                          {o.status}
                        </span>
                        {o.sps_flags && Object.keys(o.sps_flags).length > 0 && (
                          <div className="mt-1 flex gap-0.5">
                            {Object.entries(o.sps_flags).map(([key, val]: [string, any]) => (
                              <span key={key} title={`${key}: ${String(val)}`} className={`w-2 h-2 rounded-full ${val ? 'bg-status-success' : 'bg-neutral-300'}`} />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {TRANSITION_MAP[o.status]?.includes('released') && (
                          <button onClick={() => handleStatusChange(o.id, "released")} className="mx-1 px-3 py-1.5 text-xs font-medium text-brand-lilac bg-white border border-brand-accent rounded-md hover:bg-accent-lilac-bg transition-colors">
                            Release
                          </button>
                        )}
                        {TRANSITION_MAP[o.status]?.includes('in_progress') && (
                          <button onClick={() => handleStatusChange(o.id, "in_progress")} className="mx-1 px-3 py-1.5 text-xs font-medium text-status-info border border-status-info bg-white rounded-md hover:bg-status-bg-success transition-colors">
                            Start
                          </button>
                        )}
                        {TRANSITION_MAP[o.status]?.includes('on_hold') && (
                          <button onClick={() => handleStatusChange(o.id, "on_hold")} className="mx-1 px-3 py-1.5 text-xs font-medium text-status-warning border border-status-warning bg-white rounded-md hover:bg-status-bg-warning transition-colors">
                            Hold
                          </button>
                        )}
                        {TRANSITION_MAP[o.status]?.includes('completed') && (
                          <button onClick={() => handleStatusChange(o.id, "completed")} className="mx-1 px-3 py-1.5 text-xs font-medium text-status-success border border-status-success bg-white rounded-md hover:bg-status-bg-success transition-colors">
                            Finish
                          </button>
                        )}
                        {TRANSITION_MAP[o.status]?.includes('cancelled') && (
                          <button onClick={() => handleStatusChange(o.id, "cancelled")} className="mx-1 px-3 py-1.5 text-xs font-medium text-status-error border border-status-error bg-white rounded-md hover:bg-status-bg-error transition-colors">
                            Cancel
                          </button>
                        )}
                        {o.status === 'released' && (
                          <button onClick={() => createCarrier(o.id)} disabled={loadingCarrier === o.id} className="mx-1 px-2 py-1.5 text-xs font-medium bg-accent-lilac text-brand-lilac border border-brand-lilac rounded-md hover:bg-brand-lilac hover:text-white transition-colors">
                            {loadingCarrier === o.id ? 'Erstelle...' : '+ Werktraeger'}
                          </button>
                        )}
                        <button onClick={() => openEdit(o)} className="mx-1 px-3 py-1.5 text-xs font-medium text-neutral-dark bg-neutral-stroke rounded-md hover:bg-neutral-border transition-colors">
                            Edit
                          </button>
                        <button onClick={() => handleDelete(o.id)} className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-status-error rounded-md hover:bg-[var(--color-status-error-dark)] transition-colors" disabled={o.status === 'completed' || o.status === 'in_progress'}>
                          x
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-neutral-400 py-12 text-sm">Keine Auftraege gefunden</p>
        )}

        {showCarrierModal && (
          <div onClick={() => setShowCarrierModal(false)} className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-lg p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Neuer Werktraeger</h2>
              <div className="space-y-4">
                {carriers.length > 0 && (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>{carriers.map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-1 text-sm">{c.name}</td>
                        <td className="px-3 py-1"><span className={`text-xs px-1 py-0.5 rounded ${c.status === 'idle' ? 'bg-neutral-100' : c.status === 'in_process' ? 'bg-status-bg-info text-status-info' : c.status === 'at_station' ? 'bg-status-success text-white' : ''}`}>{c.status}</span></td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                )}
                <div className="flex gap-2 justify-end pt-4">
                  <button type="button" onClick={() => setShowCarrierModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">
                    Schliessen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div onClick={() => setShowModal(false)} className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">{form.id ? "Auftrag bearbeiten" : "Neuer Auftrag"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Maschine</label>
                  <select value={form.machine_id} onChange={(e) => setForm((f) => ({ ...f, machine_id: e.target.value }))} required className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                    <option value="">-- Waehle Maschine --</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>{m.name || m.machineName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Operation</label>
                  <input type="text" value={form.operation} onChange={(e) => setForm((f) => ({ ...f, operation: e.target.value }))} required className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Menge</label>
                    <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} min="1" required className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Prioritaet</label>
                    <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                      {[1,2,3,4,5].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => { setShowModal(false); setForm({ id: null, name: "", priority: 5, machine_id: "", operation: "", quantity: 1 }); }} className="px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">
                    Abbrechen
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-[var(--color-brand-primary-dark)] transition-colors">
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
