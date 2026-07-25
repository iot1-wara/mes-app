import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { MachinesModule } from '../machines/machines.module';
import { EventBusModule } from '../events/event-gateway.module';
import { MqttGatewayService } from './mqtt-gateway.service';

@Module({
  imports: [OrdersModule, MachinesModule, EventBusModule],
  providers: [MqttGatewayService],
  exports: [MqttGatewayService],
})
export class MqttModule {}
