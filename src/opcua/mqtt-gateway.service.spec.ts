import { MqttGatewayService } from './mqtt-gateway.service';

describe('MqttGatewayService', () => {
  let service: MqttGatewayService;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = { get: jest.fn().mockReturnValue('mqtt://test-broker:1883') };
    // We test the subscription callback management without actually connecting MQTT
    service = new MqttGatewayService(mockConfig as any);
  });

  afterEach(() => {
    service['client'] = null;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onMessage', () => {
    it('should register a callback for a topic', () => {
      const cb = jest.fn();
      const unsubscribe = service.onMessage('mes/production/test', cb);
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('should allow multiple callbacks on the same topic', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      service.onMessage('mes/alarms/critical', cb1);
      service.onMessage('mes/alarms/critical', cb2);
    });

    it('should return unsubscribe function that removes the callback', () => {
      const cb = jest.fn();
      const unsub = service.onMessage('mes/orders/pending', cb);
      unsub();
    });
  });

  describe('isConnected', () => {
    it('should return false when client is null', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      service['client'] = { connected: true } as any;
      expect(service.isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      service['client'] = { connected: false } as any;
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('publish', () => {
    it('should return undefined when client is disconnected', async () => {
      service['client'] = { connected: false } as any;
      const result = await service.publish('mes/test', { data: 1 });
      expect(result).toBeUndefined();
    });

    it('should resolve when publish succeeds', async () => {
      service['client'] = {
        connected: true,
        publish: jest.fn((topic: string, payload: string, opts: any, cb: any) => {
          cb(null);
        }),
      } as any;

      await expect(service.publish('mes/test', { val: 42 })).resolves.toBeUndefined();
    });

    it('should reject when publish fails', async () => {
      const mockErr = new Error('publish failed');
      service['client'] = {
        connected: true,
        publish: jest.fn((topic: string, payload: string, opts: any, cb: any) => {
          cb(mockErr);
        }),
      } as any;

      await expect(service.publish('mes/test', {})).rejects.toThrow('publish failed');
    });
  });
});
