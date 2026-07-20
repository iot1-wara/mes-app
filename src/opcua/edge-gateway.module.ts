import { Module } from '@nestjs/common';
import { OpcUaModule } from './opcua.module';
import { EdgeController } from './edge.controller';

@Module({
  imports: [OpcUaModule],
  controllers: [EdgeController],
})
export class EdgeGatewayModule {}
