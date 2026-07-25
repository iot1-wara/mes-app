import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { getStatusBadge, getStatusDot, getPriorityColor, getCarrierStatusStyles, getCarrierStatusBarClass, getMachineStatusGradientClass, getHandshakeDotClass } from "../utils/helpers";
import StatCard from "../components/StatCard";

// i18n compatibility (if global i18n is available)
declare global {
  var i18n: any;
}

interface AlarmRecord {
  id: string;
  severity: string;
  machine_id: string;
  message: string;
  created_at: string;
  acknowledged: boolean;
}

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
  const [orders, setOrders] = useState<Record<string, unknown | string | number>[]>([]);
  const [activeAlarmsCount, setActiveAlarmsCount] = useState(0);
  const [alarmsList, setAlarmsList] = useState<AlarmRecord[]>([]);
  const [alarmExpanded, setAlarmExpanded] = useState(false);
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
       api.get("/carriers/list").catch(() => []),
      api.get("/orders?status=in_progress").catch(() => []),
      api.get("/alarms/stats/active-count").catch(() => 0),
      api.get("/dashboard/oee").catch(() => ({ availability: 0, performance: 0, quality: 0, overall: 0 })),
      api.get(`/dashboard/trend?range=${timeRange}`).catch(() => []),
      api.get("/machines/errors/pareto").catch(() => []),
      api.get("/alarms/active").catch(() => []),
    ]);

    const [mRes, cRes, oRes, aRes, oeeRes, tRes, pRes, alRes] = res;

    if (mRes.status === "fulfilled" && Array.isArray(mRes.value)) setMachines(mRes.value);
    if (cRes.status === "fulfilled" && Array.isArray(cRes.value)) setCarriers(cRes.value);
    if (oRes.status === "fulfilled" && Array.isArray(oRes.value)) setOrders(oRes.value);
    if (aRes.status === "fulfilled" && aRes.value) setActiveAlarmsCount(Number((aRes.value as { count: number }).count) || 0);
    if (oeeRes.status === "fulfilled" && oeeRes.value) setOeeData(oeeRes.value as OeeData);
    if (tRes.status === "fulfilled" && Array.isArray(tRes.value)) setTrendData(tRes.value as TrendPoint[]);
    if (pRes.status === "fulfilled" && Array.isArray(pRes.value)) setParetoData(pRes.value as ParetoPoint[]);
    if (alRes.status === "fulfilled" && Array.isArray(alRes.value)) setAlarmsList(alRes.value as AlarmRecord[]);
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
      status: m.status as 'online' | 'offline',
      quality: m.quality as string,
      carrier,
      lastValue: m.last_value,
      xStart: (carrier?.handshake as Record<string, unknown>)?.xStart as boolean,
      xQryBusy: (m as MachineItem & Record<string, unknown>)["xQryBusy"] as boolean,
      xAck: (carrier?.handshake as Record<string, unknown>)?.xAck as boolean,
    };
  });

  const handleRefresh = () => loadData();

  const ackAlarm = useCallback(async (id: string) => {
    try {
      await api.post(`/alarms/${id}/acknowledge`, {});
      setAlarmsList(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
      setActiveAlarmsCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const unackAlarms = alarmsList.filter(a => !a.acknowledged);

  return (
    <div className="pl-[var(--sidebar-width)] flex-1 overflow-auto bg-neutral-50">
      <main className="p-[var(--space-xl)]">
        {/* Top Section: Header + KPIs in one row */}
        <div className="bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border p-6 mb-6 hover:shadow-hover transition-shadow duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
            <div>
              <h1 className="text-[var(--text-4xl-size)] leading-[var(--text-4xl-line)] font-bold text-neutral-black">Dashboard</h1>
              <p className="text-[var(--text-sm-size)] leading-[var(--text-sm-line)] text-neutral-mid mt-0.5">Produktionsübersicht in Echtzeit</p>
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
                <span className="text-[var(--text-4xl-size)] leading-none font-extrabold">{oeeData.quality.toFixed(1)}<span className="text-xl text-white/80">%</span></span>
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
                <div className="h-full bg-white/70 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, oeeData.quality)}%` }} />
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
            <div className={`flex flex-col p-5 rounded-lg relative overflow-hidden ${activeAlarmsCount > 0 
              ? "text-white kpi-gradient-error kpi-glow-error" 
              : "text-white kpi-gradient-alarm-off"}`}>
              {activeAlarmsCount > 0 && (
                <svg className="w-5 h-5 text-white/80 absolute top-5 right-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              )}
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Aktive Alarme</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-[var(--text-4xl-size)] leading-none font-extrabold">{activeAlarmsCount}</span>
              </div>
              {activeAlarmsCount > 0 && (
                  <div className={`mt-3 w-full h-1.5 bg-white/20 rounded-full overflow-hidden`}>
                    <div className={`h-full rounded-full transition-all duration-500 ${activeAlarmsCount > 5 ? 'bg-status-error' : 'bg-status-warning'}`} style={{ width: `${Math.min(100, (activeAlarmsCount / 5) * 100)}%` }} />
                  </div>
              )}
            </div>
          </div>

          {/* Production Line Compact — Mini-Monitor (nur Lesedots) */}
          <div className="mt-6 pt-6 border-t border-neutral-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-lg-size)] font-semibold text-neutral-black">Produktionslinie</h3>
              <Link to="/control" className="text-xs text-brand-primary hover:underline">Zur Produktionssteuerung {"\u2192"}</Link>
            </div>
            
            <div className="flex items-center gap-0 overflow-x-auto pb-3 pl-2">
              {lineStations.map((station, i) => (
                <div key={station.id} className="flex items-center min-w-[140px]">
                  {/* Flow connector — nur anzeigen wenn Carrier da */}
                  {i > 0 && (
                    <div className={`flow-connector ${station.carrier ? 'flow-connector-active' : ''}`} />
                  )}

                  {/* Station name + Status-Dot (LESSEND) */}
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-full rounded-lg p-2 text-center transition-all ${getMachineStatusGradientClass(station.status as 'online' | 'offline')}`}>
                      <div className="text-[var(--text-xs-size)] font-semibold text-neutral-black truncate">{station.name}</div>
                      <span className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusBadge(station.status)}`}>
                        <span className={`w-1 h-1 rounded-full ${getStatusDot(station.status)}`} />
                      </span>
                    </div>

                    {/* Carrier Dot — klein + lesend (KEINE Station-Karten mehr!) */}
                    <div className="flex flex-col items-center gap-0.5">
                      {station.carrier ? (
                        <>
                          <div 
                            className={`w-[48px] h-[48px] rounded-lg flex items-center justify-center shadow-card transition-all ${getCarrierStatusStyles(station.carrier.status as any)}`}
                            title={station.carrier.name + " -> " + (station.carrier.next_resource_id || "Ziel offen")}
                          >
                            <span className="text-[10px] font-mono text-neutral-dark">
                              {station.carrier.name ? station.carrier.name.substring(0, 2).toUpperCase() : "C"}
                            </span>
                          </div>
                          <div className={`w-[48px] h-[3px] rounded-full overflow-hidden ${getCarrierStatusBarClass(station.carrier.status as any)}`} />
                          {station.lastValue != null && (
                <span className="text-[9px] px-1 font-mono rounded">
                              {station.lastValue.toFixed(0)}
                            </span>
                          )}
                          {/* Mini Handshake-Dots */}
                          <div className="flex gap-1 mt-0.5">
                            {station.xStart && <span title="xStart" className={getHandshakeDotClass(true, "success")} />}
                            {station.xQryBusy && <span title="xBusy" className={getHandshakeDotClass(true, "brand")} />}
                            {station.xAck && <span title="xAck" className={getHandshakeDotClass(true, "info")} />}
                          </div>
                        </>
                      ) : (
                        <div className="w-[48px] h-[48px] rounded-lg border border-neutral-border/50 bg-white flex items-center justify-center">
                          <span className="text-xs text-neutral-light opacity-40">{"\u2014"}</span>
                        </div>
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
                  <tr key={o.id as string} className="border-b border-neutral-stroke hover:bg-neutral-stroke/50 transition-colors">
                    <td className="px-6 py-4 text-[var(--text-base-size)] text-neutral-dark font-medium">{String(o.name)}</td>
                    <td className="px-6 py-4 w-32">
                      <div className="w-full h-2 bg-neutral-border rounded-full overflow-hidden">
                        <div className="h-full bg-brand-primary transition-all" style={{ width: `${Math.max(0, ((o.completed_quantity as number) / (o.quantity as number)) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-neutral-mid mt-1 block">{String(o.completed_quantity ?? '')}/{String(o.quantity ?? '')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(o.status as string)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(o.status as string)}`} />
                        {String(o.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-base-size)] text-neutral-dark font-mono">{o.priority != null ? <span className={getPriorityColor(String(o.priority))}>{String(o.priority)}</span> : "-"}</td>
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

        {/* Aktive Alarme */}
        <div className="mt-6 bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border p-6 hover:shadow-hover transition-shadow duration-200">
          <h3 className="text-[var(--text-xl-size)] leading-[var(--text-xl-line)] font-semibold text-neutral-black mb-4">Aktive Alarme</h3>
          {unackAlarms.length > 0 ? (
            <div className="space-y-2">
              {unackAlarms.map(alarm => (
                <div key={alarm.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${alarm.severity === 'critical' || alarm.severity === 'error' ? 'bg-status-error-bg text-status-error border-status-error/20' : alarm.severity === 'warning' ? 'bg-status-warning-bg text-status-warning border-status-warning/30' : 'bg-accent-lilac-bg text-brand-lilac border-brand-lilac/20'} hover:bg-black/5 transition-colors`}>
                  <button onClick={() => ackAlarm(alarm.id)} className={`px-2 py-1 rounded text-xs font-medium ${alarm.severity === 'critical' || alarm.severity === 'error' ? 'bg-status-error text-white hover:bg-[var(--color-status-error-dark)]' : 'bg-neutral-stroke text-neutral-dark hover:bg-neutral-border transition-colors'}`}>
                    Ack
                  </button>
                  <span className="font-mono text-xs opacity-70 text-neutral-mid">{alarm.machine_id.substring(0, 8)}</span>
                  <span className={`text-xs font-medium uppercase bg-neutral-stroke px-2 py-0.5 rounded-full ${alarm.severity === 'critical' || alarm.severity === 'error' ? 'text-status-error' : alarm.severity === 'warning' ? 'text-status-warning' : 'text-brand-lilac'}`}>
                    {alarm.severity}
                  </span>
                  <span className="text-sm text-neutral-dark flex-1">{alarm.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 gap-3">
              <span className="text-4xl text-neutral-light">{"\uD83D\uDD14"}</span>
              <p className="text-[var(--text-sm-size)] leading-[var(--text-sm-line)] text-neutral-mid font-medium">Keine aktiven Alarme</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
