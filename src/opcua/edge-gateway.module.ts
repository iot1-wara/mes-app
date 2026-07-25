import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpcUaModule } from './opcua.module';
import { EdgeController } from './edge.controller';
import { MachineEntity } from '../machines/machine.entity';
import { MqttModule } from './mqtt.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OpcUaModule, TypeOrmModule.forFeature([MachineEntity]), MqttModule, OrdersModule],
  controllers: [EdgeController],
  exports: [OpcUaModule],
})
export class EdgeGatewayModule {}