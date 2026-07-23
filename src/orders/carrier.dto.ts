import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class CreateCarrierDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsUUID()
  current_station_id: string;

  @IsUUID()
  next_resource_id: string;

  @IsUUID()
  order_id: string;

  @IsNumber()
  @IsOptional()
  iStepNo?: number;

  @IsNumber()
  @IsOptional()
  nextStepNo?: number;

  @IsOptional()
  @IsEnum(['idle', 'in_process', 'at_station', 'moved', 'error', 'waiting_for_material'])
  status?: 'idle' | 'in_process' | 'at_station' | 'moved' | 'error' | 'waiting_for_material';
}

export class UpdateCarrierDto {
  @IsOptional()
  @IsEnum(['idle', 'in_process', 'at_station', 'moved', 'error', 'waiting_for_material'])
  status?: 'idle' | 'in_process' | 'at_station' | 'moved' | 'error' | 'waiting_for_material';

  @IsOptional()
  @IsNumber()
  iStepNo?: number;

  @IsOptional()
  @IsNumber()
  nextStepNo?: number;

  @IsOptional()
  @IsString()
  next_resource_id?: string;

  @IsOptional()
  process_data?: Record<string, any>;

  @IsOptional()
  handshake_flags?: Record<string, any>;
}

export class AdvanceCarrierDto {
  @IsNumber()
  iStepNo: number;

  @IsUUID()
  next_resource_id: string;

  @IsString()
  step_description?: string;
}
