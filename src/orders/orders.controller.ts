import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import type { CreateOrderDto, UpdateOrderDto } from './order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) { return this.ordersService.create(dto); }

  @Get()
  findAll() { return this.ordersService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.ordersService.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) { return this.ordersService.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.ordersService.remove(id); }

  @Patch(':id/progress/:completedQty')
  updateProgress(@Param('id') id: string, @Param('completedQty') completedQty: number) { return this.ordersService.updateProgress(id, completedQty); }

  @Get('line/:machineId/pending')
  getPendingByLine(@Param('machineId') machineId: string) { return this.ordersService.getPendingByLine(machineId); }

  @Get('active')
  getActiveOrders() { return this.ordersService.getActiveOrders(); }
}
