import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CarrierService } from './carrier.service';
import { MaterialsService } from './materials.service';
import { MachineErrorsService } from './machine-errors.service';
import { DispatcherService } from './dispatcher.service';

describe('OrdersController', () => {
  let app: INestApplication;
  let mockOrders: any;
  let mockCarrier: any;
  let mockMaterials: any;
  let mockErrors: any;

  beforeEach(async () => {
    mockOrders = {
      create: jest.fn().mockResolvedValue({ id: 'o1', name: 'Order-1' }),
      findAll: jest.fn().mockResolvedValue([{ id: 'o1', name: 'Order-1' }]),
      findOne: jest.fn().mockResolvedValue({ id: 'o1', name: 'Detail' }),
      update: jest.fn().mockResolvedValue({ id: 'o1', status: 'in_progress' as any }),
      changeStatus: jest.fn().mockImplementation((id: string, status: string) => Promise.resolve({ id: 'o1', status })),
      remove: jest.fn().mockResolvedValue(undefined),
      advanceStep: jest.fn().mockResolvedValue({ step: 2 }),
      getOrderStats: jest.fn().mockResolvedValue({ total: 50, completed: 45 }),
    };

    mockCarrier = {
      create: jest.fn().mockResolvedValue({ id: 'c1', name: 'Carrier-1' }),
      findAll: jest.fn().mockResolvedValue([{ id: 'c1' }]),
      findOne: jest.fn().mockResolvedValue({ id: 'c1' }),
      update: jest.fn().mockResolvedValue({ id: 'c1', status: 'active' as any }),
      getByStation: jest.fn().mockResolvedValue([{}]),
    };

    mockMaterials = {
      create: jest.fn().mockResolvedValue({ id: 'mat1', name: 'Steel' }),
      findByOrderId: jest.fn().mockResolvedValue([{ id: 'mat1' }]),
    };

    mockErrors = {
      create: jest.fn().mockResolvedValue({ id: 'err1' }),
      findByMachine: jest.fn().mockResolvedValue([{}]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrders },
        { provide: CarrierService, useValue: mockCarrier },
        { provide: MaterialsService, useValue: mockMaterials },
        { provide: MachineErrorsService, useValue: mockErrors },
        { provide: DispatcherService, useValue: {} },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  describe('Carrier routes', () => {
    it('POST /orders/carriers should create carrier', async () => { const r = await request(app.getHttpServer()).post('/orders/carriers').send({ name: 'C1', current_station_id: 's1', next_resource_id: 'r1', order_id: 'o1' }).expect(201); expect(r.body.name).toBe('Carrier-1'); });
    it('GET /orders/carriers/list should return list', async () => { const r = await request(app.getHttpServer()).get('/orders/carriers/list').expect(200); expect(r.body).toHaveLength(1); });
    it('GET /orders/carriers/:id should return one', async () => { await request(app.getHttpServer()).get('/orders/carriers/c1').expect(200); });
    it('PATCH /orders/carriers/:id should update', async () => { const r = await request(app.getHttpServer()).patch('/orders/carriers/c1').send({ status: 'active' as any }).expect(200); expect(r.body.status).toBe('active'); });
    it('GET /orders/carriers/station/:stationId should return by station', async () => { const r = await request(app.getHttpServer()).get('/orders/carriers/station/s1').expect(200); expect(r.body).toHaveLength(1); });
  });

  describe('Order routes', () => {
    it('POST /orders should create order', async () => { const r = await request(app.getHttpServer()).post('/orders').send({ name: 'Ord-1', machine_id: 'm1', operation: 'cut' as any, quantity: 100, priority: 1 }).expect(201); expect(r.body.name).toBe('Order-1'); });
    it('GET /orders/stats should return stats', async () => { const r = await request(app.getHttpServer()).get('/orders/stats').expect(200); expect(r.body.total).toBe(50); });
    it('GET /orders should list orders', async () => { const r = await request(app.getHttpServer()).get('/orders').expect(200); expect(r.body).toHaveLength(1); });
    it('GET /orders/:id should return one', async () => { const r = await request(app.getHttpServer()).get('/orders/o1').expect(200); expect(r.body.name).toBe('Detail'); });
    it('PATCH /orders/:id should update', async () => { const r = await request(app.getHttpServer()).patch('/orders/o1').send({ status: 'in_progress' as any }).expect(200); expect(r.body.status).toBe('in_progress'); });
    it('POST /orders/:id/complete should complete', async () => { const r = await request(app.getHttpServer()).post('/orders/o1/complete').expect(201); expect(r.body.status).toBe('completed'); expect(mockOrders.changeStatus).toHaveBeenCalledWith('o1', 'completed'); });
    it('POST /orders/:id/cancel should cancel', async () => { const r = await request(app.getHttpServer()).post('/orders/o1/cancel').expect(201); expect(r.body.status).toBe('cancelled'); });
    it('POST /orders/:id/pause should pause', async () => { const r = await request(app.getHttpServer()).post('/orders/o1/pause').expect(201); expect(r.body.status).toBe('on_hold'); });
    it('POST /orders/:id/resume should resume', async () => { const r = await request(app.getHttpServer()).post('/orders/o1/resume').expect(201); expect(r.body.status).toBe('in_progress'); });
    it('DELETE /orders/:id should delete', async () => { await request(app.getHttpServer()).delete('/orders/o1').expect(200); });
    it('POST /orders/:id/advance-step should advance', async () => { const r = await request(app.getHttpServer()).post('/orders/o1/advance-step').expect(201); expect(r.body.step).toBe(2); });
  });

  describe('Material routes', () => {
    it('POST /orders/materials should add material', async () => { const r = await request(app.getHttpServer()).post('/orders/materials').send({ name: 'Steel', quantity_used: 10, quantity_remaining: 90, order_id: 'o1' }).expect(201); expect(r.body.name).toBe('Steel'); });
    it('GET /orders/materials/:orderId should return materials', async () => { const r = await request(app.getHttpServer()).get('/orders/materials/o1').expect(200); expect(r.body).toHaveLength(1); });
  });

  describe('Error routes', () => {
    it('POST /orders/errors should log error', async () => { const r = await request(app.getHttpServer()).post('/orders/errors').send({ machine_id: 'm1', error_category: 'spindle' as any }).expect(201); expect(r.body.id).toBeDefined(); });
    it('GET /orders/errors/:machineId should return errors', async () => { const r = await request(app.getHttpServer()).get('/orders/errors/m1').expect(200); expect(r.body).toHaveLength(1); });
  });
});
