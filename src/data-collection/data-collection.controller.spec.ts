import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { DataCollectionController } from './data-collection.controller';
import { DataCollectionService } from './data-collection.service';
import { TimescaleBenchmarkService } from './timescale-benchmark.service';

describe('DataCollectionController', () => {
  let app: INestApplication;
  let mockDcService: any;
  let mockBenchService: any;

  beforeEach(async () => {
    mockDcService = {
      create: jest.fn().mockResolvedValue({ id: 'dp1', machine_id: 'm1', value: 42.5 }),
      getLatestByMachine: jest.fn().mockResolvedValue([{ id: 'dp1', value: 42.5 }]),
      getStatsByMachine: jest.fn().mockResolvedValue({ avg: 40, min: 30, max: 50 }),
      bulkCreate: jest.fn().mockResolvedValue([{ id: 'dp1' }, { id: 'dp2' }]),
    };

    mockBenchService = {
      runBenchmarks: jest.fn().mockResolvedValue({ throughput: 1000, latency: 5 }),
      getHypertableMetadata: jest.fn().mockResolvedValue({ hypertables: [], chunks: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataCollectionController],
      providers: [
        { provide: DataCollectionService, useValue: mockDcService },
        { provide: TimescaleBenchmarkService, useValue: mockBenchService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  describe('POST /data-collection', () => {
    it('should create a data point', async () => { const r = await request(app.getHttpServer()).post('/data-collection').send({ machine_id: 'm1', node_id: 'n1', value: 42.5 }).expect(201); expect(r.body.machine_id).toBe('m1'); });
  });

  describe('GET /data-collection/:machineId', () => {
    it('should return latest by machine', async () => { const r = await request(app.getHttpServer()).get('/data-collection/m1').expect(200); expect(r.body).toHaveLength(1); });
    it('should accept nodeId query param', async () => { const r = await request(app.getHttpServer()).get('/data-collection/m1?node_id=n1'); expect(r.status).toBe(200); });
  });

  describe('GET /data-collection/stats/:machineId', () => {
    it('should return stats', async () => { const r = await request(app.getHttpServer()).get('/data-collection/stats/m1').expect(200); expect(r.body.avg).toBe(40); });
  });

  describe('POST /data-collection/bulk', () => {
    it('should bulk create', async () => { const r = await request(app.getHttpServer()).post('/data-collection/bulk').send([{ machine_id: 'm1', node_id: 'n1', value: 10 }, { machine_id: 'm1', node_id: 'n1', value: 20}]).expect(201); expect(r.body).toHaveLength(2); });
  });

  describe('GET /data-collection/benchmark', () => {
    it('should run benchmark', async () => { const r = await request(app.getHttpServer()).get('/data-collection/benchmark').expect(200); expect(r.body).toBeDefined(); });
  });

  describe('GET /data-collection/hypertable-info', () => {
    it('should return hypertable info', async () => { const r = await request(app.getHttpServer()).get('/data-collection/hypertable-info').expect(200); expect(r.body).toBeDefined(); });
  });
});
