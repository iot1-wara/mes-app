import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpcUaService } from './opcua.service';
import { MqttGatewayService } from './mqtt-gateway.service';

@Module({
  imports: [ConfigModule],
  providers: [OpcUaService, MqttGatewayService],
  exports: [OpcUaService, MqttGatewayService],
})
export class OpcUaModule {}
