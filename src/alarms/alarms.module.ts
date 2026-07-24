import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlarmEntity } from './alarm.entity';
import { AlarmsService } from './alarms.service';
import { AlarmsController } from './alarms.controller';
import { EventBusModule } from '../events/event-gateway.module';

@Module({
  imports: [TypeOrmModule.forFeature([AlarmEntity]), EventBusModule],
  controllers: [AlarmsController],
  providers: [AlarmsService],
  exports: [AlarmsService],
})
export class AlarmsModule {}
