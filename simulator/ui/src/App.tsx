import { useState, useEffect, useCallback } from 'react'
import StationCard from './components/StationCard'
import type { SimulatorStation } from './types'
import { STATIONS } from './types'

const API_BASE = 'http://localhost:4841' // HTTP REST API port (configurable via .env)

export default function App() {
  const [liveStations, setLiveStations] = useState<SimulatorStation[]>([])
  const [backendReady, setBackendReady] = useState(false)
  const [tick, setTick] = useState(0)

  // Poll state endpoint to get live station data from simulator
  const fetchAllStates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/state`)
      if (!res.ok) throw new Error('Backend not reachable')
      setBackendReady(true)
      const data: Record<number, any> = await res.json()
      const mapped: SimulatorStation[] = STATIONS.map(s => ({
        name: s.name,
        port: s.port,
        state: data[s.port]?.state || 'Idle',
        current: {
          xQryBusy: data[s.port]?.xQryBusy ?? 0,
          xStart: data[s.port]?.xStart ?? 0,
          xAck: data[s.port]?.xAck ?? 0,
          xDone: data[s.port]?.xDone ?? 0,
          xCtrlError: data[s.port]?.xCtrlError ?? 0,
          xErrL0: data[s.port]?.xErrL0 ?? 0,
          xErrL1: data[s.port]?.xErrL1 ?? 0,
          iCarrierID: data[s.port]?.iCarrierID ?? 0,
          iStepNo: data[s.port]?.iStepNo ?? 0,
          iResourceID: data[s.port]?.iResourceID ?? 0,
          iPar1: data[s.port]?.iPar1 ?? 0,
          iPar2: data[s.port]?.iPar2 ?? 0,
          iPar3: data[s.port]?.iPar3 ?? 0,
          iPar4: data[s.port]?.iPar4 ?? 0,
        },
      }))
      setLiveStations(mapped)
    } catch {
      setBackendReady(prev => prev) // keep previous state
    }
  }, [])

  useEffect(() => {
    fetchAllStates()
    setTick(Date.now())
    const id = setInterval(fetchAllStates, 2000)
    return () => clearInterval(id)
  }, [fetchAllStates])

  // Update tick periodically for last-refresh display
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])


  // Build station list from live data or fallback to static
  const stations: SimulatorStation[] = liveStations.length > 0 ? liveStations : STATIONS.map(s => ({
    ...s,
    state: 'Idle',
    current: {
      xQryBusy: 0, xStart: 0, xAck: 0, xDone: 0,
      xCtrlError: 0, xErrL0: 0, xErrL1: 0,
      iCarrierID: 0, iStepNo: 0, iResourceID: 0,
      iPar1: 0, iPar2: 0, iPar3: 0, iPar4: 0,
    },
  }))

  return (
    <div style={{
      minHeight: '100vh',
      background: '#18181b',
      padding: '32px 24px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#f58b00',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Simulator Test Dashboard
          </h1>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: backendReady ? '#16a34a' : '#71717a',
            background: backendReady ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.04)',
            borderRadius: '9999px',
            padding: '4px 12px',
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: backendReady ? '#16a34a' : '#71717a',
            }} />
            {backendReady ? 'Backend Connected' : 'Mock Mode'}
          </span>
        </div>
        <p style={{ color: '#71717a', marginTop: '6px', fontSize: '14px' }}>
          Auto-refresh every 2s &middot; Click buttons to send MES commands to stations
        </p>
      </div>

      {/* Station cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {stations.map((s) => (
          <StationCard key={s.port} station={{ ...s, current: { ...s.current } }} />
        ))}
      </div>

      {/* Debug info footer */}
      <div style={{ marginTop: '32px', fontSize: '11px', color: '#52525b', textAlign: 'center' }}>
        Last refresh: {new Date(tick).toLocaleTimeString()}
      </div>
    </div>
  )
}
