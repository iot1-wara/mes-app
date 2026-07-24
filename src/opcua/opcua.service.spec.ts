import { Test, TestingModule } from '@nestjs/testing';
import { OpcUaService } from './opcua.service';
import { ConfigService } from '@nestjs/config';
import * as nodeOpcua from 'node-opcua';

jest.mock('node-opcua', () => ({
  OPCUAClient: jest.fn().mockImplementation(() => ({
    server: { discoveryInfo: { productName: 'test-server' } },
  })),
  resolveNodeId: jest.fn((id) => id),
}));

describe('OpcUaService', () => {
  let service: OpcUaService;

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn((key: string, fallback?: string) => fallback),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpcUaService,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<OpcUaService>(OpcUaService);
    (service as any).connected = true;
    (service as any).client = { server: { discoveryInfo: { productName: 'test-server' } } };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isConnected', () => {
    it('should return true after successful init', () => {
      expect(service.isConnected()).toBe(true);
    });
  });

  describe('getServerStatus', () => {
    it('should return server discovery info when connected', async () => {
      const status = await service.getServerStatus();
      expect(status).toHaveProperty('productName');
    });

    it('should return null when client is null', async () => {
      (service as any).client = null;
      const result = await service.getServerStatus();
      expect(result).toBeNull();
    });
  });

  describe('readNode', () => {
    it('should throw if not connected', async () => {
      (service as any).session = null;
      await expect(service.readNode('ns=1;s=node1')).rejects.toThrow('OPC UA not connected');
    });

    it('should read node value when connected', async () => {
      const mockSession = {
        readDataValue: jest.fn().mockResolvedValue({ value: { value: 42 } }),
      };
      (service as any).session = mockSession;
      const result = await service.readNode('ns=1;s=node1');
      expect(result).toBe(42);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close client and destroy session without throwing', () => {
      (service as any).session = { destroy: jest.fn().mockResolvedValue(undefined) };
      (service as any).client = { close: jest.fn().mockResolvedValue(undefined) };
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
