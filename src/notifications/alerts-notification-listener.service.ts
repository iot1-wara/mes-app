import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../events/event-bus.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { MqttAlertService } from './mqtt-alert.service';

@Injectable()
export class AlarmsNotificationListener {
  private readonly logger = new Logger(AlarmsNotificationListener.name);

  constructor(
    eventBus: EventBusService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
    private readonly mqttAlertService: MqttAlertService,
  ) {
    eventBus.subscribe('alarm.dispatched', async (data: any) => {
      this.logger.log(`Dispatching alarm ${data.alarmId} via channel: ${data.channel}`);
      
      if (data.channel === 'mqtt' || !data.channel) {
        await this.mqttAlertService.send({
          title: `[${data.severity?.toUpperCase()}] ${data.machineId}`,
          body: data.message,
          topic: `mes/alarms/${data.severity}/created`,
          severity: data.severity,
        });
      }

      if (data.channel === 'email' || !data.channel) {
        await this.emailService.sendAlarm({
          id: data.alarmId,
          severity: data.severity || 'warning',
          machine_id: data.machineId,
          message: data.message,
          recipient: data.recipient,
        } as any);
      }

      if (data.channel === 'push' || !data.channel) {
        await this.pushService.send({
          title: `[${data.severity?.toUpperCase()}] ${data.machineId}`,
          body: data.message,
          recipient: data.recipient,
        });
      }
    });

    eventBus.subscribe('alert.triggered', async (data: any) => {
      this.logger.warn(`Alert rule triggered: ${data.ruleId} on ${data.machineId}`);
      
      if (data.channel === 'mqtt' || !data.channel) {
        await this.mqttAlertService.send({
          title: `[${data.severity?.toUpperCase()}] Rule ${data.ruleId}`,
          body: data.message,
          severity: data.severity,
        });
      }

      if (data.channel === 'email' || !data.channel) {
        await this.emailService.sendAlarm({
          id: data.ruleId,
          severity: data.severity || 'warning',
          machine_id: data.machineId,
          message: data.message,
        } as any);
      }

      if (data.channel === 'push' || !data.channel) {
        await this.pushService.send({
          title: `[${data.severity?.toUpperCase()}] Rule ${data.ruleId}`,
          body: data.message,
        });
      }
    });
  }
}
