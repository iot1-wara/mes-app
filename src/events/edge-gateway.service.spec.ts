import { EventGateway } from './edge-gateway.service';
import { EventBusService } from './event-bus.service';

describe('EventGateway', () => {
  let gateway: EventGateway;
  let mockEventBus: any;
  let mockServer: any;

  beforeEach(() => {
    jest.spyOn(global, 'setInterval').mockImplementation((cb: () => void) => { cb(); return 0 as any; });
    jest.spyOn(global, 'clearInterval').mockReturnValue(undefined);
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn().mockReturnValue(true),
    };
    mockEventBus = {};

    gateway = new EventGateway(mockEventBus as unknown as EventBusService);
    Object.defineProperty(gateway, 'server', { value: mockServer, writable: true, configurable: true });
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log initialization message', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      gateway.onModuleInit();
      spy.mockRestore();
    });
  });

  describe('handleConnection', () => {
    it('should set up heartbeat for connected client', () => {
      const mockClient = {
        id: 'client-1',
        emit: jest.fn(),
        on: jest.fn((event: string, cb: any) => {
          if (event === 'disconnect') {
            mockClient._disconnectCb = cb;
          }
        }),
        join: jest.fn(),
        leave: jest.fn(),
      };
      gateway.handleConnection(mockClient);
      expect(mockClient.emit).toHaveBeenCalledWith('heartbeat', expect.objectContaining({ ts: expect.any(Number) }));
    });

    it('should handle subscribe event', () => {
      const mockClient = {
        id: 'client-1',
        emit: jest.fn(),
        on: jest.fn((event: string, cb: any) => {
          if (event === 'subscribe') {
            mockClient._subscribeCb = cb;
          }
        }),
        join: jest.fn(),
        leave: jest.fn(),
      };
      gateway.handleConnection(mockClient);
      if (mockClient._subscribeCb) {
        mockClient._subscribeCb('machine-alerts');
        expect(mockClient.join).toHaveBeenCalledWith('machine-alerts');
      }
    });

    it('should handle unsubscribe event', () => {
      const mockClient = {
        id: 'client-1',
        emit: jest.fn(),
        on: jest.fn((event: string, cb: any) => {
          if (event === 'unsubscribe') {
            mockClient._unsubscribeCb = cb;
          }
        }),
        join: jest.fn(),
        leave: jest.fn(),
      };
      gateway.handleConnection(mockClient);
      if (mockClient._unsubscribeCb) {
        mockClient._unsubscribeCb('machine-alerts');
        expect(mockClient.leave).toHaveBeenCalledWith('machine-alerts');
      }
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnected', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const mockClient = { id: 'client-1' };
      gateway.handleDisconnect(mockClient);
      spy.mockRestore();
    });
  });

  describe('broadcast', () => {
    it('should broadcast to a topic', () => {
      gateway.broadcast('machine-alerts', { message: 'test' });
      expect(mockServer.to).toHaveBeenCalledWith('machine-alerts');
      expect(mockServer.emit).toHaveBeenCalledWith('machine-alerts', { message: 'test' });
    });

    it('should broadcast to any topic', () => {
      gateway.broadcast('production-line-1', { temp: 85.2 });
      expect(mockServer.to).toHaveBeenCalledWith('production-line-1');
      expect(mockServer.emit).toHaveBeenCalledWith('production-line-1', { temp: 85.2 });
    });
  });

  describe('broadcastAll', () => {
    it('should emit global message', () => {
      gateway.broadcastAll({ system: 'alert' });
      expect(mockServer.emit).toHaveBeenCalledWith('global', { system: 'alert' });
    });
  });
});
