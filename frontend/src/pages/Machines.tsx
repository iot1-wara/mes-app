import { useState, useEffect } from "react";
import StatCard from "../components/StatCard";
import { api, showToast } from "../api/client";

function MachineStatusBadge({ status }: { status?: string }) {
  const ok = ["online", "running"].includes(status || "");
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${ok ? "bg-status-bg-success text-status-success" : "bg-status-bg-error text-status-error"}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "-"}
    </span>
  );
}

function MachineName({ name, machineName, status }: { name?: string; machineName?: string; status?: string }) {
  const ok = ["online", "running"].includes(status || "");
  return (
    <span className="inline-flex items-center gap-2 text-base text-neutral-dark font-medium">
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-status-success" : "bg-status-error"}`} />
      {name || machineName || "-"}
    </span>
  );
}

function MachineIdCell({ id }: { id?: string }) {
  return <td className="px-6 py-4 text-xs font-mono text-neutral-mid">{(id || "").substring(0, 8)}</td>;
}

function CellActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <td className="px-6 py-4 text-right">
      <button onClick={onEdit} className="text-neutral-mid hover:text-brand-primary font-medium px-1.5 py-0.5 rounded-md transition-colors text-xs hover:bg-neutral-stroke">Bearbeiten</button>
      <span className="inline-flex items-center gap-3 border-l border-neutral-border pl-1"><button onClick={onDelete} className="text-neutral-mid hover:text-status-error font-medium px-1 py-0.5 rounded-md transition-colors text-xs">Loeschen</button></span>
    </td>
  );
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", type: "CNC", location: "" });
  const [search, setSearch] = useState("");
  const [csvMenuOpen, setCsvMenuOpen] = useState(false);

  useEffect(() => {
    api.get("/machines").then((d) => {
      setMachines(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  function handleDelete(id: string) {
    if (!confirm("Station wirklich löschen?")) return;
    api.del("/machines/" + id).then(() => {
      setMachines((prev) => prev.filter((m) => m.id !== id));
    }).catch(() => {});
  }

  function handleEdit(m: any) {
    setShowModal(true);
    setForm({ id: m.id, name: m.name || m.machineName || "", type: m.type || "CNC", location: m.location || "" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = form.id ? "/machines/" + form.id : "/machines";
    const method = form.id ? "patch" : "post";
    api[method](url, { name: form.name, type: form.type || "CNC", location: form.location || "" })
      .then(() => {
        refreshList();
        setShowModal(false);
        setForm({ id: null, name: "", type: "CNC", location: "" });
      }).catch(() => {});
  }

  function refreshList() {
    api.get("/machines").then((d) => {
      setMachines(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }

  function downloadTemplate() {
    api.getText("/machines/export/csv").then((csv) => {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "machines-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    api.post("/machines/import/csv", formData, { headers: {} }).then((res) => {
      const imported = res?.imported || 0;
      showToast(`${imported} Maschinen importiert${res?.errors?.length ? `, ${res.errors.length} Fehler` : ''}`, "success");
      refreshList();
    }).catch((err) => showToast(err.message, "error"));
    e.target.value = "";
  }

  const onlineCount = machines.filter((m) => ["online", "running"].includes(m.status)).length;
  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="p-6 space-y-6">

        <div>
      <h1 className="text-[var(--text-4xl-size)] leading-[var(--text-4xl-line)] font-bold text-neutral-black">Machine Status</h1>
          <p className="text-sm text-neutral-mid mt-0.5">Verwaltung aller Stationen</p>
        </div>

        {/* Status-Karten */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Alle" value={String(machines.length)} />
          <StatCard label="Online" value={String(onlineCount)} />
          <StatCard label="Offline" value={String(machines.length - onlineCount)} />
        </div>

        {/* Toolbar */}
        <div className="flex gap-2">
          <button onClick={() => setShowModal(true)} className="bg-brand-primary text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-[var(--color-brand-primary-dark)] active:bg-[#b96306] transition-colors">
            + Neue Station
          </button>
          <div className="relative inline-block">
            <button onClick={() => setCsvMenuOpen(!csvMenuOpen)} className="px-4 py-2.5 text-sm font-medium text-neutral-dark bg-white border border-neutral-border rounded-lg hover:bg-neutral-stroke transition-colors">
              CSV Import ↓
            </button>
            {csvMenuOpen && (
              <div onClick={(e) => e.stopPropagation()} onBlur={() => setCsvMenuOpen(false)} className="absolute right-0 mt-1 w-48 bg-white border border-neutral-border rounded-lg shadow-card z-10">
                <button onClick={downloadTemplate} className="w-full text-left px-3 py-2 text-sm text-neutral-dark hover:bg-neutral-stroke rounded-t-lg transition-colors">
                  Template herunterladen
                </button>
                <div className="my-1 border-t border-neutral-border" />
                <label className="w-full text-left px-3 py-2 text-sm text-neutral-dark hover:bg-neutral-stroke rounded-b-lg cursor-pointer transition-colors">
                  CSV hochladen
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Suche */}
        <input
          type="text"
          placeholder="Stationen durchsuchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-neutral-border rounded-lg px-4 py-2.5 text-sm text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all"
        />

        {/* Tabelle */}
        {machines.filter((m) => !search || (m.name||"").toLowerCase().includes(search.toLowerCase())).length > 0 ? (
          <div className="bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-stroke">
                  <th className="px-6 py-3.5 text-left text-xs uppercase tracking-wider font-semibold text-neutral-mid">ID</th>
                  <th className="px-6 py-3.5 text-left text-xs uppercase tracking-wider font-semibold text-neutral-mid">Name</th>
                  <th className="px-6 py-3.5 text-left text-xs uppercase tracking-wider font-semibold text-neutral-mid">Typ</th>
                  <th className="px-6 py-3.5 text-left text-xs uppercase tracking-wider font-semibold text-neutral-mid">Status</th>
                  <th className="px-6 py-3.5 text-right text-xs uppercase tracking-wider font-semibold text-neutral-mid">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {machines.filter((m) => !search || (m.name||"").toLowerCase().includes(search.toLowerCase())).map((m, i) => (
                    <tr key={m.id} className="border-b border-neutral-stroke hover:bg-neutral-stroke/50 transition-colors">
                      <MachineIdCell id={m.id} />
                      <td className="px-6 py-4"><MachineName name={m.name} machineName={m.machineName} status={m.status} /></td>
                      <td className="px-6 py-4 text-base text-neutral-mid">{m.type || "CNC"}</td>
                      <td className="px-6 py-4"><MachineStatusBadge status={m.status} /></td>
                      <CellActions onEdit={() => handleEdit(m)} onDelete={() => handleDelete(m.id)} />
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-neutral-mid py-12 text-sm">Keine Stationen gefunden</p>
        )}

        {/* Modal */}
        {showModal && (
          <div onClick={() => setShowModal(false)} className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[var(--radius-lg)] shadow-card w-full max-w-md p-6">
              <h2 className="text-[var(--text-xl-size)] font-bold text-neutral-black mb-4">{form.id ? "Station bearbeiten" : "Neue Station"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required           className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all" />
                </div>
                <div>
                  <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">Typ</label>
                    <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm text-neutral-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all">
                    <option value="CNC">CNC</option>
                    <option value="PLC">PLC</option>
                    <option value="Roboter">Roboter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">Standort</label>
                  <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="w-full bg-white border border-neutral-border rounded-lg px-3 py-2 text-sm text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => { setShowModal(false); setForm({ id: null, name: "", type: "CNC", location: "" }); }} className="px-4 py-2 text-sm font-medium text-neutral-dark bg-neutral-stroke rounded-lg hover:bg-neutral-border transition-colors">
                    Abbrechen
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-[var(--color-brand-primary-dark)] active:bg-[#b96306] transition-colors">
                    Speichern
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
