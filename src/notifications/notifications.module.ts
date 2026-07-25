import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { MqttAlertService } from './mqtt-alert.service';
import { NotificationEntity } from './notification.entity';
import { AlertRuleEntity } from './alert-rule.entity';
import { ShiftEntity } from './shift.entity';
import { AlertRulesEngineService } from './alert-rules-engine.service';
import { AlertRulesController } from './alert-rules.controller';
import { ShiftService } from './shift.service';
import { ShiftsController } from './shift.controller';
import { AlarmsNotificationListener } from './alerts-notification-listener.service';
import { EdgeGatewayModule } from '../opcua/edge-gateway.module';
import { EventBusModule } from '../events/event-gateway.module';
import { DataCollectionModule } from '../data-collection/data-collection.module';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, AlertRuleEntity, ShiftEntity]), EdgeGatewayModule, EventBusModule, DataCollectionModule],
  providers: [EmailService, PushService, MqttAlertService, AlertRulesEngineService, ShiftService, AlarmsNotificationListener],
  exports: [EmailService, PushService, MqttAlertService, AlertRulesEngineService, ShiftService],
  controllers: [AlertRulesController, ShiftsController],
})
export class NotificationsModule {}
