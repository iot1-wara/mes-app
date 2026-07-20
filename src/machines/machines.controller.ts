import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { MachinesService } from './machines.service';
import type { CreateMachineDto, UpdateMachineDto } from './machine.dto';

@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Post()
  create(@Body() dto: CreateMachineDto) { return this.machinesService.create(dto); }

  @Get()
  findAll() { return this.machinesService.findAll(); }

  @Get('online')
  findOnline() { return this.machinesService.findOnline(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.machinesService.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMachineDto) { return this.machinesService.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.machinesService.remove(id); }

  @Patch(':id/heartbeat')
  updateHeartbeat(@Param('id') id: string) { return this.machinesService.updateHeartbeat(id); }

  @Get('location/:location')
  findByLocation(@Param('location') location: string) { return this.machinesService.findByLocation(location); }
}
