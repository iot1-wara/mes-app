import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { getStatusBadge, getMachineStatusGradientClass,
  getCarrierStatusStyles, getCarrierStatusBarClass } from "../utils/helpers";

interface DpRecord {
  carrierId: string;
  name: string;
  iCarrierID: number | null;
  iStepNo: number;
  iResourceID: number | null;
  next_resource_id: number | null;
  deckelfarbeName: string;
  iPar1?: number;
  iPar2: number;
  iPar3: number;
  iPar4: number;
  lastProcessTimestamp: Date | null;
  partNumber?: string;
  status: string;
}

interface MachineItem {
  id: string;
  name: string;
  status: string;
}

function getBallColor(name: string): string {
  switch (name.toLowerCase()) {
    case 'rot': return 'bg-status-error';
    case 'blau': return 'bg-status-info';
    case 'grune': return 'bg-status-success';
    default: return 'bg-neutral-300';
  }
}

function formatTime(ts: Date | null): string {
  if (!ts) return "--:--:--";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function KPICard({ label, value, color = 'brand', accent }: { label: string; value: number | string; color?: string; accent?: string }) {
  const bgColors: Record<string, string> = {
    brand: 'from-brand-primary/20 to-brand-primary/5 border-brand-primary/20 text-brand-primary',
    green: 'from-status-success/20 to-status-success/5 border-status-success/30 text-status-success',
    red: 'from-status-error/20 to-status-error/5 border-status-error/30 text-status-error',
    purple: 'from-brand-lilac/20 to-brand-lilac/5 border-brand-lilac/20 text-brand-lilac',
  };
  const bg = bgColors[color] || bgColors.brand;

  return (
    <div className={`bg-gradient-to-br rounded-xl p-3.5 border ${bg}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</span>
      {typeof value === 'number' ? (
        <div className="flex items-end gap-1 mt-1">
          <span className="text-2xl font-extrabold leading-none">{value.toFixed(1)}{accent || ''}</span>
        </div>
      ) : (
        <div className="flex items-end gap-1 mt-1">
          <span className="text-2xl font-extrabold leading-none">{value}</span>
          {accent && <span className="text-sm opacity-60 mb-0.5">&nbsp;{accent}</span>}
        </div>
      )}
    </div>
  );
}

function DpDataMini({ dp }: { dp: DpRecord }) {
  return (
    <div className={`rounded-lg p-2 transition-all ${getCarrierStatusStyles(dp.status as any)}`}>
      <span className="text-[10px] font-mono font-bold text-neutral-dark truncate block">{dp.name}</span>
      <span className="text-[9px] text-neutral-mid whitespace-nowrap">Schritt {dp.iStepNo} / Ziel: {dp.next_resource_id ?? '-'}</span>
      <div className="flex items-center gap-1 mt-0.5">
        <div className={`w-2 h-2 rounded-full ${getBallColor(dp.deckelfarbeName)}`} />
        <span className="text-[9px] text-neutral-dark">{dp.deckelfarbeName}</span>
      </div>
      <div className="mt-1 flex gap-0.5">
        {dp.iPar2 > 0 && <span className="text-[8px]" title={`Rote Kugeln: ${dp.iPar2}`}>{"\u{1F534}" + dp.iPar2}</span>}
        {dp.iPar3 > 0 && <span className="text-[8px] text-status-success" title={`Grüne Kugeln: ${dp.iPar3}`}>{"\u{1F7E2}" + dp.iPar3}</span>}
        {dp.iPar4 > 0 && <span className="text-[8px] text-status-info" title={`Blaue Kugeln: ${dp.iPar4}`}>{"\u{1F535}" + dp.iPar4}</span>}
      </div>
      <span className="text-[8px] text-neutral-light block mt-1">T: {formatTime(dp.lastProcessTimestamp)}</span>
    </div>
  );
}

function ParamModal({ dp, onClose, onSave }: {
  dp: DpRecord;
  onClose: () => void;
  onSave: (id: string, par: { iPar1: number; iPar2: number; iPar3: number; iPar4: number }) => Promise<void>
}) {
  const [iPar1, setIPar1] = useState(dp.iPar1 ?? 0);
  const [iPar2, setIPar2] = useState(dp.iPar2 ?? 0);
  const [iPar3, setIPar3] = useState(dp.iPar3 ?? 0);
  const [iPar4, setIPar4] = useState(dp.iPar4 ?? 0);

  const colorNames: Record<number, string> = { 0: 'keine', 1: 'rot', 2: 'blau', 3: 'grune' };

  async function handleSave() {
    await onSave(dp.carrierId, { iPar1: Number(iPar1), iPar2: Number(iPar2), iPar3: Number(iPar3), iPar4: Number(iPar4) });
    onClose();
  }

  const getBallColorForSelector = (val: number): string => {
    switch (val) {
      case 1: return 'bg-status-error';
      case 2: return 'bg-status-info';
      case 3: return 'bg-status-success';
      default: return 'bg-neutral-300';
    }
  };

  const balls = [
    { key: 'iPar2' as const, label: 'Rote Kugeln', borderColor: 'border-status-error focus:border-status-error-dark ring-status-error-bg' },
    { key: 'iPar3' as const, label: 'Grüne Kugeln', borderColor: 'border-status-success focus:border-status-success ring-neutral-border' },
    { key: 'iPar4' as const, label: 'Blaue Kugeln', borderColor: 'border-status-info focus:border-status-info ring-status-info-bg' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose} style={{ background: "rgba(0,0,0,0.5)" }}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[var(--radius-xl)] shadow-card p-6 w-full max-w-lg mx-4">
        <h3 className="text-[var(--text-xl-size)] font-bold text-neutral-black mb-4">{dp.name} — Parameter bearbeiten</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">iPar1: Deckelfarbe</label>
            <select value={iPar1} onChange={(e) => setIPar1(Number(e.target.value))}
              className="w-full bg-white border border-neutral-border rounded-md px-3 py-2 text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all"
            >
              {Object.entries(colorNames).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getBallColorForSelector(iPar1)}`} />
              <span className="text-[var(--text-sm-size)] text-neutral-mid">{colorNames[Number(iPar1)] || '?'}</span>
            </div>
          </div>
          {balls.map(({ key, label, borderColor }) => (
            <div key={key}>
              <label className="block text-[var(--text-sm-size)] font-medium text-neutral-dark mb-1.5">{label}</label>
              <input
                type="number" min={0}
                value={key === 'iPar2' ? iPar2 : key === 'iPar3' ? iPar3 : iPar4}
                onChange={(e) => {
                  if (key === 'iPar2') setIPar2(Number(e.target.value));
                  else if (key === 'iPar3') setIPar3(Number(e.target.value));
                  else setIPar4(Number(e.target.value));
                }}
                className={`w-full bg-white border border-neutral-border rounded-md px-3 py-2 text-neutral-dark placeholder:text-neutral-light focus:outline-none focus:ring-2 ${borderColor} transition-all`}
              />
            </div>
          ))}
          <div className="text-[var(--text-sm-size)] text-neutral-mid pt-2 border-t border-neutral-border">
            iCarrierID: {dp.iCarrierID ?? '-'} | Schritt: {dp.iStepNo} | Zielstation: {dp.next_resource_id ?? '-'}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 bg-neutral-stroke rounded-[var(--radius-lg)]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white border border-neutral-border text-neutral-dark hover:bg-neutral-border transition-colors font-medium text-[var(--text-sm-size)]">Abbrechen</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity font-medium text-[var(--text-sm-size)]">Speichern</button>
        </div>
      </div>
    </div>
  );
}

function StationBlock({ station, dpRecord, onDpClick, onAdvance, onDispatch, hsStatus, isDispatching }: {
  station: MachineItem;
  dpRecord?: DpRecord | null;
  onDpClick?: () => void;
  onAdvance?: () => void;
  onDispatch?: () => void;
  hsStatus?: Record<string, any>;
  isDispatching?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-[160px] rounded-lg shadow-card border p-3 hover:shadow-hover transition-all ${getMachineStatusGradientClass(station.status as any)}`}>
        <span className="text-sm font-bold text-neutral-dark truncate block">{station.name}</span>
        <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(station.status)}`}>
          {"  "}
          <span className={`w-1.5 h-1.5 rounded-full ${station.status === 'running' || station.status === 'online' ? 'bg-status-success animate-pulse' : station.status === 'offline' ? 'bg-neutral-300' : 'bg-status-warning'}`} />
          {station.status}
        </span>

        {dpRecord && dpRecord.status !== 'idle' && (
          <button onClick={onDpClick} className="mt-2 w-full bg-accent-lilac-bg/50 text-brand-lilac rounded-lg py-1.5 text-xs font-medium hover:bg-accent-lilac-bg transition-colors">
            Parameter bearbeiten
          </button>
        )}

        {dpRecord && dpRecord.status !== 'idle' && (
          <button onClick={onAdvance} className="mt-1 w-full bg-brand-primary text-white rounded-lg py-1.5 text-xs font-medium hover:opacity-90 transition-opacity">
            Schritt vorwaerts
          </button>
        )}

        {dpRecord && (
          <button onClick={onDispatch} disabled={isDispatching} className="mt-1 w-full bg-accent-orange-bg/50 text-brand-orange rounded-lg py-1.5 text-xs font-medium hover:bg-accent-orange-bg transition-colors disabled:opacity-40">
            {isDispatching ? 'Dispatch...' : 'SPS Handshake'}
          </button>
        )}

        {hsStatus && (
          <div className="mt-2 flex gap-1">
            <span className={`w-3 h-3 rounded-full ${hsStatus.xStart ? 'bg-status-success' : 'bg-neutral-border'} border border-neutral-stroke`} title="xStart" />
            <span className={`w-3 h-3 rounded-full ${hsStatus.xQryBusy ? 'bg-status-info' : 'bg-neutral-border'} border border-neutral-stroke`} title="xQryBusy" />
            <span className={`w-3 h-3 rounded-full ${hsStatus.xAck ? 'bg-status-success' : 'bg-neutral-border'} border border-neutral-stroke`} title="xAck" />
          </div>
        )}
      </div>

      <div className="mt-3 w-[160px]">
        {dpRecord ? (
          <DpDataMini dp={dpRecord} />
        ) : (
          <div className="rounded-lg border border-neutral-border/50 bg-white p-4 text-center h-[80px] flex items-center justify-center">
            <span className="text-xs text-neutral-light opacity-60">{"\u2014"}</span>
          </div>
        )}
      </div>

      {dpRecord && (
        <div className={`mt-2 w-full h-1.5 rounded-full overflow-hidden ${getCarrierStatusBarClass(dpRecord.status as any)}`} />
      )}
    </div>
  );
}

export default function ProductionControlPage() {
  const [oeeData, setOeeData] = useState({ availability: 0, performance: 0, quality: 0, overall: 0 });
  const [ordersCount, setOrdersCount] = useState(0);
  const [activeAlarmsCount, setActiveAlarmsCount] = useState(0);
  const [machines, setMachines] = useState<MachineItem[]>([]);
  const [dbProcessData, setDbProcessData] = useState<DpRecord[]>([]);
  const [editingParam, setEditingParam] = useState<DpRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [advanceLoading, setAdvanceLoading] = useState<Record<string, boolean>>({});
  const [dispatching, setDispatching] = useState<Record<string, boolean>>({});
  const [handshakeStatuses, setHandshakeStatuses] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    try {
      await Promise.allSettled([
        (async () => {
          const [oee, ordersRes, alarmCountRes] = await Promise.all([
            api.get('/dashboard/oee').catch(() => ({ availability: 0, performance: 0, quality: 0, overall: 0 })),
            api.get('/orders?status=in_progress').catch(() => []),
            api.get('/alarms/stats/active-count').catch(() => ({ count: 0 })),
          ]);
          if (oee && typeof oee === 'object') setOeeData(oee as any);
          else setOeeData({ availability: 0, performance: 0, quality: 0, overall: 0 });
          setOrdersCount(Array.isArray(ordersRes) ? ordersRes.length : 0);
          const count = alarmCountRes && typeof alarmCountRes === 'object' ?
            (alarmCountRes as { count: number }).count || 0 : 0;
          setActiveAlarmsCount(count);
        })(),
        (async () => {
          const dpData = await api.get('/carriers/dbprocessdata').catch(() => []);
          if (Array.isArray(dpData)) setDbProcessData(dpData as DpRecord[]);
        })(),
        (async () => {
          const machineData = await api.get('/machines').catch(() => []);
          if (Array.isArray(machineData)) setMachines(machineData as MachineItem[]);
        })(),
        (async () => {
          const hsData = await api.get('/carriers/handshake-statuses').catch(() => []);
          if (Array.isArray(hsData)) {
            const map: Record<string, Record<string, any>> = {};
            for (const item of hsData as Array<{ id: string; handshake: Record<string, any> }>) {
              map[item.id] = item.handshake;
            }
            setHandshakeStatuses(map);
          }
        })(),
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveParameters = useCallback(async (carrierId: string, parData: { iPar1: number; iPar2: number; iPar3: number; iPar4: number }) => {
    try {
      await api.patch(`/carriers/${carrierId}`, {
        iPar1: parData.iPar1 || 0,
        iPar2: parData.iPar2 || 0,
        iPar3: parData.iPar3 || 0,
        iPar4: parData.iPar4 || 0,
      });
      loadData();
    } catch (err: any) {
      console.error('[ProductionControl] save parameters failed:', err);
      alert('Parameter konnten nicht gespeichert werden!');
    }
  }, [loadData]);

  const advanceCarrier = useCallback(async (carrierId: string) => {
    setAdvanceLoading(prev => ({...prev, [carrierId]: true}));
    try {
      await api.post(`/carriers/${carrierId}/advance-step`, {});
      loadData();
    } catch (err: any) {
      console.error('[ProductionControl] advance failed:', err);
    } finally {
      setAdvanceLoading(prev => ({...prev, [carrierId]: false}));
    }
  }, [loadData]);

  const triggerDispatch = useCallback(async (carrierId: string) => {
    setDispatching(prev => ({...prev, [carrierId]: true}));
    try {
      await api.post(`/orders/dispatcher/trigger/${carrierId}`, {});
      loadData();
    } catch (err: any) {
      console.error('[ProductionControl] dispatch failed:', err);
    } finally {
      setDispatching(prev => ({...prev, [carrierId]: false}));
    }
  }, [loadData]);

  const stationsWithDpdata = machines.map(machine => ({
    machine,
    dp: dbProcessData.find(dp => dp.next_resource_id === parseInt(machine.id?.split('-')?.pop() || '0'))
      ?? null,
  }));

  if (loading) {
    return <div className="pl-[var(--sidebar-width)] flex-1 bg-neutral-50 flex items-center justify-center">
      <span className="text-xl text-neutral-mid animate-pulse">Laden...</span>
    </div>;
  }

  return (
    <div className="pl-[var(--sidebar-width)] flex-1 overflow-auto bg-neutral-50 flex flex-col">
      <main className="p-[var(--space-xl)]">
        <header className="shrink-0 mb-6 space-y-4">
          <div>
            <h1 className="text-[var(--text-3xl-size)] leading-[var(--text-3xl-line)] font-bold text-neutral-black">
              Production Control
            </h1>
            <p className="text-[var(--text-base-size)] text-neutral-mid mt-2">
              Produktionslinie — Steuerung pro Station (dbProcessData)
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <KPICard label="OEE Overall" value={oeeData.overall} color="brand" />
            <KPICard label="Verfuegbarkeit" value={oeeData.availability} color="green" />
            <KPICard label="Performance" value={oeeData.performance} color="purple" />
            <KPICard label="Qualitaet" value={oeeData.quality} color="brand" />
            <KPICard label="Aktive Auftraege" value={ordersCount} color="green" />
            <KPICard label="Aktive Alarme" value={activeAlarmsCount} color="red" />
          </div>

          <section className="bg-white rounded-[var(--radius-lg)] shadow-card border border-neutral-border p-6 hover:shadow-hover transition-shadow duration-200">
            <h3 className="text-[var(--text-xl-size)] leading-[var(--text-xl-line)] font-semibold text-neutral-black mb-4">Produktionslinie</h3>
            <div className="flex gap-5 mb-4 text-xs text-neutral-mid flex-wrap">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-success animate-pulse" /> Online</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-warning" /> Idle/Wartung</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-error" /> Error</span>
            </div>
            <div className="flex items-start gap-0 overflow-x-auto pb-4 pl-2 relative">
              {stationsWithDpdata.map(({ machine, dp }, i) => (
                <div key={machine.id || i} className="flex items-center min-w-[160px]">
                  {i > 0 && <div className={`flow-connector ${dp ? 'flow-connector-active' : ''}`} />}
                  <StationBlock
                    station={machine}
                    dpRecord={dp || null}
                    onDpClick={() => dp && setEditingParam(dp)}
                    onAdvance={() => dp && !advanceLoading[dp.carrierId] ? advanceCarrier(dp.carrierId) : undefined}
                    onDispatch={() => dp && !dispatching[dp.carrierId] ? triggerDispatch(dp.carrierId) : undefined}
                    hsStatus={dp ? handshakeStatuses[dp.carrierId] || {} : undefined}
                    isDispatching={dp ? dispatching[dp.carrierId] : false}
                  />
                </div>
              ))}
            </div>
          </section>
        </header>
      </main>

      {editingParam && (
        <ParamModal dp={editingParam} onClose={() => setEditingParam(null)} onSave={saveParameters} />
      )}
    </div>
  );
}
