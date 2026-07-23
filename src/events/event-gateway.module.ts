import { Module } from '@nestjs/common';
import { EventGateway } from './edge-gateway.service';
import { EventBusService } from './event-bus.service';

@Module({
  providers: [EventGateway, EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
