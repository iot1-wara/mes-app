import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TracesService } from './traces.service';
import type { CreateTraceDto, TraceCategoryType } from './trace.dto';

@Controller('traces')
export class TracesController {
  constructor(private readonly tracesService: TracesService) {}

  @Post()
  create(@Body() dto: CreateTraceDto) { return this.tracesService.create(dto); }

  @Get()
  findAll(@Query('machine_id') machineId?: string, 
          @Query('category') category?: TraceCategoryType, 
          @Query('key_data_point') keyDataPoint?: string,
          @Query('value_min') valueMin?: number,
          @Query('value_max') valueMax?: number) {
    if (machineId && !category && !keyDataPoint && valueMin == null && valueMax == null) {
      return this.tracesService.getTracesByMachine(machineId);
    }
    if (category && !machineId && !keyDataPoint && valueMin == null && valueMax == null) {
      return this.tracesService.getTracesByCategory(category);
    }
    return this.tracesService.findAll({ machine_id: machineId, category, key_data_point: keyDataPoint, value_min: valueMin, value_max: valueMax });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.tracesService.findOne(id); }

  @Get('machine/:machineId')
  getByMachine(@Param('machineId') machineId: string, @Query('take') take?: string) {
    return this.tracesService.getTracesByMachine(machineId, +(take || '100'));
  }

  @Get('order/:orderId')
  getByOrder(@Param('orderId') orderId: string, @Query('take') take?: string) {
    return this.tracesService.getTracesByOrder(orderId, +(take || '100'));
  }

  @Post('bulk')
  bulkCreate(@Body() traces: CreateTraceDto[]) { return this.tracesService.bulkCreate(traces); }
}
