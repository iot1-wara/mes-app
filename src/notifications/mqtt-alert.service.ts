import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MqttGatewayService } from '../opcua/mqtt-gateway.service';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class MqttAlertService {
  private readonly logger = new Logger(MqttAlertService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepo: Repository<NotificationEntity>,
    private readonly mqttGateway: MqttGatewayService,
  ) {}

  async send(opts: { title: string; body: string; topic?: string; severity?: string }): Promise<void> {
    const topic = opts.topic || `mes/alarms/${opts.severity || 'critical'}/created`;
    this.logger.log(`[mqtt-alert] publishing to ${topic}: ${opts.title}`);

    const notification = new NotificationEntity();
    notification.channel = 'mqtt';
    notification.subject = opts.title;
    notification.body = opts.body;
    notification.status = 'sent';
    await this.notificationsRepo.save(notification);

    await this.mqttGateway.publish(topic, { title: opts.title, body: opts.body });
  }
}
