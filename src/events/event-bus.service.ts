import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export interface SubscriberCallback {
  (data: any): void;
}

@Injectable()
export class EventBusService implements OnModuleInit {
  private subscribers = new Map<string, SubscriberCallback[]>();
  private readonly logger = new Logger(EventBusService.name);

  onModuleInit() {
    this.logger.log('EventBus initialized');
  }

  subscribe(topic: string, callback: SubscriberCallback): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    const cbs = this.subscribers.get(topic)!;
    cbs.push(callback);
    return () => {
      const found = this.subscribers.get(topic);
      if (found) this.subscribers.set(topic, found.filter(cb => cb !== callback));
    };
  }

  emit(topic: string, data: any) {
    const cbs = this.subscribers.get(topic);
    if (cbs) {
      for (const cb of cbs) {
        try { cb(data); } catch (err) { this.logger.error(`Error in event subscriber: ${err}`); }
      }
    }
  }

  emitBulk(topics: Map<string, any>) {
    for (const [topic, data] of topics) {
      this.emit(topic, data);
    }
  }
}
