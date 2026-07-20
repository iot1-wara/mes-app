import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { OpcUaService } from './opcua.service';
import { MqttGatewayService } from './mqtt-gateway.service';

@Controller('edge')
export class EdgeController {
  constructor(
    private readonly opcUaService: OpcUaService,
    private readonly mqttGatewayService: MqttGatewayService,
  ) {}

  @Get('opcua/status')
  getOpcUaStatus() { return this.opcUaService.getServerStatus(); }

  @Get('opcua/connected')
  opcuaConnected() { return { connected: this.opcUaService.isConnected() }; }

  @Post('opcua/read')
  readOpcUaNode(@Body('nodeId') nodeId: string) { return this.opcUaService.readNode(nodeId); }

  @Get('mqtt/connected')
  mqttConnected() { return { connected: this.mqttGatewayService.isConnected() }; }

  @Post('mqtt/publish')
  publishToMqtt(@Body('topic') topic: string, @Body('payload') payload: any) {
    this.mqttGatewayService.publish(topic, payload);
    return { published: true, topic };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      opcua: this.opcUaService.isConnected(),
      mqtt: this.mqttGatewayService.isConnected(),
    };
  }
}
