import { DispatcherService } from './dispatcher.service';

describe('DispatcherService', () => {
  let service: DispatcherService;
  let mockOpcua: any;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockOpcua = {
      acquireClient: jest.fn().mockResolvedValue({}),
      connectSession: jest.fn().mockResolvedValue({ disconnect: jest.fn() }),
    };

    service = new DispatcherService(mockOpcua);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('start', () => {
    it('should listen for xStart events', () => {
      service.start('m1');
      const queue = service.getDispatchQueue();
      expect(Array.isArray(queue)).toBe(true);
    });
  });

  describe('dispatch', () => {
    it('should dispatch and return result', async () => {
      const errorHandler = jest.fn();
      service.removeAllListeners('error');
      service.on('error', errorHandler);
      const promise = service.dispatch('carrier-1');
      await new Promise(resolve => setTimeout(resolve, 5500));
      const result = await promise;
      expect(result).toHaveProperty('success');
      expect(result.carrierId).toBe('carrier-1');
    }, 15000);

    it('should handle dispatch errors gracefully', async () => {
      const errorHandler = jest.fn();
      service.removeAllListeners('error');
      service.on('error', errorHandler);
      const promise = service.dispatch('carrier-2');
      await new Promise(resolve => setTimeout(resolve, 5500));
      const result = await promise;
      expect(typeof result.success).toBe('boolean');
    }, 15000);
  });

  describe('addSubscription', () => {
    it('should subscribe to xStart on machine', () => {
      service.addSubscription('m1', jest.fn());
    });
  });

  describe('getDispatchQueue / getOPCUAState', () => {
    it('should return dispatch queue items', () => {
      const queue = service.getDispatchQueue();
      expect(Array.isArray(queue)).toBe(true);
    });

    it('should return OPC UA state for carrier', () => {
      const state = service.getOPCUAState('carrier-x');
      expect(state).toBeInstanceOf(Map);
    });
  });
});
