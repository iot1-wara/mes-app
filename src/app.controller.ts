import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

interface HealthComponent { status: string; error?: string; }

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  async getHealth() {
    const dbStatus = this.checkDatabase();
    const components: Record<string, HealthComponent> = {};
    components['db'] = dbStatus;
    
    const result: { ok: boolean; components: Record<string, HealthComponent>; timestamp: string } = {
      ok: Object.values(components).every(c => c.status !== 'down'),
      components,
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


