export interface StateRefs {
  xQryBusy: number
  xStart: number
  xAck: number
  xDone: number
  xCtrlError: number
  xErrL0: number
  xErrL1: number
  iCarrierID: number
  iStepNo: number
  iResourceID: number
  iPar1: number
  iPar2: number
  iPar3: number
  iPar4: number
}

export interface SimulatorStation {
  name: string
  port: number
  state: string
  current: StateRefs
}

export const STATIONS: Omit<SimulatorStation, 'state' | 'current'>[] = [
  { name: 'Entriegelung', port: 5500 },
  { name: 'Spritzgiessen', port: 5501 },
  { name: 'Montage', port: 5502 },
  { name: 'Pruefung', port: 5503 },
  { name: 'Verpackung', port: 5504 },
]

export type Command = 'xStart' | 'xAck' | 'xDone' | 'xErrL0' | 'xErrL1'

export const STATE_COLORS: Record<string, string> = {
  Idle: 'var(--color-status-success)',
  WaitingForStart: 'var(--color-status-warning)',
  Processing: 'var(--color-brand-primary)',
  WaitForAck: 'var(--color-status-success)',
  Error: 'var(--color-status-error)',
}

export const STATE_BGColors: Record<string, string> = {
  Idle: 'rgba(22, 163, 74, 0.15)',
  WaitingForStart: 'rgba(202, 138, 4, 0.15)',
  Processing: 'rgba(245, 139, 0, 0.15)',
  WaitForAck: 'rgba(22, 163, 74, 0.15)',
  Error: 'rgba(220, 38, 38, 0.15)',
}
