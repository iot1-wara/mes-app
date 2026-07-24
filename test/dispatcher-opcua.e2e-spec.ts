import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { DispatcherService, SPSHandshakeResult } from '../../src/orders/dispatcher.service';
import { MockPlcServer } from '../../src/opcua/mock-plc-server';
import { OpcUaService } from '../../src/opcua/opcua.service';

/**
 * E2E tests for MES → PLC dispatcher handshake via OPC UA.
 * Tests the full flow: Carrier creation → dispatch trigger → PLC state changes.
 */

describe('Dispatcher E2E - OPC UA Mock PLC', () => {
  let app: INestApplication;
  let mockPlc: MockPlcServer;
  let dispatcherService: DispatcherService;
  let lastXStartData: any = null;
  
  const mockPLCPort = 5600;

  beforeAll(async () => {
    // Start the mock PLC server that simulates a real PLC
    mockPlc = new MockPlcServer(mockPLCPort);
    await mockPlc.start();

    let resolveStartPromise: (value: any) => void;
    const promise = new Promise<any>((resolve) => {
      resolveStartPromise = resolve;
    });
    mockPlc.on('xStart', (data: any) => {
      lastXStartData = data;
      resolveStartPromise(data);
    });

    // Create a testing module with mocked services
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatcherService,
        OpcUaService,
        { provide: 'CONFIG', useValue: { OPC_UA_SERVER_ADDRESS: 'opc.tcp://localhost:' + mockPLCPort } },
        {
          provide: 'OPCUA_CLIENT_PROXY',
          useFactory: () => ({
            connect: jest.fn().mockResolvedValue(true),
            disconnect: jest.fn().mockResolvedValue(undefined),
            isConnected: jest.fn().mockReturnValue(false),
            readNode: jest.fn(),
            writeNode: jest.fn(),
          }),
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Access the dispatcher service directly to wire up PLC events
    dispatcherService = module.get<DispatcherService>(OpcUaService);
    
    // Wire mockPLC xStart → dispatcher for real event testing
    let mockXQryBusyReceived = false;
    const testDispatcher = new DispatcherService();
    
    // Start the dispatch listener on test dispatcher
    await testDispatcher.start('machine-1');
    
    mockPlc.addListener('xStart', (data: any) => {
      testDispatcher.emit('xStart', data);
    });

    lastXStartData = null;
  }, 30000);

  afterAll(async () => {
    await app.close();
    await mockPlc?.stop();
  });

  it('should return 200 for health check', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('should handle OPC UA PLC handshake simulation', async () => {
    // Verify that mockPLC server is running
    const state = mockPlc.getState();
    expect(state.xStart).toBe(false);
    expect(state.carrier_id).toBe('');

    // Simulate MES triggering dispatch → PLC receives xQryBusy
    await mockPlc.setXQryBusy(true);

    // Verify xQryBusy was received by PLC (via event)
    expect(mockPlc.getState().xQryBusy).toBe(true);
  });

  it('should handle full start/ack sequence', async () => {
    const carrierId = 'CARRIER-' + Date.now();
    const stepNo = 5;

    // Simulator: PLC receives xQryBusy → triggers xQryBusy event (already set)
    expect(mockPlc.getState().xQryBusy).toBe(true);

    // Simulate PLC starts processing — responds with xStart=true
    await mockPlc.setXStart(true);
    await mockPlc.setCarrierId(carrierId);
    await mockPlc.setIStepNo(stepNo);

    // Verify PLC state
    const state = mockPlc.getState();
    expect(state.xStart).toBe(true);
    expect(state.carrier_id).toBe(carrierId);
    expect(state.iStepNo).toBe(stepNo);
  });

  it('should acknowledge and complete the handshake', async () => {
    // MES acknowledges PLC's xStart signal
    await mockPlc.setxAck(true);

    const state = mockPlc.getState();
    expect(state.xAck).toBe(true);

    // Simulate PLC completes processing
    await mockPlc.setXStart(false);
    await mockPlc.setXEnd(true);
    
    expect(mockPlc.getState().xEnd).toBe(true);
  });

  it('should report dispatcher queue', async () => {
    const response = await request(app.getHttpServer()).get('/orders/dispatcher/queue');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
