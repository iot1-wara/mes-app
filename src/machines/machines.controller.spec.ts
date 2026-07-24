import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';
import { MachineErrorsService } from '../orders/machine-errors.service';

describe('MachinesController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const now = new Date();
    const mockMachinesService = {
      create: jest.fn().mockResolvedValue({ id: 'm1', name: 'CNC-01', status: 'online' as any, location: 'floor-a', created_at: now }),
      findAll: jest.fn().mockResolvedValue([{ id: 'm1', name: 'CNC-01' }]),
      findOne: jest.fn().mockResolvedValue({ id: 'm1', name: 'CNC-01', status: 'online' as any }),
      update: jest.fn().mockResolvedValue({ id: 'm1', status: 'offline' as any }),
      remove: jest.fn().mockResolvedValue(undefined),
      updateHeartbeat: jest.fn().mockResolvedValue({ id: 'm1', last_heartbeat: now }),
      findOnline: jest.fn().mockResolvedValue([{ id: 'm1', name: 'Online-CNC' }]),
      findByLocation: jest.fn().mockResolvedValue([{ id: 'm1', location: 'floor-a' }]),
      importCsv: jest.fn().mockResolvedValue({ imported: 2, errors: [] }),
      getCsvTemplate: jest.fn().mockReturnValue('name,status,type\r\nA,online,\r\n'),
    };

    const mockMachineErrorsService = {
      getParetoStats: jest.fn().mockResolvedValue([
        { machine_id: 'm1', error_count: 5 },
        { machine_id: 'm2', error_count: 3 },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachinesController],
      providers: [
        { provide: MachinesService, useValue: mockMachinesService },
        { provide: MachineErrorsService, useValue: mockMachineErrorsService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  describe('POST /machines', () => {
    it('should create a machine', async () => { const r = await request(app.getHttpServer()).post('/machines').send({ name: 'CNC-01', status: 'online' as any, location: 'floor-a' }).expect(201); expect(r.body.name).toBe('CNC-01'); });
  });

  describe('GET /machines', () => {
    it('should return all machines', async () => { const r = await request(app.getHttpServer()).get('/machines').expect(200); expect(r.body).toHaveLength(1); });
  });

  describe('GET /machines/online', () => {
    it('should return online machines', async () => { const r = await request(app.getHttpServer()).get('/machines/online').expect(200); expect(r.body).toHaveLength(1); });
  });

  describe('GET /machines/:id', () => {
    it('should return one machine', async () => { const r = await request(app.getHttpServer()).get('/machines/m1').expect(200); expect(r.body.name).toBe('CNC-01'); });
  });

  describe('PATCH /machines/:id', () => {
    it('should update a machine', async () => { const r = await request(app.getHttpServer()).patch('/machines/m1').send({ status: 'offline' as any }).expect(200); expect(r.body.status).toBe('offline'); });
  });

  describe('DELETE /machines/:id', () => {
    it('should delete a machine', async () => { await request(app.getHttpServer()).delete('/machines/m1').expect(200); });
  });

  describe('PATCH /machines/:id/heartbeat', () => {
    it('should update heartbeat', async () => { const r = await request(app.getHttpServer()).patch('/machines/m1/heartbeat').expect(200); expect(r.body.last_heartbeat).toBeDefined(); });
  });

  describe('GET /machines/location/:location', () => {
    it('should return machines by location', async () => { const r = await request(app.getHttpServer()).get('/machines/location/floor-a').expect(200); expect(r.body).toHaveLength(1); });
  });

  describe('POST /machines/import/csv', () => {
    it('should import CSV machines', async () => { const r = await request(app.getHttpServer()).post('/machines/import/csv').attach('file', Buffer.from('name,status\r\nA,online\r\n'), 'machines.csv').expect(201); expect(r.body.imported).toBe(2); });
  });

  describe('GET /machines/export/csv', () => {
    it('should download CSV template', async () => { const r = await request(app.getHttpServer()).get('/machines/export/csv').expect(200); expect(r.text).toContain('name,status'); });
  });

  describe('GET /machines/errors/pareto', () => {
    it('should return pareto error stats', async () => { const r = await request(app.getHttpServer()).get('/machines/errors/pareto').expect(200); expect(r.body).toHaveLength(2); });
  });
});
