import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AlertRulesEngineService } from './alert-rules-engine.service';
import type { CreateAlertRuleDto, UpdateAlertRuleDto } from './alert-rule.dto';

@Controller('alert-rules')
export class AlertRulesController {
  constructor(private readonly engine: AlertRulesEngineService) {}

  @Post()
  create(@Body() dto: CreateAlertRuleDto) { return this.engine.create(dto); }

  @Get()
  findAll() { return this.engine.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.engine.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.engine.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.engine.remove(id); }

  @Get('active-count')
  getActiveCount() { return this.engine.isEnabledCount(); }

  @Get('active-violations')
  getActiveViolations() { return this.engine.getActiveViolations(); }
}
