import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AlarmsService } from './alarms.service';
import type { CreateAlarmDto } from './alarm.dto';

@Controller('alarms')
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Post()
  create(@Body() dto: CreateAlarmDto) { return this.alarmsService.create(dto); }

  @Get()
  findAll() { return this.alarmsService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.alarmsService.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.alarmsService.update(id, dto); }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  acknowledge(@Param('id') id: string) { return this.alarmsService.acknowledge(id); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.alarmsService.remove(id); }

  @Get('stats/active-count')
  getActiveAlarmCount() { return this.alarmsService.setActiveCount(); }
}
