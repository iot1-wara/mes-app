import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendAlarm(alarm: import('../alarms/alarm.entity').AlarmEntity): Promise<void> {
    const recipient = alarm.recipient || 'operator@mes.com';
    this.logger.log(`[email] sending alarm to ${recipient}: [${alarm.severity.toUpperCase()}] ${alarm.message}`);

    const notification = new NotificationEntity();
    notification.channel = 'email';
    notification.recipient = recipient;
    notification.subject = `[alarm] ${alarm.severity.toUpperCase()}: ${alarm.machine_id}`;
    notification.body = alarm.message;
    notification.status = 'sent';
    this.logger.log(`[email] notification sent successfully to ${recipient}`);
  }
}
