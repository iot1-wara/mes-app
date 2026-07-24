import { IsNotEmpty, IsNumber, IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export class CreateDataPointDto {
  @IsNotEmpty()
  @IsUUID()
  machine_id!: string;

  @IsNotEmpty()
  @IsString()
  node_id!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsEnum(['good', 'bad', 'uncertain'])
  quality?: 'good' | 'bad' | 'uncertain';

  @IsOptional()
  timestamp?: Date;
}
