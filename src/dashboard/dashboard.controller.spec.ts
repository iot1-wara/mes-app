import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let app: INestApplication;
  let mockDashboardService: any;

  beforeEach(async () => {
    mockDashboardService = {
      getOEE: jest.fn().mockResolvedValue({ availability: 85, performance: 90, quality: 95, overall: 73 }),
      getTrendData: jest.fn().mockResolvedValue([{ name: '14:00', throughput: 100 }]),
      getPareto: jest.fn().mockResolvedValue([{ name: 'Error1', value: 5 }]),
      getMachineStats: jest.fn().mockResolvedValue([{ id: 'm1', name: 'CNC-01' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: mockDashboardService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  describe('GET /dashboard/oee', () => {
    it('should return OEE data', async () => { const r = await request(app.getHttpServer()).get('/dashboard/oee').expect(200); expect(r.body.availability).toBe(85); expect(r.body.overall).toBe(73); });
    it('should accept machineId query param', async () => { const r = await request(app.getHttpServer()).get('/dashboard/oee?machineId=m1'); expect(r.status).toBe(200); });
  });

  describe('GET /dashboard/trend', () => {
    it('should return trend data', async () => { const r = await request(app.getHttpServer()).get('/dashboard/trend?range=24h').expect(200); expect(r.body).toHaveLength(1); });
  });

  describe('GET /dashboard/pareto', () => {
    it('should return pareto data', async () => { const r = await request(app.getHttpServer()).get('/dashboard/pareto').expect(200); expect(r.body).toHaveLength(1); });
  });

  describe('GET /dashboard/machines', () => {
    it('should return machine stats', async () => { const r = await request(app.getHttpServer()).get('/dashboard/machines').expect(200); expect(r.body).toHaveLength(1); });
  });
});
