export type AlarmSeverity = 'info' | 'warning' | 'error' | 'critical';
export class AlarmEntity { id!: string; severity!: AlarmSeverity; machine_id!: string; message!: string; acknowledged!: boolean; source?: string; duration_seconds?: number; created_at!: Date; updated_at!: Date; }
