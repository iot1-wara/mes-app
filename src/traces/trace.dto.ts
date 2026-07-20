import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export type TraceCategoryType = 'process_data' | 'quality' | 'material' | 'energy' | 'op_input';

export class CreateTraceDto {
  @IsNotEmpty()
  @IsString()
  machine_id: string;

  @IsOptional()
  @IsUUID()
  order_id?: string;

  @IsNotEmpty()
  category: TraceCategoryType;

  @IsNotEmpty()
  key_data_point: string;

  value: any;

  @IsOptional()
  tags?: Record<string, string>;
}
