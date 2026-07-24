import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { EdgeController } from './edge.controller';
import { OpcUaService } from './opcua.service';
import { MqttGatewayService } from './mqtt-gateway.service';

describe('EdgeController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const mockOpcUa = {
      getServerStatus: jest.fn().mockResolvedValue({ status: 'running', version: '1.0' }),
      isConnected: jest.fn().mockReturnValue(true),
      readNode: jest.fn().mockResolvedValue({ value: 42 }),
    };
    const mockMqtt = {
      isConnected: jest.fn().mockReturnValue(false),
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EdgeController],
      providers: [
        { provide: OpcUaService, useValue: mockOpcUa },
        { provide: MqttGatewayService, useValue: mockMqtt },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  describe('GET /edge/opcua/status', () => {
    it('should return OPC UA server status', async () => { const r = await request(app.getHttpServer()).get('/edge/opcua/status'); expect(r.body.status).toBe('running'); });
  });

  describe('GET /edge/opcua/connected', () => {
    it('should return connected status', async () => { const r = await request(app.getHttpServer()).get('/edge/opcua/connected'); expect(r.body.connected).toBe(true); });
  });

  describe('POST /edge/opcua/read', () => {
    it('should read an OPC UA node', async () => { const r = await request(app.getHttpServer()).post('/edge/opcua/read').send({ nodeId: 'node-1' }); expect(r.body.value).toBe(42); });
  });

  describe('GET /edge/mqtt/connected', () => {
    it('should return MQTT connected status', async () => { const r = await request(app.getHttpServer()).get('/edge/mqtt/connected'); expect(r.body.connected).toBe(false); });
  });

  describe('POST /edge/mqtt/publish', () => {
    it('should publish to MQTT topic', async () => { const r = await request(app.getHttpServer()).post('/edge/mqtt/publish').send({ topic: 'mes/test', payload: { data: 1 } }); expect(r.body.published).toBe(true); });
  });

  describe('GET /edge/health', () => {
    it('should return health status', async () => { const r = await request(app.getHttpServer()).get('/edge/health'); expect(r.body.status).toBe('ok'); expect(r.body.opcua).toBe(true); expect(r.body.mqtt).toBe(false); });
    it('should include timestamp', async () => { const r = await request(app.getHttpServer()).get('/edge/health'); expect(new Date(r.body.timestamp)).toBeInstanceOf(Date); });
  });
});
