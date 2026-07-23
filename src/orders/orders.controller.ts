import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CarrierService } from './carrier.service';
import { MaterialsService } from './materials.service';
import { MachineErrorsService } from './machine-errors.service';
import { DispatcherService } from './dispatcher.service';
import type { CreateOrderDto, UpdateOrderDto } from './order.dto';
import type { CreateCarrierDto, UpdateCarrierDto, AdvanceCarrierDto } from './carrier.dto';
import type { CreateMaterialDto } from './material.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly carrierService: CarrierService,
    private readonly materialsService: MaterialsService,
    private readonly machineErrorsService: MachineErrorsService,
    private readonly dispatcherService: DispatcherService,
  ) {}

  // --- Orders ---
  @Post()
  createOrder(@Body() dto: CreateOrderDto) { return this.ordersService.create(dto); }

  @Get()
  getAllOrders(@Query('status') status?: string) { return this.ordersService.findAll(status); }

  @Get(':id')
  getOrder(@Param('id') id: string) { return this.ordersService.findOne(id); }

  @Patch(':id')
  updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) { return this.ordersService.update(id, dto); }

  @Post(':id/complete')
  completeOrder(@Param('id') id: string) { return this.ordersService.changeStatus(id, 'completed'); }

  @Post(':id/cancel')
  cancelOrder(@Param('id') id: string) { return this.ordersService.changeStatus(id, 'cancelled'); }

  @Post(':id/pause')
  pauseOrder(@Param('id') id: string) { return this.ordersService.changeStatus(id, 'on_hold'); }

  @Post(':id/resume')
  resumeOrder(@Param('id') id: string) { return this.ordersService.changeStatus(id, 'in_progress'); }

  @Delete(':id')
  deleteOrder(@Param('id') id: string) { return this.ordersService.remove(id); }

  @Post(':id/advance-step')
  advanceStep(@Param('id') id: string) { return this.ordersService.advanceStep(id); }

  @Get('stats')
  getOrderStats() { return this.ordersService.getOrderStats(); }

  // --- Carrier CRUD ---
  @Post('carriers')
  createCarrier(@Body() dto: CreateCarrierDto) { return this.carrierService.create(dto); }

  @Get('carriers')
  getAllCarriers() { return this.carrierService.findAll(); }

  @Get('carriers/:id')
  getCarrier(@Param('id') id: string) { return this.carrierService.findOne(id); }

  @Patch('carriers/:id')
  updateCarrier(@Param('id') id: string, @Body() dto: UpdateCarrierDto) { return this.carrierService.update(id, dto); }

  @Get('carriers/station/:stationId')
  getCarriersByStation(@Param('stationId') stationId: string) { return this.carrierService.getByStation(stationId); }

  // --- Materials ---
  @Post('materials')
  addMaterial(@Body() dto: CreateMaterialDto) { return this.materialsService.create(dto); }

  @Get('materials/:orderId')
  getMaterialsForOrder(@Param('orderId') orderId: string) { return this.materialsService.findByOrderId(orderId); }

  // --- Machine Errors ---
  @Post('errors')
  logError(@Body() dto: any) { return this.machineErrorsService.create(dto); }

  @Get('errors/:machineId')
  getMachineErrors(@Param('machineId') machineId: string) { return this.machineErrorsService.findByMachine(machineId); }

  // --- Dispatcher / Health ---
  @Post('dispatcher/trigger/:carrierId')
  async triggerDispatch(@Param('carrierId') carrierId: string) {
    const result = await this.dispatcherService.dispatch(carrierId);
    return result;
  }

  @Get('dispatcher/queue')
  getDispatcherQueue() { return this.dispatcherService.getDispatchQueue(); }
}
