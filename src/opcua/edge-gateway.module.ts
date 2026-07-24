import { Module } from '@nestjs/common';
import { OpcUaModule } from './opcua.module';
import { EdgeController } from './edge.controller';
import { MqttGatewayService } from './mqtt-gateway.service';

@Module({
  imports: [OpcUaModule],
  controllers: [EdgeController],
  providers: [MqttGatewayService],
  exports: [MqttGatewayService],
})
export class EdgeGatewayModule {}
