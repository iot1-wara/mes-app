import { Controller, Get, Headers } from '@nestjs/common';
import { AppService } from './app.service';

interface HealthComponent { status: string; error?: string; }

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  async getHealth(@Headers('authorization') auth?: string) {
    const dbStatus = this.checkDatabase();
    const status: Record<string, HealthComponent> = { ok: true as any };
    status.components = { db: dbStatus };
    
    const result: { ok: boolean; components: Record<string, HealthComponent>; timestamp: string } = {
      ok: Object.values(status.components).every(c => c.status !== 'down'),
      components: status.components,
      timestamp: new Date().toISOString(),
    };
    return result;
  }

  private checkDatabase(): HealthComponent {
    try {
      return { status: 'up' };
    } catch (err: any) {
      return { status: 'down', error: err.message };
    }
  }
}


