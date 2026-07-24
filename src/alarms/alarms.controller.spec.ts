import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AlarmsController } from './alarms.controller';
import { AlarmsService } from './alarms.service';

describe('AlarmsController', () => {
  let app: INestApplication;
  let alarmsService: Partial<any>;

  beforeEach(async () => {
    const now = new Date();
    alarmsService = {
      create: jest.fn().mockResolvedValue({ id: '1', severity: 'critical' as any, message: 'test', machine_id: 'm1', acknowledged: false, created_at: now }),
      findAll: jest.fn().mockResolvedValue([{ id: '1', severity: 'warning' as any, message: 'warn', machine_id: 'm1' }]),
      findOne: jest.fn().mockResolvedValue({ id: '1', severity: 'info' as any, message: 'detail', machine_id: 'm2' }),
      update: jest.fn().mockResolvedValue({ id: '1', severity: 'error' as any, message: 'updated', acknowledged_at: now }),
      acknowledge: jest.fn().mockResolvedValue({ id: '1', acknowledged: true, acknowledged_at: now }),
      bulkAcknowledge: jest.fn().mockResolvedValue(3),
      exportCsv: jest.fn().mockResolvedValue('ID,Severity\r\n1,critical'),
      remove: jest.fn().mockResolvedValue(undefined),
      setActiveCount: jest.fn().mockResolvedValue(5),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlarmsController],
      providers: [{ provide: AlarmsService, useValue: alarmsService }],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  describe('POST /alarms', () => {
    it('should create an alarm', async () => {
      const res = await request(app.getHttpServer()).post('/alarms').send({ severity: 'critical', machine_id: 'm1', message: 'Test' }).expect(201);
      expect(res.body.id).toBe('1');
    });
  });

  describe('GET /alarms', () => {
    it('should return alarms', async () => { await request(app.getHttpServer()).get('/alarms').then((r: any) => expect(r.body).toHaveLength(1)); });
  });

  describe('GET /alarms/:id', () => {
    it('should return one alarm', async () => { const r = await request(app.getHttpServer()).get('/alarms/1'); expect(r.body.id).toBe('1'); });
  });

  describe('PATCH /alarms/:id', () => {
    it('should update an alarm', async () => { const r = await request(app.getHttpServer()).patch('/alarms/1').send({ severity: 'error' as any, message: 'updated' }); expect(r.body.acknowledged_at).toBeDefined(); });
  });

  describe('POST /alarms/:id/acknowledge', () => {
    it('should acknowledge an alarm', async () => { await request(app.getHttpServer()).post('/alarms/1/acknowledge').expect(200); expect(alarmsService.acknowledge).toHaveBeenCalledWith('1'); });
  });

  describe('POST /alarms/bulk-acknowledge', () => {
    it('should bulk acknowledge alarms', async () => { const r = await request(app.getHttpServer()).post('/alarms/bulk-acknowledge').send({ ids: ['1', '2'] }).expect(200); expect(r.body).toBeDefined(); });
  });

  describe('GET /alarms/export/csv', () => {
    it('should return CSV export', async () => { const r = await request(app.getHttpServer()).get('/alarms/export/csv'); expect(r.text).toContain('ID'); });
  });

  describe('DELETE /alarms/:id', () => {
    it('should delete an alarm', async () => { await request(app.getHttpServer()).delete('/alarms/1').expect(200); });
  });

  describe('GET /alarms/stats/active-count', () => {
    it('should return active count', async () => { const r = await request(app.getHttpServer()).get('/alarms/stats/active-count').expect(200); expect(r.body).toBeDefined(); });
  });
});
