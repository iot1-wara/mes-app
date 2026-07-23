import { useState, useEffect } from "react";
import StatCard from "../components/StatCard";
import { api } from "../api/client";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", priority: 5, machine_id: "", operation: "", quantity: 1 });
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    api.get("/orders").then((d) => { if (Array.isArray(d)) setOrders(d); }).catch(() => {});
    api.get("/machines").then((d) => { if (Array.isArray(d)) setMachines(d); }).catch(() => {});
  }, []);

  function handleDelete(id: string) {
    if (!confirm("Auftrag wirklich loeschen?")) return;
    api.del("/orders/" + id).then(() => setOrders((prev) => prev.filter((o) => o.id !== id))).catch(() => {});
  }

  function handleStatusChange(id: string, newStatus: string) {
    api.patch("/orders/" + id, { status: newStatus, completed_quantity: newStatus === "completed" ? 0 : undefined }).then(() => {
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o));
    }).catch(() => {});
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
      refreshList();
      setShowModal(false);
      setForm({ id: null, name: "", priority: 5, machine_id: "", operation: "", quantity: 1 });
    }).catch(() => {});
  }

  function refreshList() {
    api.get("/orders").then((d) => { if (Array.isArray(d)) setOrders(d); }).catch(() => {});
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
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const activeCount = orders.filter((o) => o.status === "in_progress").length;

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Auftraege</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Verwaltung aller Produktionsauftraege</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Alle" value={String(orders.length)} icon="" />
          <StatCard label="Pending" value={String(pendingCount)} icon="" />
          <StatCard label="In Progress" value={String(activeCount)} icon="" />
          <StatCard label="Completed" value={String(orders.filter((o) => o.status === "completed").length)} icon="" />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-1.5" role="group">
            {["all", "pending", "in_progress", "completed", "cancelled", "on_hold"].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${filter === s ? "bg-brand-primary text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"}`}>
                {s === "all" ? "Alle" : s}
              </button>
            ))}
          </div>
          <button onClick={() => { setShowModal(true); setForm({ id: null, name: "", priority: 5, machine_id: "", operation: "", quantity: 1 }); }} className="bg-brand-primary text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-[var(--color-brand-primary-dark)] transition-colors">
            + Neuer Auftrag
          </button>
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
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Menge</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((o) => {
                  const statusColors = {
                    pending: "bg-status-bg-warning text-status-warning",
                    in_progress: "bg-status-bg-info text-status-info",
                    completed: "bg-status-bg-success text-status-success",
                    cancelled: "bg-neutral-200 text-neutral-500",
                    on_hold: "bg-accent-lilac-bg text-brand-lilac"
                  };
                  return (
                    <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-mono text-neutral-500">{(o.id||"").substring(0,8)}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-800 font-medium">{o.name}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-600">{machines.find((m) => m.id === o.machine_id)?.name || o.machine_id?.substring(0,8) || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-600">{o.operation || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-neutral-600">
                        {o.completed_quantity !== undefined ? `${o.completed_quantity}/${o.quantity}` : o.quantity}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[o.status] || "bg-neutral-100"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {o.status === "pending" && (
                          <button onClick={() => handleStatusChange(o.id, "in_progress")} className="mx-1 px-3 py-1.5 text-xs font-medium text-status-info border border-status-info bg-white rounded-md hover:bg-status-bg-success transition-colors">
                            Start
                          </button>
                        )}
                        {o.status === "in_progress" && (
                          <button onClick={() => handleStatusChange(o.id, "completed")} className="mx-1 px-3 py-1.5 text-xs font-medium text-status-success border border-status-success bg-white rounded-md hover:bg-status-bg-success transition-colors">
                            Finish
                          </button>
                        )}
                        {o.status === "in_progress" && (
                          <button onClick={() => handleStatusChange(o.id, "on_hold")} className="mx-1 px-3 py-1.5 text-xs font-medium text-status-warning border border-status-warning bg-white rounded-md hover:bg-status-bg-warning transition-colors">
                            Hold
                          </button>
                        )}
                        <button onClick={() => openEdit(o)} className="mx-1 px-3 py-1.5 text-xs font-medium text-neutral-dark bg-neutral-stroke rounded-md hover:bg-neutral-border transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(o.id)} className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-status-error rounded-md hover:bg-[var(--color-status-error-dark)] transition-colors">
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
                    <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} min="1" required className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Prioritaet</label>
                    <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
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
