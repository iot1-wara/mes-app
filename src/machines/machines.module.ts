import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { MachineEntity } from './machine.entity';
import { MachinesService } from './machines.service';
import { MachinesController } from './machines.controller';
import { OrdersModule } from '../orders/orders.module';
import * as multer from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([MachineEntity]),
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
    OrdersModule,
  ],
  controllers: [MachinesController],
  providers: [MachinesService],
  exports: [MachinesService],
})
export class MachinesModule {}
