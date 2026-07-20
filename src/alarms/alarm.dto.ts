import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import type { AlarmSeverity } from './alarm.entity';

export class CreateAlarmDto {
  @Transform(({ value }) => (value || 'info').toLowerCase())
  @IsEnum(['info', 'warning', 'error', 'critical'])
  severity: AlarmSeverity;

  @IsNotEmpty()
  @IsString()
  machine_id: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  source?: string;
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
}
