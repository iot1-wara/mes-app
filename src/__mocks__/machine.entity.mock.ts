export const MachineStatusEnum = { OFFLINE: 'offline', ONLINE: 'online', MAINTENANCE: 'maintenance', ERROR: 'error', IDLE: 'idle' };
export class MachineEntity { id!: string; name!: string; status!: string; type?: string; location!: string; model?: string; serial_number?: string; telemetry!: any; last_heartbeat?: Date; created_at!: Date; updated_at!: Date; }
