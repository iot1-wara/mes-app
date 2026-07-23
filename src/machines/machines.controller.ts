import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors, UploadedFile, Req, Res, UseGuards } from '@nestjs/common';
import { MachinesService } from './machines.service';
import type { CreateMachineDto, UpdateMachineDto } from './machine.dto';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@UploadedFile() file: Express.Multer.File, @Res() res: any) {
    const result = await this.machinesService.importCsv(file.buffer);
    return res.json(result);
  }

  @Get('export/csv')
  downloadTemplate(@Res() res: any) {
    const csv = this.machinesService.getCsvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=machines-template.csv');
    return res.send(csv);
  }
}
