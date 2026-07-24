import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import type { AlarmSeverity } from './alarm.entity';

export class CreateAlarmDto {
  @Transform(({ value }) => (value || 'info').toLowerCase())
  @IsEnum(['info', 'warning', 'error', 'critical'])
  severity!: AlarmSeverity;

  @IsNotEmpty()
  @IsString()
  machine_id!: string;

  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsUUID()
  rule_id?: string;

  @IsOptional()
  @IsEnum(['in_app', 'email', 'push', 'mqtt'])
  channel?: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @IsEnum(['pending', 'sending', 'sent', 'failed'])
  delivery_status?: string;
}

export class UpdateAlarmDto {
  @IsOptional()
  @IsEnum(['info', 'warning', 'error', 'critical'])
  severity?: AlarmSeverity;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  acknowledged_at?: Date;

  @IsOptional()
  @IsEnum(['pending', 'sending', 'sent', 'failed'])
  delivery_status?: string;
}
