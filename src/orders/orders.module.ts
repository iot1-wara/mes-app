import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './order.entity';
import { CarrierEntity } from './carrier.entity';
import { MaterialEntity } from './material.entity';
import { MachineErrorEntity } from './machine-error.entity';
import { OpcUaModule } from '../opcua/opcua.module';
import { OrdersService } from './orders.service';
import { CarrierService } from './carrier.service';
import { MaterialsService } from './materials.service';
import { MachineErrorsService } from './machine-errors.service';
import { SpsDispatcherService } from './sps-dispatcher.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CarrierEntity, OrderEntity, MaterialEntity, MachineErrorEntity]), OpcUaModule],
  controllers: [OrdersController],
  providers: [OrdersService, CarrierService, MaterialsService, MachineErrorsService, SpsDispatcherService],
  exports: [OrdersService, CarrierService, MaterialsService, MachineErrorsService, SpsDispatcherService],
})
export class OrdersModule {}
