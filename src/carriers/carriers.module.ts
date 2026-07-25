import { Module } from '@nestjs/common';
import { CarriersController } from './carriers.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [CarriersController],
})
export class CarriersModule {}
