import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const [machines, setMachines] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [oeeData, setOeeData] = useState({ availability: 0, performance: 0, quality: 0, overall: 0 });
  const [trendData, setTrendData] = useState([]);
  const [paretoData, setParetoData] = useState([]);
  const [timeRange, setTimeRange] = useState("24h");
  const [wsStatus, setWsStatus] = useState("disconnected");

  useWebSocket("/api/edge/ws", {
    onMessage: (msg) => {
      if (msg.type === "telemetry") updateMachineStatus(msg.data);
      if (msg.type === "heartbeat") setWsStatus("connected");
    },
    onStatusChange: (status) => setWsStatus(status),
  });

  useEffect(() => {
    Promise.all([
      api.get("/machines").then((d) => d && Array.isArray(d) ? setMachines(d) : null).catch(() => {}),
      api.get("/orders/carriers").then((d) => d && Array.isArray(d) ? setCarriers(d) : null).catch(() => {}),
      api.get("/orders?status=in_progress").then((d) => d && Array.isArray(d) ? setOrders(d) : null).catch(() => {}),
      api.get("/alarms/stats/active-count").then((s) => s ? setActiveAlarms(new Array(s.count)) : null).catch(() => {}),
    ]);

    loadOEEHistory();
    loadParetoData();
  }, []);

  const updateMachineStatus = (data) => {
    setMachines((prev) =>
      prev.map((m) => m.id === data.machine_id ? { ...m, last_value: data.value, quality: data.quality } : m)
    );
  };

  const loadOEEHistory = async () => {
    try {
      const oee = await api.get("/dashboard/oee");
      if (oee) setOeeData(oee);
      
      const trend = await api.get(`/dashboard/trend?range=${timeRange}`);
      if (trend && Array.isArray(trend)) setTrendData(trend);
    } catch {}
  };

  const loadParetoData = async () => {
    try {
      const data = await api.get("/machines/errors/pareto");
      if (data && Array.isArray(data)) setParetoData(data);
    } catch {}
  };

  // Line Overview: stations mapped to machines
  const lineStations = machines.map((m, i) => ({
    id: m.id,
    name: m.name || `Station ${i + 1}`,
    status: m.status || "offline",
    carrier: carriers.find((c) => c.current_station_id === m.id),
    lastValue: m.last_value,
    quality: m.quality,
  }));

  const statusColors = {
    online: "bg-status-success text-white ring-ring-success",
    offline: "bg-neutral-200 text-neutral-400 ring-ring-stroke",
    warning: "bg-status-warning text-white ring-ring-warning",
    error: "bg-status-error text-white ring-ring-error",
  };

  const machineStatusBadge = (status: string): string => {
    if (!status) return "bg-neutral-100 text-neutral-400";
    switch (status) {
      case "online":
        return status === "online" ? "bg-status-bg-success text-status-success" : "bg-neutral-100 text-neutral-400";
      default:
        return "bg-neutral-100 text-neutral-400";
    }
  };

  const carrierStatusColors: Record<string, string> = {
    idle: "bg-neutral-100 border border-dashed border-neutral-300",
    in_process: "bg-brand-primary-bg border-2 border-brand-primary",
    at_station: "bg-accent-lilac-bg border-2 border-brand-lilac text-brand-lilac",
    moved: "bg-status-bg-info border-2 border-status-info",
    error: "bg-status-bg-error border-2 border-status-error",
    waiting_for_material: "bg-status-bg-warning border-2 border-status-warning",
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Produktionsuebersicht in Echtzeit</p>
          </div>
          <div className="flex items-center gap-3">
            {["24h", "7d", "30d"].map((r) => (
              <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${timeRange === r ? "bg-brand-primary text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Widgets */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Verfuegbarkeit" value={`${oeeData.availability.toFixed(1)}%`} trend={oeeData.availability > 85 ? "up" : oeeData.availability < 70 ? "down" : "flat"} icon="" />
          <StatCard label="Durchsatz" value={`${orders.length}`} subtitle="Active Orders" textColor="text-status-info" icon=""/>
          <StatCard label="Yield Rate" value={`${((oeeData.quality / 100) * 100).toFixed(1)}%`} trend={oeeData.quality > 95 ? "up" : oeeData.quality < 90 ? "down" : "flat"} icon=""/>
          <StatCard label="Aktive Alarme" value={`${activeAlarms?.length || 0}`} textColor="text-status-error" icon="" />
        </div>

        {/* Line Overview & Carrier Map — Task 5.0 */}
        <div className="bg-white rounded-lg shadow-card border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Produktionslinie</h2>
          <div className="flex items-center gap-8 overflow-x-auto pb-4">
            {lineStations.map((station, i) => (
              <div key={station.id} className="flex flex-col items-center min-w-[120px] space-y-3">
                {/* Carrier icon */}
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 ${carrierStatusColors[station.carrier?.status || "idle"]}`}>
                  <span className="text-xs font-mono leading-none">{station.carrier ? (station.carrier.name || "C").substring(0, 3).toUpperCase() : "—"}</span>
                </div>

                {/* Handshake flags */}
                {station.carrier?.handshake && (
                  <div className="flex gap-1">
                    {Object.entries(station.carrier.handshake)
                      .filter(([k]) => ["xStart", "xQryBusy", "xAck"].includes(k))
                      .map(([k, v]) => (
                        <span key={k} title={`${k}: ${String(v)}`} className={`w-2 h-2 rounded-full ${(v as boolean) ? "bg-status-success" : "bg-neutral-300"}`} />
                      ))}
                  </div>
                )}

                {/* Station block */}
                <div className="relative w-28">
                  <div className={`rounded-lg border p-3 text-center transition-all duration-200 cursor-pointer hover:shadow-md ${station.status === "online" ? "border-neutral-200 bg-white" : "bg-neutral-50 border-dashed border-neutral-300"}`}>
                    <div className="text-sm font-semibold text-neutral-800">{station.name}</div>
                    <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${machineStatusBadge(station.status)}`}>
                      {station.status}
                    </div>
                  </div>

                  {/* Connection line */}
                  {i < lineStations.length - 1 && (
                    <div className="absolute top-8 -right-6 w-8 h-0.5 bg-neutral-200" />
                  )}
                </div>

                {/* Last value badge */}
                {station.lastValue != null && station.lastValue !== undefined && (
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[station.quality === "good" ? "online" : "error"]}`}>
                    {station.lastValue.toFixed(1)}
                  </span>
                )}

                {/* Status dot */}
                <span className={`w-3 h-3 rounded-full ring-2 ring-white ${statusColors[station.status === "online" ? (station.quality === "good" ? "online" : "error") : "offline"]}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-lg shadow-card border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Durchsatz Verlauf ({timeRange})</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData.length > 0 ? trendData : null}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Line type="monotone" dataKey="throughput" stroke="#6366f1" strokeWidth={2} dot={false} name="Throughput" />
              <Line type="monotone" dataKey="yield" stroke="#10b981" strokeWidth={2} dot={false} name="Yield %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Dual panel: OEE + Pareto */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-card border border-neutral-200 p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">OEE</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: "Verfuegbarkeit", value: oeeData.availability },
                { name: "Performance", value: oeeData.performance },
                { name: "Qualit\u00e4t", value: oeeData.quality }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-card border border-neutral-200 p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Downtime Pareto</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={paretoData.length > 0 ? paretoData : [{ name: "Keine Daten", value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Downtime (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-lg shadow-card border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Aktive Auftraege</h2>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Fortschritt</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-2 text-sm">{o.name}</td>
                      <td className="px-4 py-2">
                        <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-primary transition-all" style={{ width: `${Math.max(0, (o.completed_quantity / o.quantity) * 100)}%`}} />
                        </div>
                      </td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${machineStatusBadge(o.status === "in_progress" ? "online" : o.status === "cancelled" ? "offline" : "warning")}`}>{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-neutral-400 py-8 text-sm">Keine aktiven Auftraege</p>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, subtitle, trend, textColor = "text-neutral-900", icon }: { 
  label: string; 
  value: string | number; 
  subtitle?: string; 
  trend?: "up" | "down" | "flat"; 
  textColor?: string;
  icon?: string;
}
) {
  const trendArrows = { up: "↑", down: "↓", flat: "→" };
  return (
    <div className="bg-white rounded-lg shadow-card border border-neutral-200 p-5">
      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${textColor}`}>{value}{trend !== undefined && <span className={`ml-1 text-sm ${trendArrows[trend]}`}></span>}</div>
      {subtitle && <div className="text-xs text-neutral-400 mt-1">{subtitle}</div>}
    </div>
  );
}
