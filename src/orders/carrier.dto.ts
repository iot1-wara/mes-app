import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum, IsNumber, IsInt } from 'class-validator';

export class CreateCarrierDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  // next_resource_id as integer (matches SPS int(2))
  @IsOptional()
  @IsInt()
  current_station_id_alt?: number;

  @IsOptional()
  @IsUUID()
  order_id?: string;

  @IsNumber()
  @IsOptional()
  iStepNo?: number;

  @IsNumber()
  @IsOptional()
  nextStepNo?: number;

  // dbProcessData fields
  @IsOptional()
  @IsInt()
  iCarrierID?: number | null;

  @IsOptional()
  @IsInt()
  iResourceID?: number | null;

  @IsNumber()
  @IsOptional()
  iPar1?: number;

  @IsNumber()
  @IsOptional()
  iPar2?: number;

  @IsNumber()
  @IsOptional()
  iPar3?: number;

  @IsNumber()
  @IsOptional()
  iPar4?: number;

  @IsOptional()
  partNumber?: string;  // udiPNo

  @IsOptional()
  lastProcessTimestamp?: Date;

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

  // dbProcessData: integer for resource ID
  @IsOptional()
  @IsInt()
  iResourceID?: number | null;

  // sMES query fields
  @IsOptional()
  @IsInt()
  uiResourceId?: number;

  // Carrier data
  @IsOptional()
  @IsInt()
  iCarrierID?: number | null;

  @IsOptional()
  componentId?: string | number;

  @IsOptional()
  partNumber?: string;  // udiPNo aus stMesQuery

  // Manual parameter entry (iPar1-4)
  @IsOptional()
  @IsNumber()
  iPar1?: number;

  @IsOptional()
  @IsNumber()
  iPar2?: number;

  @IsOptional()
  @IsNumber()
  iPar3?: number;

  @IsOptional()
  @IsNumber()
  iPar4?: number;

  @IsOptional()
  lastProcessTimestamp?: Date | null;

  @IsOptional()
  process_data?: Record<string, any>;

  @IsOptional()
  handshake_flags?: Record<string, any>;
}

export class AdvanceCarrierDto {
  @IsNumber()
  iStepNo!: number;

  // Changed: now integer (was UUID) to match SPS int(2) for iResourceID
  @IsInt()
  next_resource_id!: number | null;

  @IsString()
  step_description?: string;
}
