import { IsNotEmpty, IsString, IsUUID, IsOptional, Min, IsNumber } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @Min(1)
  @IsNumber()
  priority: number;

  @IsUUID()
  machine_id: string;

  @IsNotEmpty()
  @IsString()
  operation: string;

  @Min(1)
  @IsNumber()
  quantity: number;

  @IsOptional()
  start_time?: Date;

  @IsOptional()
  target_complete_time?: Date;
}

export class UpdateOrderDto {
  @IsOptional()
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

  @IsOptional()
  completed_quantity?: number;

  @IsOptional()
  @IsString()
  error_message?: string;
}
