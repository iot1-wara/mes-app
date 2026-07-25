import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ShiftService } from './shift.service';
import type { ShiftType } from './shift.entity';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftService) {}

  @Post()
  create(@Body() dto: { shift_type: ShiftType; supervisor: string; notes?: string }) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('date') dateStr?: string, @Query('shift') shiftType?: ShiftType, @Query('closed') closedStr?: string) {
    const params: any = {};
    if (dateStr) params.date = new Date(dateStr);
    if (shiftType) params.shift_type = shiftType;
    if (closedStr !== undefined) params.closed = closedStr === 'true';
    return this.service.findAll(params);
  }

  @Get('stats')
  getStats(@Query('start') start: string, @Query('end') end: string) {
    return this.service.getStatsByPeriod(new Date(start), new Date(end));
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post(':id/close')
  closeShift(@Param('id') id: string) { return this.service.closeShift(id); }

  @Get(':id/report')
  getReport(@Param('id') id: string) { return this.service.generateReport(id); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service['findOne'](id).then(() => this.service['shiftsRepo'].delete(id)); }
}
