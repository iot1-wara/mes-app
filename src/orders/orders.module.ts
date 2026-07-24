import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './order.entity';
import { CarrierEntity } from './carrier.entity';
import { MaterialEntity } from './material.entity';
import { MachineErrorEntity } from './machine-error.entity';
import { OrdersService } from './orders.service';
import { CarrierService } from './carrier.service';
import { MaterialsService } from './materials.service';
import { MachineErrorsService } from './machine-errors.service';
import { DispatcherService } from './dispatcher.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, CarrierEntity, MaterialEntity, MachineErrorEntity])],
  controllers: [OrdersController],
  providers: [OrdersService, CarrierService, MaterialsService, MachineErrorsService, DispatcherService],
  exports: [OrdersService, CarrierService, MaterialsService, MachineErrorsService],
})
export class OrdersModule {}
