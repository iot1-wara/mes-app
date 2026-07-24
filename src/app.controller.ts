import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('health')
  async getHealth() {
    const components: Record<string, { status: string; error?: string }> = {};

    // Database check
    try {
      await this.dataSource.query('SELECT 1');
      components.db = { status: 'up' };
    } catch (err: any) {
      components.db = { status: 'down', error: err.message };
    }

    const result: { ok: boolean; components: Record<string, { status: string; error?: string }>; timestamp: string } = {
      ok: Object.values(components).every(c => c.status !== 'down'),
      components,
      timestamp: new Date().toISOString(),
    };
    return result;
  }
}
