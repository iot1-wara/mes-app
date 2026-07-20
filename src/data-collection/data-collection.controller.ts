import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DataCollectionService } from './data-collection.service';
import type { CreateDataPointDto } from './data-point.dto';

@Controller('data-collection')
export class DataCollectionController {
  constructor(private readonly dataCollectionService: DataCollectionService) {}

  @Post()
  create(@Body() dto: CreateDataPointDto) { return this.dataCollectionService.create(dto); }

  @Get(':machineId')
  getLatestByMachine(@Param('machineId') machineId: string, @Query('node_id') nodeId?: string) {
    return this.dataCollectionService.getLatestByMachine(machineId, nodeId);
  }

  @Get('stats/:machineId')
  getStats(@Param('machineId') machineId: string, @Query('node_id') nodeId?: string) {
    return this.dataCollectionService.getStatsByMachine(machineId, nodeId);
  }

  @Post('bulk')
  bulkCreate(@Body() points: CreateDataPointDto[]) { return this.dataCollectionService.bulkCreate(points); }
}
