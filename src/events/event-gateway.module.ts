import { Module, DynamicModule } from '@nestjs/common';
import { EventBusService } from './event-bus.service';

@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {
  static forRoot(): DynamicModule {
    return {
      module: EventBusModule,
      providers: [EventBusService],
      exports: [EventBusService],
    };
  }
}
