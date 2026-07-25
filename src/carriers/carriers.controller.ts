import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UsePipes } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { CarrierService } from '../orders/carrier.service';
import type { CreateCarrierDto, UpdateCarrierDto, AdvanceCarrierDto } from '../orders/carrier.dto';

@Controller('carriers')
export class CarriersController {
  constructor(private readonly carrierService: CarrierService) {}

  @Get() 
  getAll() { return this.carrierService.findAll(); }

  @Get('stats')
  getStats() { return this.carrierService.getStats(); }

  @Get('list') 
  getAllAlias() { return this.carrierService.findAll(); }

  @Get('station/:stationId')
  getByStation(@Param('stationId') stationId: string) { return this.carrierService.getByStation(stationId); }

  @Get('handshake-statuses')
  getHandshakeStatuses() { return this.carrierService.getHandshakeStatuses(); }

  @Get('dbprocessdata')
  getDbProcessData() { return this.carrierService.getDbProcessData(); }

  @Get('next-resources')
  getNextResources() { return this.carrierService.getNextResources(); }

  @Get(':id')
  getOne(@Param('id') id: string) { return this.carrierService.findOne(id); }

  @Post()
  create(@Body() dto: any) { 
    const name = dto?.name?.toString()?.trim();
    if (!name) { return Promise.reject(new Error('Name is required')); }
    return this.carrierService.create({ name, status: dto?.status, iStepNo: dto?.iStepNo, nextStepNo: dto?.nextStepNo } as CreateCarrierDto); 
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCarrierDto) { 
    return this.carrierService.update(id, dto); 
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.carrierService.remove(id); }

  @Post(':id/advance-step')
  advance(@Param('id') id: string, @Body() body: { next_resource_id?: number | null }) { 
    return this.carrierService.advanceManual(id, body as Omit<AdvanceCarrierDto, 'iStepNo'>); 
  }
}
