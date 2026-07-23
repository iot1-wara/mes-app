import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('oee')
  getOEE(@Query('machineId') machineId?: string) {
    return this.dashboardService.getOEE(machineId);
  }

  @Get('trend')
  getTrendData(@Query('range') range: string = '24h') {
    return this.dashboardService.getTrendData(range);
  }

  @Get('pareto')
  getPareto() {
    return this.dashboardService.getPareto();
  }

  @Get('machines')
  getMachineStats() {
    return this.dashboardService.getMachineStats();
  }
}
