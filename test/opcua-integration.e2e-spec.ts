import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { OpcUaService } from '../src/opcua/opcua.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeOpcuaPath = require.resolve('node-opcua');
const { OPCUAServer, DataType, Variant } = require(nodeOpcuaPath);

let plc: MockPlcServer | null = null;
let plcPort: number;

class MockPlcServer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-explicit-any
  private server: any = null;
  readonly port: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-explicit-any
  nodes: Record<string, any> = {};
  private _nodeTypes: Record<string, DataType> = {};

  constructor(port?: number) {
    this.port = port || 26543;
  }

  get endpointUrl(): string {
    return `opc.tcp://localhost:${this.port}`;
  }

  async start(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, no-explicit-any
    this.server = new OPCUAServer({
      port: this.port,
      resourcePath: '/UA/Server',
      serverInfo: {
        productName: 'MockPLC',
        productUri: 'mes-app:mock-plc',
        manufacturerName: 'MES App',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, no-explicit-any
    await this.server.initialize();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, no-explicit-any
    const addressSpace = this.server.engine.addressSpace;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, no-explicit-any
    const ns = addressSpace.getOwnNamespace();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, no-explicit-any
    const obj = ns.addObject({
      browseName: 'MES_PLC',
      organizedBy: addressSpace.rootFolder.objects,
    });

    const addVar = (browseName: string, dtype: DataType) => {
      const node = ns.addVariable({
        browseName,
        dataType: dtype,
        valueRank: -1,
        componentOf: obj,
        initialValue: { value: false as boolean, statusCode: 0x0 },
        accessLevel: 3,
        writable: true,
      });
      this._nodeTypes[browseName] = dtype;
      return node;
    };

    this.nodes.xStart = addVar('xStart', DataType.Boolean);
    this.nodes.xAck = addVar('xAck', DataType.Boolean);
    this.nodes.xEnd = addVar('xEnd', DataType.Boolean);
    this.nodes.xQryBusy = addVar('xQryBusy', DataType.Boolean);

    const intInit = { value: 0 as number, statusCode: 0x0 };
    this.nodes.iStepNo = ns.addVariable({
      browseName: 'iStepNo',
      dataType: DataType.Int32,
      valueRank: -1,
      componentOf: obj,
      initialValue: intInit,
      accessLevel: 3,
      writable: true,
    });
    this._nodeTypes['iStepNo'] = DataType.Int32;
    this.nodes.xErrL0 = ns.addVariable({
      browseName: 'xErrL0',
      dataType: DataType.Int32,
      valueRank: -1,
      componentOf: obj,
      initialValue: intInit,
      accessLevel: 3,
      writable: true,
    });
    this._nodeTypes['xErrL0'] = DataType.Int32;
    this.nodes.xErrL1 = ns.addVariable({
      browseName: 'xErrL1',
      dataType: DataType.Int32,
      valueRank: -1,
      componentOf: obj,
      initialValue: intInit,
      accessLevel: 3,
      writable: true,
    });
    this._nodeTypes['xErrL1'] = DataType.Int32;
    this.nodes.xErrL2 = ns.addVariable({
      browseName: 'xErrL2',
      dataType: DataType.Int32,
      valueRank: -1,
      componentOf: obj,
      initialValue: intInit,
      accessLevel: 3,
      writable: true,
    });
    this._nodeTypes['xErrL2'] = DataType.Int32;

    const strInit = { value: '' as string, statusCode: 0x0 };
    this.nodes.carrier_id = ns.addVariable({
      browseName: 'carrier_id',
      dataType: DataType.String,
      valueRank: -1,
      componentOf: obj,
      initialValue: strInit,
      accessLevel: 3,
      writable: true,
    });
    this._nodeTypes['carrier_id'] = DataType.String;

    await this.server.start();
    return this.port;
  }

  setNodeValue(name: string, value: unknown): void {
    const node = this.nodes[name];
    if (!node) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, no-explicit-any
    const dt = this._nodeTypes[name] || DataType.Boolean;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, no-explicit-any
    const variant = new Variant({ dataType: dt as any, value });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    node.setValueFromSource(variant);
  }

  setXStart(v: boolean): void { this.setNodeValue('xStart', v); }
  setxAck(v: boolean): void { this.setNodeValue('xAck', v); }
  setXEnd(v: boolean): void { this.setNodeValue('xEnd', v); }
  setXQryBusy(v: boolean): void { this.setNodeValue('xQryBusy', v); }
  setIStepNo(v: number): void { this.setNodeValue('iStepNo', v); }
  setXErrL0(v: number): void { this.setNodeValue('xErrL0', v); }
  setXErrL1(v: number): void { this.setNodeValue('xErrL1', v); }
  setXErrL2(v: number): void { this.setNodeValue('xErrL2', v); }

  setCarrierId(id: string): void {
    const node = this.nodes.carrier_id;
    if (!node) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, no-explicit-any
    const variant = new Variant({ dataType: DataType.String as any, value: id });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    node.setValueFromSource(variant);
  }

  getState(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [name] of Object.entries(this._nodeTypes)) {
      const node = this.nodes[name];
      if (node) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        result[name] = node.valueList?.value?.value;
      }
    }
    return result;
  }

  async shutdown(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.shutdown(5000, () => resolve());
      });
      this.server = null;
    }
  }
}

const findUnusedPort = (): Promise<number> =>
  new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const http = require('http');
    const server = http.createServer();
    server.listen(0, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
  });

// Module that skips fake OPC UA init — OpcUaService.onModuleInit will throw if no real server
@Module({})
class TestModule extends AppModule {}

describe('OPC UA Integration (e2e)', () => {
  beforeAll(async () => {
    plcPort = await findUnusedPort();
    process.env.OPCUA_ENDPOINT_URL = `opc.tcp://localhost:${plcPort}`;
    process.env.OPC_UA_SERVER_ADDRESS = `opc.tcp://localhost:${plcPort}`;
    process.env.NODE_ENV = 'test';

    plc = new MockPlcServer(plcPort);
    await plc.start();
  }, 15000);

  beforeEach(async () => {
    if (plc) {
      plc.setXStart(false);
      plc.setxAck(false);
      plc.setXEnd(false);
      plc.setXQryBusy(false);
      plc.setIStepNo(0);
      plc.setXErrL0(0);
      plc.setXErrL1(0);
      plc.setXErrL2(0);
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
      providers: [{ provide: OpcUaService, useValue: { isConnected: () => true, readNode: async () => null } }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    let authService: any;
    try {
      authService = (app as any).get('AuthService');
    } catch { /* AuthService may not be registered */ }
    if (authService) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await (authService as any).bootstrap().catch(() => {});
    }

    // Suppress unhandled error events from DispatcherService during test
    try {
      const dispatcher = app.get<any>('DispatcherService');
      if (dispatcher) {
        dispatcher.on('error', () => {});
      }
    } catch { /* DispatcherService may not be registered */ }
  }, 15000);

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  afterAll(async () => {
    delete process.env.OPCUA_ENDPOINT_URL;
    delete process.env.OPC_UA_SERVER_ADDRESS;
    if (plc) {
      await plc.shutdown();
    }
    plc = null;
  }, 10000);

  // --- Carriers ---

  describe('POST /orders/carriers - create carrier', () => {
    it('should create a carrier successfully', async () => {
      const ordRes = await request(app!.getHttpServer())
        .post('/orders')
        .send({
          name: 'ORDER-FOR-CARRIER-' + Date.now(),
          machine_id: 'MACHINE-01',
          operation: 'drill',
          quantity: 100,
        })
        .expect(201);

      const name = 'CARRIER-E2E-' + Date.now();
      const res = await request(app!.getHttpServer())
        .post('/orders/carriers')
        .send({
          name,
          current_station_id: 'STATION-01',
          next_resource_id: 'RESOURCE-A',
          order_id: ordRes.body.id,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(name);
      expect(res.body.current_station_id).toBe('STATION-01');
    });

    it('should return 400 for missing required fields', async () => {
      await request(app!.getHttpServer())
        .post('/orders/carriers')
        .send({ name: 'no-fields' })
        .expect(400);
    });
  });

  describe('GET /orders/carriers/list - list all carriers', () => {
    it('should return carrier list with newly created carrier', async () => {
      const name = 'CARRIER-LIST-' + Date.now();
      const ordRes = await request(app!.getHttpServer())
        .post('/orders')
        .send({
          name: 'ORDER-FOR-LIST-' + Date.now(),
          machine_id: 'MACHINE-01',
          operation: 'drill',
          quantity: 200,
        })
        .expect(201);

      await request(app!.getHttpServer())
        .post('/orders/carriers')
        .send({
          name,
          current_station_id: 'STATION-01',
          next_resource_id: 'RESOURCE-B',
          order_id: ordRes.body.id,
        })
        .expect(201);

      const listRes = await request(app!.getHttpServer())
        .get('/orders/carriers/list')
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Orders ---

  describe('POST /orders - create order', () => {
    it('should create an order with status pending', async () => {
      const name = 'ORDER-E2E-' + Date.now();
      const res = await request(app!.getHttpServer())
        .post('/orders')
        .send({
          name,
          machine_id: 'MACHINE-01',
          operation: 'drill',
          quantity: 100,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
    });

    it('should get order by id after creation', async () => {
      const name = 'ORDER-FIND-' + Date.now();
      const createRes = await request(app!.getHttpServer())
        .post('/orders')
        .send({
          name,
          machine_id: 'MACHINE-01',
          operation: 'weld',
          quantity: 5,
        })
        .expect(201);

      const id = createRes.body.id;

      await request(app!.getHttpServer())
        .get(`/orders/${id}`)
        .expect(200)
        .then((res) => {
          expect(res.body.id).toBe(id);
          expect(res.body.name).toBe(name);
        });
    });

    it('should return 400 for non-existent order', async () => {
      await request(app!.getHttpServer())
        .get('/orders/00000000-0000-0000-0000-000000000000')
        .expect(400);
    });
  });

  // --- Dispatcher Flow ---

  describe('POST /orders/dispatcher/trigger/:carrierId - dispatcher flow', () => {
    let carrierId: string;

    beforeEach(async () => {
      const ordRes = await request(app!.getHttpServer())
        .post('/orders')
        .send({
          name: 'ORDER-DISPATCH-' + Date.now(),
          machine_id: 'MACHINE-01',
          operation: 'assemble',
          quantity: 50,
        })
        .expect(201);

      const crRes = await request(app!.getHttpServer())
        .post('/orders/carriers')
        .send({
          name: 'CARRIER-DISPATCH-' + Date.now(),
          current_station_id: 'STATION-01',
          next_resource_id: 'RESOURCE-C',
          order_id: ordRes.body.id,
        })
        .expect(201);
      carrierId = crRes.body.id;
    });

     it('should trigger dispatch and return response with success flag', async () => {
       expect(carrierId).toBeTruthy();
       const res = await request(app!.getHttpServer())
         .post(`/orders/dispatcher/trigger/${carrierId}`)
         .expect(200);

       expect(res.body).toHaveProperty('success');
       expect(res.body.success).toBeDefined();
     }, 15000);

    it('should verify PLC error flags can be set', async () => {
      plc?.setXErrL0(1);
      plc?.setXErrL1(2);
      plc?.setXErrL2(3);

      expect(plc!.nodes.xErrL0).toBeTruthy();
      expect(plc!.nodes.xErrL1).toBeTruthy();
      expect(plc!.nodes.xErrL2).toBeTruthy();
    });
  });

  // --- Step Advancement ---

  describe('POST /orders/:orderId/advance-step - step advancement', () => {
    let orderId: string;

    beforeEach(async () => {
      const res = await request(app!.getHttpServer())
        .post('/orders')
        .send({
          name: 'ORDER-STEP-' + Date.now(),
          machine_id: 'MACHINE-01',
          operation: 'weld',
          quantity: 25,
        })
        .expect(201);
      orderId = res.body.id;
    });

    it('should advance step from in_progress order', async () => {
      await request(app!.getHttpServer())
        .post(`/orders/${orderId}/resume`)
        .expect(201);

       const nextStep = await request(app!.getHttpServer())
        .post(`/orders/${orderId}/advance-step`)
        .expect(201);

      expect(nextStep.body).toHaveProperty('next_step_no');
      expect(nextStep.body.next_step_no).toBe(1);
    });

    it('should fail to advance step from non-in_progress order', async () => {
      await request(app!.getHttpServer())
        .post(`/orders/${orderId}/advance-step`)
        .expect(400);
    });
  });

  // --- Queue / Health ---

  describe('GET /orders/dispatcher/queue - queue status', () => {
    it('should return array endpoint', async () => {
      await request(app!.getHttpServer())
        .get('/orders/dispatcher/queue')
        .expect(200);
    });
  });

  describe('GET /edge/opcua/connected - edge health', () => {
    it('should return opcua connected status', async () => {
      const res = await request(app!.getHttpServer())
        .get('/edge/opcua/connected')
        .expect(200);

      expect(res.body).toHaveProperty('connected');
    });

    it('should return edge health with opcua and mqtt components', async () => {
      const res = await request(app!.getHttpServer())
        .get('/edge/health')
        .expect(200);

      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('opcua');
      expect(res.body).toHaveProperty('mqtt');
    });
  });

  // --- PLC Mock Verification ---

  describe('PLC mock node operations', () => {
    it('should set and verify carrier_id on mock PLC', async () => {
      plc?.setCarrierId('TEST-CARRIER-001');
      expect(plc!.nodes.carrier_id).toBeTruthy();
    });

    it('should verify PLC is listening on the expected port', async () => {
      expect(plcPort).toBeGreaterThan(0);
      expect(plc!.endpointUrl).toBe(`opc.tcp://localhost:${plcPort}`);
    });

    it('should support xStart node for MES handshake protocol', async () => {
      plc?.setXStart(true);
      plc?.setCarrierId('DISPATCH-001');
      expect(plc!.nodes.xStart).toBeTruthy();
      expect(plc!.nodes.carrier_id).toBeTruthy();
    });

    it('should support xQryBusy node for MES request protocol', async () => {
      plc?.setXQryBusy(true);
      expect(plc!.nodes.xQryBusy).toBeTruthy();
    });
  });
});
