export function formatTimestamp(ts: string | Date): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('de-DE');
}

type MachineStatus = 'online' | 'offline' | 'warning' | 'error' | 'idle' | 'maintenance';
type OrderStatus = 'pending' | 'released' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
type CarrierStatus = 'idle' | 'in_process' | 'at_station' | 'moved' | 'error' | 'waiting_for_material';

export function getStatusBadge(status?: string): string {
  const map: Record<string, string> = {
    online: 'bg-status-success-bg text-status-success',
    running: 'bg-status-success-bg text-status-success',
    idle: 'bg-status-warning-bg text-status-warning',
    warning: 'bg-status-warning-bg text-status-warning',
    error: 'bg-status-error-bg text-status-error',
    offline: 'bg-neutral-100 text-neutral-400',
    pending: 'bg-status-info-bg/80 text-status-info',
    released: 'bg-status-info-bg text-status-info',
    in_progress: 'bg-status-success-bg text-status-success',
    completed: 'bg-status-success-bg text-status-success',
    cancelled: 'bg-neutral-100 text-neutral-400',
    on_hold: 'bg-status-warning-bg text-status-warning',
    maintenance: 'bg-status-warning-bg text-status-warning',
    at_station: 'bg-brand-lilac/10 text-brand-lilac',
    in_process: 'bg-brand-primary/10 text-brand-primary',
    moved: 'bg-status-info-bg text-status-info',
    waiting_for_material: 'bg-status-warning-bg text-status-warning',
  };
  return map[status || ''] || 'bg-neutral-100 text-neutral-400';
}

export function getStatusDot(status?: string): string {
  const map: Record<string, string> = {
    online: 'bg-status-success animate-pulse',
    running: 'bg-status-success animate-pulse',
    idle: 'bg-status-warning',
    warning: 'bg-status-warning animate-pulse',
    error: 'bg-status-error',
    offline: 'bg-neutral-300',
    pending: 'bg-status-info',
    released: 'bg-status-info',
    in_progress: 'bg-status-success animate-pulse',
    completed: 'bg-status-success',
    cancelled: 'bg-neutral-300',
    on_hold: 'bg-status-warning',
    maintenance: 'bg-status-warning',
    at_station: 'bg-brand-lilac',
    in_process: 'bg-brand-primary',
    moved: 'bg-status-info',
    waiting_for_material: 'bg-status-warning',
  };
  return map[status || ''] || 'bg-neutral-300';
}

export function getPriorityColor(p: string): string {
  const map: Record<string, string> = {
    critical: 'text-status-error font-bold',
    high: 'text-brand-primary font-semibold',
    medium: 'text-status-warning',
    low: 'text-neutral-mid'
  };
  return map[p] || 'text-neutral-400';
}

export function getCarrierStatusStyles(status?: CarrierStatus): string {
  const map: Record<string, string> = {
    idle: 'bg-neutral-50 border border-dashed border-neutral-border',
    in_process: 'border-2 border-brand-primary bg-white',
    at_station: 'border-2 border-brand-lilac py-1 bg-accent-lilac-bg/30',
    moved: 'border-2 border-status-info bg-status-info-bg/30',
    error: 'border-2 border-status-error bg-status-error-bg/30',
    waiting_for_material: 'border-2 border-status-warning bg-status-warning-bg/30',
  };
  return map[status || ''] || 'bg-neutral-50 border border-dashed border-neutral-border';
}

export function getCarrierStatusBarClass(status?: CarrierStatus): string {
  const map: Record<string, string> = {
    idle: 'carrier-status-bar carrier-status-bar--idle',
    in_process: 'carrier-status-bar carrier-status-bar--brand',
    at_station: 'carrier-status-bar carrier-status-bar--lilac',
    moved: 'carrier-status-bar carrier-status-bar--info',
    error: 'carrier-status-bar carrier-status-bar--error',
    waiting_for_material: 'carrier-status-bar carrier-status-bar--warning',
  };
  return map[status || ''] || 'carrier-status-bar carrier-status-bar--idle';
}

export function getMachineStatusGradientClass(status?: MachineStatus): string {
  const map: Record<string, string> = {
    online: 'station-gradient-online border-neutral-border bg-white',
    running: 'station-gradient-online border-neutral-border bg-white',
    offline: 'station-gradient-offline border-dashed border-neutral-border bg-neutral-50',
    warning: 'station-gradient-warning border-status-warning/30 bg-white',
    error: 'station-gradient-error border-status-error/30 bg-white',
    idle: 'station-gradient-online border-neutral-border bg-white',
    maintenance: 'station-gradient-warning border-dashed border-status-warning/30 bg-status-warning-bg/50',
  };
  return map[status || ''] || 'station-gradient-offline border-dashed border-neutral-border bg-neutral-50';
}

export function getHandshakeDotClass(condition?: boolean, type: 'success' | 'brand' | 'info' = 'success'): string {
  if (!condition) return '';
  const classes: Record<string, string[]> = {
    success: ['hs-dot', 'hs-dot-success'],
    brand: ['hs-dot', 'hs-dot-brand'],
    info: ['hs-dot', 'hs-dot-info'],
  };
  return classes[type]?.join(' ') || '';
}

export { MachineStatus, OrderStatus, CarrierStatus };
