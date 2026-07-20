import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export type MachineStatus = 'online' | 'offline' | 'maintenance' | 'error' | 'idle';

export class CreateMachineDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @Transform(({ value }) => (value || 'offline').toLowerCase())
  @IsEnum(['online', 'offline', 'maintenance', 'error', 'idle'])
  status: MachineStatus;

  @IsOptional()
  @IsString()
  type?: string;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serial_number?: string;
}

export class UpdateMachineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @Transform(({ value }) => (value || 'idle').toLowerCase())
  @IsOptional()
  @IsEnum(['online', 'offline', 'maintenance', 'error', 'idle'])
  status?: MachineStatus;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serial_number?: string;
}
