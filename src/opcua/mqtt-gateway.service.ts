import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';

const SUBSCRIPTION_TOPICS = [
  'mes/production/+/#',
  'mes/machines/+/telemetry',
  'mes/alarms/+/+',
  'mes/orders/+/+',
];

@Injectable()
export class MqttGatewayService implements OnModuleInit {
  private client: mqtt.MqttClient | null;
  private subscriptionCallbacks = new Map<string, Array<(data: any) => void>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
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

      this.client.on('error', (err) => {
        this.logger.error('MQTT client error: ' + err.message);
      });

      this.client.on('close', () => {
        this.logger.warn('MQTT connection closed');
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          this.logger.log(`Attempting MQTT reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        } else {
          this.logger.error('MQTT reconnection limit reached');
        }
      });

      this.client.on('offline', () => {
        this.logger.warn('MQTT client is offline');
      });

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
          const client = this.client;
          if (client) {
            client.subscribe(topic, (err) => {
              if (err) {
                this.logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
              }
            });
          }
        }
      });

      this.client.on('message', (topic: string, payload: Buffer) => {
        try {
          const data = JSON.parse(payload.toString());
          const callbacks = this.subscriptionCallbacks.get(topic);
          if (callbacks) for (const cb of callbacks) cb(data);
        } catch (err) {
          this.logger.error(`Failed to parse MQTT message on topic ${topic}: ${err}`);
        }
      });

    } catch (e: any) {
      this.logger.error('Could not initialize MQTT connection: ' + e.message);
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
    const client = this.client;
    if (client?.connected) {
      return new Promise<void>((resolve, reject) => {
        client.publish(topic, JSON.stringify(data), { qos: 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  isConnected(): boolean {
    return !!this.client && this.client.connected;
  }
}
