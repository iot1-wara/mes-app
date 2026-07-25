import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async send(opts: { title: string; body: string; recipient?: string }): Promise<void> {
    this.logger.log(`[push] sending notification: ${opts.title}`);
    if (opts.recipient) {
      this.logger.log(`[push] targeting recipient: ${opts.recipient}`);
    }
  }
}
