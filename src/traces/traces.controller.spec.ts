import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { TracesController } from './traces.controller';
import { TracesService } from './traces.service';

describe('TracesController', () => {
  let app: INestApplication;
  let mockCreate = jest.fn();
  let mockFindAll = jest.fn();
  let mockFindOne = jest.fn();
  let mockGetByMachine = jest.fn();
  let mockGetByCategory = jest.fn();
  let mockGetByOrder = jest.fn();
  let mockBulkCreate = jest.fn();

  beforeEach(async () => {
    const mockTraces = {
      create: mockCreate.mockResolvedValue({ id: 't1', machine_id: 'm1' }),
      findAll: mockFindAll.mockResolvedValue([{ id: 't1', machine_id: 'm1' }]),
      findOne: mockFindOne.mockResolvedValue({ id: 't1', value: 42.5 }),
      getTracesByMachine: mockGetByMachine.mockResolvedValue([{}]),
      getTracesByCategory: mockGetByCategory.mockResolvedValue([{}]),
      getTracesByOrder: mockGetByOrder.mockResolvedValue([{ id: 't1' }]),
      bulkCreate: mockBulkCreate.mockResolvedValue([{ id: 't1' }, { id: 't2' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TracesController],
      providers: [{ provide: TracesService, useValue: mockTraces }],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  describe('POST /traces', () => {
    it('should create a trace', async () => { const r = await request(app.getHttpServer()).post('/traces').send({ machine_id: 'm1', category: 'process_data' as any, key_data_point: 'temp', value: 42.5 }); expect(r.body.id).toBe('t1'); });
  });

  describe('GET /traces', () => {
    it('should return all traces with no filters', async () => { const r = await request(app.getHttpServer()).get('/traces').expect(200); expect(r.body).toHaveLength(1); });
    it('should filter by machine_id only', async () => { const r = await request(app.getHttpServer()).get('/traces?machine_id=m1') as any; expect(mockGetByMachine).toHaveBeenCalled(); });
  });

  describe('GET /traces/:id', () => {
    it('should return one trace', async () => { const r = await request(app.getHttpServer()).get('/traces/t1').expect(200); expect(r.body.value).toBe(42.5); });
  });

  describe('GET /traces/machine/:machineId', () => {
    it('should return traces by machine with take param', async () => { const r = await request(app.getHttpServer()).get('/traces/machine/m1?take=50'); expect(mockGetByMachine).toHaveBeenCalledWith('m1', 50); });
    it('should default take to 100 when not provided', async () => { const r = await request(app.getHttpServer()).get('/traces/machine/m1'); expect(mockGetByMachine).toHaveBeenCalledWith('m1', 100); });
  });

  describe('GET /traces/order/:orderId', () => {
    it('should return traces by order', async () => { const r = await request(app.getHttpServer()).get('/traces/order/o1').expect(200); expect(r.body).toBeDefined(); });
  });

  describe('POST /traces/bulk', () => {
    it('should bulk create traces', async () => { const r = await request(app.getHttpServer()).post('/traces/bulk').send([{ machine_id: 'm1', category: 'process_data' as any, key_data_point: 't1', value: 1 }, { machine_id: 'm1', category: 'process_data' as any, key_data_point: 't2', value: 2 }]).expect(201); expect(r.body).toHaveLength(2); });
  });
});
