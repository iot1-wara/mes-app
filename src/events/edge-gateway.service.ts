import { Logger } from '@nestjs/common';
import type { Server as WSServer } from 'ws';

type Socket = import('ws').WebSocket;

let wsServer: WSServer | null = null;
const clients = new Map<string, { socket: Socket; topics: Set<string> }>();
const logger = new Logger('EventGateway');

export class EventGateway {
  static instance: EventGateway;

  static listen(server: import('http').Server) {
    if (wsServer) return;
    wsServer = new (require('ws').Server)({ server, path: '/api/edge/ws' });

    wsServer.on('connection', (socket: Socket) => {
      const id = Buffer.from(Math.random().toString(36).slice(2)).toString('hex');
      clients.set(id, { socket, topics: new Set() });
      logger.log(`Client connected: ${id}`);

      // Heartbeat per client
      (socket as any).isAlive = true;
      socket.on('pong', () => { (socket as any).isAlive = true; });

      socket.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());
          const entry = clients.get(id);
          if (!entry) return;
          if (msg.type === 'subscribe' && msg.topic) {
            entry.topics.add(msg.topic);
            logger.debug(`Client ${id} subscribed to ${msg.topic}`);
          }
          if (msg.type === 'unsubscribe' && msg.topic) {
            entry.topics.delete(msg.topic);
            logger.debug(`Client ${id} unsubscribed from ${msg.topic}`);
          }
        } catch {
          logger.warn(`Invalid message: ${raw.toString().slice(0, 100)}`);
        }
      });

      socket.on('close', () => {
        clients.delete(id);
        logger.log(`Client disconnected: ${id}`);
      });
    });

    // Heartbeat broadcast every 30s
    setInterval(() => {
      const heartbeat = JSON.stringify({ type: 'heartbeat', ts: Date.now() });
      for (const [cid, entry] of clients) {
        if (!(entry.socket as any).isAlive) {
          entry.socket.terminate();
          clients.delete(cid);
          continue;
        }
        (entry.socket as any).isAlive = false;
        entry.socket.ping();
        try {
          if (entry.socket.readyState === 1) {
            entry.socket.send(heartbeat);
          }
        } catch {}
      }
    }, 30000);

    logger.log('Edge WebSocket Gateway initialized');
  }

  broadcast(topic: string, data: any) {
    const payload = JSON.stringify({ type: topic, ...data });
    for (const [id, entry] of clients) {
      if (entry.socket.readyState === 1) {
        let hasTopic = false;
        if (entry.topics.size === 0) {
          hasTopic = true;
        } else {
          for (const t of entry.topics) {
            if (t === topic || topic.startsWith(t + '/') || topic.startsWith(t)) {
              hasTopic = true;
              break;
            }
          }
        }
        if (hasTopic) {
          try { entry.socket.send(payload); } catch {}
        }
      }
    }
  }
  broadcastAll(data: any) {
    const payload = JSON.stringify({ type: 'global', ...data });
    for (const [, entry] of clients) {
      if (entry.socket.readyState === 1) {
        try { entry.socket.send(payload); } catch {}
      }
    }
  }

  getConnectedCount(): number {
    return clients.size;
  }
}
