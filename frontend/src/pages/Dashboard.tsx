import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { getStatusBadge, getStatusDot, getPriorityColor, getCarrierStatusStyles, getCarrierStatusBarClass, getMachineStatusGradientClass, getHandshakeDotClass } from "../utils/helpers";
import StatCard from "../components/StatCard";

interface CarrierItem {
  id: string;
  name?: string;
  status?: string;
  current_station_id?: string;
  next_resource_id?: string;
  handshake?: Record<string, unknown>;
}

interface MachineItem {
  id: string;
  name?: string;
  status?: string;
  quality?: string;
  last_value?: number;
}

interface OeeData {
  availability: number;
  performance: number;
  quality: number;
  overall: number;
}

interface TrendPoint {
  name: string;
  throughput: number;
  yield: number;
}

interface ParetoPoint {
  name: string;
  value: number;
}

export default function DashboardPage() {
  const [machines, setMachines] = useState<MachineItem[]>([]);
  const [carriers, setCarriers] = useState<CarrierItem[]>([]);
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [activeAlarms, setActiveAlarms] = useState(0);
  const [oeeData, setOeeData] = useState<OeeData>({ availability: 0, performance: 0, quality: 0, overall: 0 });
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [paretoData, setParetoData] = useState<ParetoPoint[]>([]);
  const [timeRange, setTimeRange] = useState("24h");
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected">("disconnected");

  useWebSocket("/api/edge/ws", {
    onMessage: (msg) => {
      if (msg.type === "telemetry") updateMachineStatus(msg.data);
      if (msg.type === "heartbeat") setWsStatus("connected");
    },
    onStatusChange: (status) => setWsStatus(status as "connected" | "disconnected"),
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTrendData();
  }, [timeRange]);

  const loadData = useCallback(async () => {
    const res = await Promise.allSettled([
      api.get("/machines"),
      api.get("/orders/carriers/list").catch(() => []),
      api.get("/orders?status=in_progress").catch(() => []),
      api.get("/alarms/stats/active-count").catch(() => 0),
      api.get("/dashboard/oee").catch(() => ({ availability: 0, performance: 0, quality: 0, overall: 0 })),
      api.get(`/dashboard/trend?range=${timeRange}`).catch(() => []),
      api.get("/machines/errors/pareto").catch(() => []),
    ]);

    const [mRes, cRes, oRes, aRes, oeeRes, tRes, pRes] = res;

    if (mRes.status === "fulfilled" && Array.isArray(mRes.value)) setMachines(mRes.value);
    if (cRes.status === "fulfilled" && Array.isArray(cRes.value)) setCarriers(cRes.value);
    if (oRes.status === "fulfilled" && Array.isArray(oRes.value)) setOrders(oRes.value);
    if (aRes.status === "fulfilled" && aRes.value) setActiveAlarms(Number((aRes.value as { count: number }).count) || 0);
    if (oeeRes.status === "fulfilled" && oeeRes.value) setOeeData(oeeRes.value as OeeData);
    if (tRes.status === "fulfilled" && Array.isArray(tRes.value)) setTrendData(tRes.value as TrendPoint[]);
    if (pRes.status === "fulfilled" && Array.isArray(pRes.value)) setParetoData(pRes.value as ParetoPoint[]);
  }, [timeRange]);

  const loadTrendData = useCallback(async () => {
    try {
      const res = await api.get(`/dashboard/trend?range=${timeRange}`);
      if (Array.isArray(res)) setTrendData(res as TrendPoint[]);
    } catch {}
  }, [timeRange]);

  const updateMachineStatus = (data: { machine_id: string; value: number; quality: string }) => {
    setMachines((prev) =>
      prev.map((m) => m.id === data.machine_id ? { ...m, last_value: data.value, quality: data.quality } : m)
    );
  };

  // Line Overview: stations mapped to machines with carrier positions
  const lineStations = machines.map((m, i) => {
    const carrier = carriers.find((c) => c.current_station_id === m.id);
    return {
      id: m.id,
      name: m.name || `Station ${i + 1}`,
      status: m.status === "online" ? "online" : "offline",
      quality: m.quality as string,
      carrier,
      lastValue: m.last_value,
      xStart: (carrier?.handshake as Record<string, unknown>)?.xStart as boolean,
      xQryBusy: (m as MachineItem & Record<string, unknown>)["xQryBusy"] as boolean,
      xAck: (carrier?.handshake as Record<string, unknown>)?.xAck as boolean,
    };
  });

  const handleRefresh = () => loadData();

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="p-[var(--space-xl)]">
        {/* Top Section: Header + KPIs in one row */}
        <div className="bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border p-6 mb-6 hover:shadow-hover transition-shadow duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
            <div>
              <h1 className="text-[var(--text-4xl-size)] leading-[var(--text-4xl-line)] font-bold text-neutral-black">Dashboard</h1>
              <p className="text-[var(--text-sm-size)] leading-[var(--text-sm-line)] text-neutral-mid mt-0.5">Produktionsuebersicht in Echtzeit</p>
            </div>
            <div className="flex items-center gap-3">
              {["24h", "7d", "30d"].map((r) => (
                <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${timeRange === r ? "bg-brand-primary text-white" : "text-neutral-dark hover:bg-neutral-stroke hover:text-neutral-black"} border border-neutral-border`}>
                  {r}
                </button>
              ))}
              <button onClick={handleRefresh} className="bg-neutral-stroke text-neutral-dark font-medium px-3 py-1.5 rounded-md hover:bg-neutral-border transition-colors text-xs" aria-label="Daten aktualisieren">Neuladen</button>
            </div>
          </div>

          {/* Hero KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* OEE Overall */}
            <div className="flex flex-col p-5 rounded-lg text-white kpi-gradient-info kpi-glow-info relative overflow-hidden">
              <div className="absolute right-[-8px] top-[-8px] w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute right-[16px] bottom-[-14px] w-16 h-16 rounded-full bg-white/5" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">OEE Overall</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-[var(--text-4xl-size)] leading-none font-extrabold">{oeeData.overall.toFixed(1)}<span className="text-xl text-white/80">%</span></span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-white/70">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 15l7-7 7 7"/></svg>
                <span>AVL {oeeData.availability.toFixed(0)}</span>
                <span className="mx-0.5">•</span>
                <span>PEF {oeeData.performance.toFixed(0)}</span>
              </div>
              <div className="mt-3 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/70 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, oeeData.overall)}%` }} />
              </div>
            </div>

            {/* Yield Rate */}
            <div className="flex flex-col p-5 rounded-lg text-white kpi-gradient-success kpi-glow-success relative overflow-hidden">
              <div className="absolute right-[-8px] top-[-8px] w-16 h-16 rounded-full bg-white/10" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Yield Rate</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-[var(--text-4xl-size)] leading-none font-extrabold">{((oeeData.quality / 100) * 100).toFixed(1)}<span className="text-xl text-white/80">%</span></span>
                {((oeeData.quality / 100) * 100) >= 95 ? (
                  <svg className="w-5 h-5 text-white/80 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10l5 5 5-5"/><path d="M7 14l5 5 5-5"/></svg>
                ) : (
                  <svg className="w-5 h-5 text-white/80 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10l5-5 5 5"/><path d="M7 14l5 5 5-5"/></svg>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-white/70">
                <span>Gute Teile</span>
                <span className="mx-0.5">•</span>
                <span>Schlechte Teile: {oeeData.quality < 100 ? (100 - oeeData.quality).toFixed(1) : "0.0"}%</span>
              </div>
              <div className="mt-3 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/70 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (oeeData.quality / 100) * 100)}%` }} />
              </div>
            </div>

            {/* Active Orders */}
            <div className="flex flex-col p-5 rounded-lg text-white kpi-gradient-lilac kpi-glow-lilac relative overflow-hidden">
              <div className="absolute right-[-8px] top-[-8px] w-20 h-20 rounded-full bg-white/10" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Aktive Auftraege</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-[var(--text-4xl-size)] leading-none font-extrabold">{orders.length}</span>
                {orders.length > 0 ? (
                  <svg className="w-5 h-5 text-white/80 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                ) : (
                  <span className="text-white/60 text-sm mb-0.5">—</span>
                )}
              </div>
              <div className="mt-3 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/70 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (orders.length / 4) * 100)}%` }} />
              </div>
            </div>

            {/* Active Alarms */}
            <div className={`flex flex-col p-5 rounded-lg relative overflow-hidden ${activeAlarms > 0 
              ? "text-white kpi-gradient-error kpi-glow-error" 
              : "text-white kpi-gradient-alarm-off"}`}>
              {activeAlarms > 0 && (
                <svg className="w-5 h-5 text-white/80 absolute top-5 right-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              )}
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Aktive Alarme</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-[var(--text-4xl-size)] leading-none font-extrabold">{activeAlarms}</span>
              </div>
              {activeAlarms > 0 && (
                <div className="mt-3 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${activeAlarms > 5 ? 'bg-red-400' : 'bg-yellow-300'}`} style={{ width: `${Math.min(100, (activeAlarms / 5) * 100)}%` }} />
                </div>
              )}
            </div>
          </div>

          {/* Production Line Compact */}
          <div className="mt-6 pt-6 border-t border-neutral-border">
            <h3 className="text-[var(--text-lg-size)] font-semibold text-neutral-black mb-3">Produktionslinie</h3>
            
            {/* Legend */}
            <div className="flex gap-5 mb-4 text-xs text-neutral-mid flex-wrap">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-success animate-pulse" /> Online</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-warning" /> Idle/Wartung</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-error" /> Error</span>
              <span className="inline-flex items-center gap-1.5"><span className="line-flow-dot w-2 h-2" style={{ background: 'var(--color-brand-primary)' }} /> Flow Active</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-lilac" /> An Station</span>
            </div>

            {/* Line Overview */}
            <div className="flex items-start gap-0 overflow-x-auto pb-4 pl-2 relative">
              {lineStations.map((station, i) => (
                <div key={station.id} className="flex items-center min-w-[130px]">
                  {/* Animated flow connector */}
                  {i > 0 && (
                    <>
                      <div 
                        className={`flow-connector ${
                          station.carrier ? 'flow-connector-active' : ''
                        }`} 
                      />
                    </>
                  )}

                  {/* Station block — gradient top-border */}
                  <div className="w-[110px] flex flex-col items-center space-y-2.5">
                    <div className={`rounded-lg p-2.5 text-center transition-all duration-300 cursor-pointer shadow-card hover:shadow-hover w-full ${getMachineStatusGradientClass(station.status)}`}>
                      <div className="text-[var(--text-xs-size)] font-semibold text-neutral-black truncate">{station.name}</div>
                      <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(station.status)}`}>
                        <span className={`w-1 h-1 rounded-full ${getStatusDot(station.status)}`} />
                        {station.status}
                      </span>
                    </div>

                    {/* Quality + Last Value */}
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        title={station.quality === "good" ? "Qualit\u00E4t: Gut" : station.quality === "bad" ? "Qualit\u00E4t: Schlecht" : "Keine Daten"}
                        className={`w-2.5 h-2.5 rounded-full ring-2 ring-white transition-all duration-300 ${getStatusDot(station.quality === "good" ? "online" : station.quality === "bad" ? "error" : "offline")}`}
                      />
                      {station.lastValue != null && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${station.quality === "good" ? "bg-status-success-bg text-status-success" : "bg-status-error-bg text-status-error"}`}>
                          {station.lastValue.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {/* Carrier block — enhanced */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div 
                        className={`w-[60px] h-[60px] rounded-lg flex items-center justify-center shadow-card transition-all duration-300 cursor-pointer hover:scale-105 ${getCarrierStatusStyles(station.carrier?.status)}`}
                      >
                        <span className="text-[11px] font-mono leading-none text-neutral-dark">
                          {station.carrier ? (station.carrier.name || "C").substring(0, 3).toUpperCase() : "\u2014"}
                        </span>
                      </div>

                      {/* Status bar under carrier */}
                      <div className={`w-[60px] h-[3px] rounded-full overflow-hidden ${getCarrierStatusBarClass(station.carrier?.status)}`} />

                      {/* Handshake flags — unified dots */}
                      <div className="flex gap-1.5 mt-0.5">
                        {station.xStart && (
                          <span title="xStart: MES-Anfrage" className={getHandshakeDotClass(true, "success")} />
                        )}
                        {station.xQryBusy && (
                          <span title="xQryBusy: Processing" className={getHandshakeDotClass(true, "brand")} />
                        )}
                        {station.xAck && (
                          <span title="xAck: Best\u00E4tigt" className={getHandshakeDotClass(true, "info")} />
                        )}
                      </div>

                      {/* Carrier status label */}
                      {station.carrier?.status && (
                        <span className="text-[9px] text-neutral-mid whitespace-nowrap capitalize">{station.carrier.status.replace(/_/g, " ")}</span>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border p-6 mb-6 hover:shadow-hover transition-shadow duration-200">
          <h3 className="text-[var(--text-xl-size)] leading-[var(--text-xl-line)] font-semibold text-neutral-black mb-4">Durchsatz Verlauf ({timeRange})</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-neutral-500)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-neutral-500)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-white)', border: '1px solid var(--color-neutral-border)', borderRadius: '8px', boxShadow: 'var(--shadow-card)' }} itemStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, fill: 'var(--color-neutral-black)' }} />
                <Line type="monotone" dataKey="throughput" stroke="var(--color-brand-primary)" strokeWidth={2} dot={false} name="Throughput" />
                <Line type="monotone" dataKey="yield" stroke="var(--color-status-success)" strokeWidth={2} dot={false} name="Yield %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <span className="text-4xl text-neutral-light">{"\uD83D\uDCCA"}</span>
              <p className="text-[var(--text-sm-size)] leading-[var(--text-sm-line)] text-neutral-mid font-medium">Keine Durchsatzdaten verfuegbar</p>
            </div>
          )}
        </div>

        {/* Dual panel: OEE + Pareto */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border p-6 hover:shadow-hover transition-shadow duration-200">
            <h3 className="text-[var(--text-xl-size)] leading-[var(--text-xl-line)] font-semibold text-neutral-black mb-4">OEE</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: "Verfuegbarkeit", value: oeeData.availability },
                { name: "Performance", value: oeeData.performance },
                { name: "Qualitaet", value: oeeData.quality }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-neutral-500)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-neutral-500)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-white)', border: '1px solid var(--color-neutral-border)', borderRadius: '8px' }} itemStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" fill="var(--color-brand-primary)" radius={[4, 4, 0, 0]} name="OEE-KPI" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border p-6 hover:shadow-hover transition-shadow duration-200">
            <h3 className="text-[var(--text-xl-size)] leading-[var(--text-xl-line)] font-semibold text-neutral-black mb-4">Downtime Pareto</h3>
            {paretoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={paretoData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-neutral-500)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'var(--color-neutral-500)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-white)', border: '1px solid var(--color-neutral-border)', borderRadius: '8px' }} itemStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" fill="var(--color-status-warning)" radius={[4, 4, 0, 0]} name="Downtime (min)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <span className="text-4xl text-neutral-light">{"\uD83D\uDCCA"}</span>
                <p className="text-[var(--text-sm-size)] leading-[var(--text-sm-line)] text-neutral-mid font-medium">Keine Downtime-Daten verfuegbar</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border p-6 hover:shadow-hover transition-shadow duration-200">
          <h3 className="text-[var(--text-xl-size)] leading-[var(--text-xl-line)] font-semibold text-neutral-black mb-4">Aktive Auftraege</h3>
          {orders.length > 0 ? (
            <table className="w-full border-collapse bg-white rounded-[var(--radius-lg)] overflow-hidden shadow-card">
              <thead>
                <tr className="bg-neutral-stroke">
                  <th className="px-6 py-3.5 text-xs uppercase tracking-wider font-semibold text-neutral-mid">Name</th>
                  <th className="px-6 py-3.5 text-xs uppercase tracking-wider font-semibold text-neutral-mid">Fortschritt</th>
                  <th className="px-6 py-3.5 text-xs uppercase tracking-wider font-semibold text-neutral-mid">Status</th>
                  <th className="px-6 py-3.5 text-xs uppercase tracking-wider font-semibold text-neutral-mid">Menge</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => (
                  <tr key={o.id} className="border-b border-neutral-stroke hover:bg-neutral-stroke/50 transition-colors">
                    <td className="px-6 py-4 text-[var(--text-base-size)] text-neutral-dark font-medium">{o.name}</td>
                    <td className="px-6 py-4 w-32">
                      <div className="w-full h-2 bg-neutral-border rounded-full overflow-hidden">
                        <div className="h-full bg-brand-primary transition-all" style={{ width: `${Math.max(0, ((o.completed_quantity as number) / (o.quantity as number)) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-neutral-mid mt-1 block">{o.completed_quantity}/{o.quantity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(o.status as string)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(o.status as string)}`} />
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-base-size)] text-neutral-dark font-mono">{o.priority != null ? <span className={getPriorityColor(String(o.priority))}>{o.priority}</span> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <span className="text-4xl text-neutral-light">{"\uD83D\uDCE5"}</span>
              <p className="text-[var(--text-sm-size)] leading-[var(--text-sm-line)] text-neutral-mid font-medium">Keine aktiven Auftraege</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
