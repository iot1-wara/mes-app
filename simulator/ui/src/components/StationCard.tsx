import { useState, useCallback } from 'react'
import type { SimulatorStation, Command, StateRefs } from '../types'

const initialEmptyState: StateRefs = {
  xQryBusy: 0, xStart: 0, xAck: 0, xDone: 0,
  xCtrlError: 0, xErrL0: 0, xErrL1: 0,
  iCarrierID: 0, iStepNo: 0, iResourceID: 0,
  iPar1: 0, iPar2: 0, iPar3: 0, iPar4: 0,
}

export default function StationCard({ station }: { station: SimulatorStation }) {
  const API = 'http://localhost:4841/api'
  const [state, setState] = useState(station.name)
  const [current, setCurrent] = useState<StateRefs>({ ...initialEmptyState })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchState = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`${API}/state/${station.port}`)
      if (!res.ok) return
      const data = await res.json()
      setState(data.state || 'Idle')
      setCurrent(prev => ({
        xQryBusy: data.xQryBusy ?? prev.xQryBusy,
        xStart: data.xStart ?? prev.xStart,
        xAck: data.xAck ?? prev.xAck,
        xDone: data.xDone ?? prev.xDone,
        xCtrlError: data.xCtrlError ?? prev.xCtrlError,
        xErrL0: data.xErrL0 ?? prev.xErrL0,
        xErrL1: data.xErrL1 ?? prev.xErrL1,
        iCarrierID: data.iCarrierID ?? prev.iCarrierID,
        iStepNo: data.iStepNo ?? prev.iStepNo,
        iResourceID: data.iResourceID ?? prev.iResourceID,
        iPar1: data.iPar1 ?? prev.iPar1,
        iPar2: data.iPar2 ?? prev.iPar2,
        iPar3: data.iPar3 ?? prev.iPar3,
        iPar4: data.iPar4 ?? prev.iPar4,
      }))
    } catch {
      // Backend not available — UI still renders with mock state for demo
    }
  }, [station.port])

  const sendCommand = useCallback(async (cmd: Command) => {
    setLoading(true)
    setError(null)
    try {
    const res = await fetch(`${API}/command/${station.port}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, value: 1 }),
      })
      if (!res.ok) throw new Error('Command failed')
      setTimeout(fetchState, 200)
    } catch (e) {
      setError(`Command ${cmd} rejected — backend may be offline`)
    } finally {
      setLoading(false)
    }
  }, [station.port, fetchState])

  const stateColor = '#f58b00'
  const stateBg = 'rgba(245, 139, 0, 0.15)'

  const getStatusStyle = (status: string) => {
    const colors: Record<string, { color: string; bg: string }> = {
      Idle: { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)' },
      WaitingForStart: { color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.15)' },
      Processing: { color: '#f58b00', bg: 'rgba(245, 139, 0, 0.15)' },
      WaitForAck: { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)' },
      Error: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)' },
    }
    return colors[status] || { color: stateColor, bg: stateBg }
  }

  const statusStyle = getStatusStyle(state)

  const valMap: { key: keyof StateRefs; label: string; type: 'bool' | 'int' }[] = [
    { key: 'xQryBusy', label: 'xQryBusy', type: 'bool' },
    { key: 'xStart', label: 'xStart', type: 'bool' },
    { key: 'xAck', label: 'xAck', type: 'bool' },
    { key: 'xDone', label: 'xDone', type: 'bool' },
    { key: 'xCtrlError', label: 'xCtrlError', type: 'int' },
    { key: 'xErrL0', label: 'xErrL0', type: 'int' },
    { key: 'xErrL1', label: 'xErrL1', type: 'int' },
    { key: 'iCarrierID', label: 'iCarrierID', type: 'int' },
    { key: 'iStepNo', label: 'iStepNo', type: 'int' },
    { key: 'iResourceID', label: 'iResourceID', type: 'int' },
    { key: 'iPar1', label: 'iPar1', type: 'int' },
    { key: 'iPar2', label: 'iPar2', type: 'int' },
    { key: 'iPar3', label: 'iPar3', type: 'int' },
    { key: 'iPar4', label: 'iPar4', type: 'int' },
  ]

  return (
    <div style={{
      background: '#1e1e24',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      minWidth: '260px',
      flex: '1 1 260px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e4e4e7', letterSpacing: '-0.01em' }}>
          {station.name}
        </h3>
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          background: statusStyle.bg,
          color: statusStyle.color,
        }}>
          {state}
        </span>
      </div>

      {/* Port badge */}
      <div style={{ fontSize: '11px', color: '#71717a' }}>
        Port: {station.port}
      </div>

      {/* Variable values — compact 2-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px 12px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        padding: '10px',
      }}>
        {valMap.map(({ key, label, type }) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#a1a1aa' }}>{label}</span>
            <span style={{
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontWeight: 600,
              color: type === 'bool' ? (current[key] ? '#f58b00' : '#52525b') : '#d4d4d8',
              fontSize: '12px',
            }}>
              {type === 'bool' ? (current[key] ? '1' : '0') : String(current[key])}
            </span>
          </div>
        ))}
      </div>

      {/* Command buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
        <button
          onClick={() => sendCommand('xStart')}
          disabled={loading}
          style={{
            background: loading ? '#52525b' : '#f58b00',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Trigger Start
        </button>
        <button
          onClick={() => sendCommand('xAck')}
          disabled={loading}
          style={{
            background: loading ? '#52525b' : 'rgba(81,100,140,0.6)',
            color: '#e4e4e7',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Send Ack
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          fontSize: '11px',
          color: '#dc2626',
          background: 'rgba(220,38,38,0.1)',
          borderRadius: '6px',
          padding: '6px 8px',
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
