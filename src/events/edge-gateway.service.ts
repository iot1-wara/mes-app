import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventBusService } from './event-bus.service';

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/api/edge/ws',
})
export class EventGateway implements OnModuleInit {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(EventGateway.name);

  constructor(private readonly eventBus: EventBusService) {}

  onModuleInit() {
    this.logger.log('Edge WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    const heartbeatInterval = setInterval(() => {
      client.emit('heartbeat', { ts: Date.now() });
    }, 30000);

    client.on('disconnect', () => {
      clearInterval(heartbeatInterval);
      this.logger.log(`Client disconnected: ${client.id}`);
    });

    client.on('subscribe', (topic: string) => {
      client.join(topic);
      this.logger.debug(`Client ${client.id} subscribed to ${topic}`);
    });

    client.on('unsubscribe', (topic: string) => {
      client.leave(topic);
      this.logger.debug(`Client ${client.id} unsubscribed from ${topic}`);
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcast(topic: string, data: any) {
    this.server.to(topic).emit(topic, data);
  }

  broadcastAll(data: any) {
    this.server.emit('global', data);
  }
}
