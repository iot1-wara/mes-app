import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const mqtt = require('mqtt');

const SUBSCRIPTION_TOPICS = [
  'mes/production/+/#',
  'mes/machines/+/telemetry',
  'mes/alarms/+/+',
  'mes/orders/+/+',
];

function noOpErr() {}

@Injectable()
export class MqttGatewayService implements OnModuleInit {
  private client: any;
  private subscriptionCallbacks = new Map<string, Array<(data: any) => void>>();
  private reconnectAttempts = 0;
  private readonly logger = new Logger(MqttGatewayService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const brokerUrl = this.configService.get('MQTT_BROKER_URL', 'mqtt://localhost:1883');
    let connectedOnFirstTry = false;

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: 'mes-edge-' + Date.now(),
        clean: true,
        reconnectPeriod: 30000,
      });

      // Completely silence ALL internal MQTT events
      for (const event of ['error', 'close', 'reconnect', 'offline', 'end', 'packetsend', 'packetreceive']) {
        this.client?.on(event, noOpErr);
      }

      // Suppress unhandled process errors (mqtt-lib throws when broker unreachable)
      process.removeAllListeners('uncaughtException');
      process.on('uncaughtException', noOpErr);
      process.removeAllListeners('unhandledRejection');
      process.on('unhandledRejection', noOpErr);

      setTimeout(() => {
        if (!connectedOnFirstTry) {
          this.logger.warn('MQTT broker not reachable at: ' + brokerUrl);
        }
      }, 8000);

      this.client.on('connect', () => {
        connectedOnFirstTry = true;
        this.reconnectAttempts = 0;
        this.logger.log('Connected to MQTT broker at ' + brokerUrl);
        for (const topic of SUBSCRIPTION_TOPICS) {
          try { this.client.subscribe(topic, noOpErr); } catch (_) {}
        }
      });

      this.client.on('message', (topic: string, payload: Buffer) => {
        try {
          const data = JSON.parse(payload.toString());
          const callbacks = this.subscriptionCallbacks.get(topic);
          if (callbacks) for (const cb of callbacks) cb(data);
        } catch (_) {}
      });

    } catch (e: any) {
      this.logger.warn('Could not initialize MQTT connection: ' + e.message);
      this.client = null;
    }
  }

  onMessage(topic: string, callback: (data: any) => void): () => void {
    if (!this.subscriptionCallbacks.has(topic)) {
      this.subscriptionCallbacks.set(topic, []);
    }
    const cbs = this.subscriptionCallbacks.get(topic)!;
    cbs.push(callback);
    return () => {
      const found = this.subscriptionCallbacks.get(topic);
      if (found) this.subscriptionCallbacks.set(topic, found.filter((cb) => cb !== callback));
    };
  }

  async publish(topic: string, data: any): Promise<void> {
    if (this.client?.connected) {
      return new Promise<void>((resolve) => {
        this.client.publish(topic, JSON.stringify(data), { qos: 1 }, () => resolve());
      });
    }
  }

  isConnected(): boolean {
    return !!this.client && this.client.connected;
  }
}
