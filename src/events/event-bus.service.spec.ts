import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from './event-bus.service';
import { Logger } from '@nestjs/common';

describe('EventBusService', () => {
  let service: EventBusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        { provide: Logger, useValue: {} },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('subscribe / emit', () => {
    it('should call subscriber callback when event is emitted', async () => {
      const cb = jest.fn();
      service.subscribe('test-topic', cb);
      service.emit('test-topic', { data: 'value' });
      expect(cb).toHaveBeenCalledWith({ data: 'value' });
    });

    it('should return unsubscribe function', () => {
      const cb = jest.fn();
      const unsub = service.subscribe('topic1', cb);
      unsub!();
      service.emit('topic1', {});
      expect(cb).toHaveBeenCalledTimes(0);
    });

    it('should handle multiple subscribers for same topic', async () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      service.subscribe('topic2', cb1);
      service.subscribe('topic2', cb2);
      service.emit('topic2', 'ping');
      expect(cb1).toHaveBeenCalledWith('ping');
      expect(cb2).toHaveBeenCalledWith('ping');
    });

    it('should not affect other topics when unsubscribed', async () => {
      const topic1cb = jest.fn();
      const topic2cb = jest.fn();
      service.subscribe('topic1', topic1cb);
      service.subscribe('topic2', topic2cb);
      const unsub = service.subscribe('topic1', jest.fn());
      unsub!();
      service.emit('topic1', 'test');
      expect(topic2cb).not.toHaveBeenCalled();
    });
  });

  describe('emitBulk', () => {
    it('should emit to multiple topics', async () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      service.subscribe('t1', cb1);
      service.subscribe('t2', cb2);
      const topics = new Map<string, any>([['t1', 'val1'], ['t2', 'val2']]);
      service.emitBulk(topics);
      expect(cb1).toHaveBeenCalledWith('val1');
      expect(cb2).toHaveBeenCalledWith('val2');
    });
  });
});
