import { IsOptional, IsString, IsNotEmpty, IsBoolean, IsNumber, IsIn, IsUUID } from 'class-validator';

export class CreateAlertRuleDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  machine_id!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsNotEmpty()
  @IsString()
  metric!: string;

  @IsOptional()
  @IsIn(['gt', 'gte', 'lt', 'lte', 'eq', 'range'])
  operator?: string;

  @IsOptional()
  @IsNumber()
  threshold_value?: number;

  @IsOptional()
  @IsNumber()
  threshold_low?: number;

  @IsOptional()
  @IsNumber()
  threshold_high?: number;

  @IsOptional()
  @IsNumber()
  duration_seconds?: number;

  @IsOptional()
  @IsIn(['info', 'warning', 'error', 'critical'])
  severity?: string;

  @IsNotEmpty()
  @IsString()
  message_template!: string;

  @IsOptional()
  @IsIn(['in_app', 'email', 'push', 'mqtt'])
  channel?: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @IsNumber()
  evaluation_interval_seconds?: number;

  @IsOptional()
  custom_config?: Record<string, any>;
}

export class UpdateAlertRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  metric?: string;

  @IsOptional()
  @IsIn(['gt', 'gte', 'lt', 'lte', 'eq', 'range'])
  operator?: string;

  @IsOptional()
  @IsNumber()
  threshold_value?: number;

  @IsOptional()
  @IsNumber()
  threshold_low?: number;

  @IsOptional()
  @IsNumber()
  threshold_high?: number;

  @IsOptional()
  @IsNumber()
  duration_seconds?: number;

  @IsOptional()
  @IsIn(['info', 'warning', 'error', 'critical'])
  severity?: string;

  @IsOptional()
  @IsString()
  message_template?: string;

  @IsOptional()
  @IsIn(['in_app', 'email', 'push', 'mqtt'])
  channel?: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  custom_config?: Record<string, any>;
}
