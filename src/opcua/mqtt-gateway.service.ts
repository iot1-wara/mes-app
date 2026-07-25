import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';
import { OrdersService } from '../orders/orders.service';
import { MachinesService } from '../machines/machines.service';
import { EventBusService } from '../events/event-bus.service';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const SUBSCRIPTION_TOPICS = [
  'i4.0/production/orders',
  'mes/production/+/#',
  'mes/machines/+/telemetry',
  'mes/alarms/+/+',
  'mes/orders/+/+',
];

interface MqttBrokerConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  connected: boolean;
}

@Injectable()
export class MqttGatewayService implements OnModuleInit {
  private client!: mqtt.MqttClient | null;
  private subscriptionCallbacks = new Map<string, Array<(data: any) => void>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private readonly logger = new Logger(MqttGatewayService.name);
  private currentStatus: MqttBrokerConfig = { brokerUrl: 'mqtt://localhost:1883', connected: false, username: undefined, password: undefined };

   constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly machinesService: MachinesService,
    private readonly eventBus: EventBusService,
  ) {}

  getMqttConfig(): MqttBrokerConfig {
    return { ...this.currentStatus };
  }

  async setMqttConfig(config: Partial<MqttBrokerConfig>): Promise<MqttBrokerConfig> {
    const oldConfig = this.getMqttConfig();
    this.currentStatus = { ...this.currentStatus, ...config };
    await this.saveMqttConfig();

    if (config.brokerUrl !== oldConfig.brokerUrl || config.username !== oldConfig.username || config.password !== oldConfig.password) {
      await this.disconnectFromBroker();
      await this.connectToBroker(config.brokerUrl, config.username, config.password);
    }
    
    return { ...this.currentStatus };
  }

  private saveMqttConfig() {
    const mqttConfigPath = process.env.MQTT_CONFIG_FILE || join(__dirname, '../../mqtt-broker.json');
    writeFileSync(mqttConfigPath, JSON.stringify(this.currentStatus, null, 2), 'utf-8');
  }

  private loadSavedMqttConfig(): Partial<MqttBrokerConfig> | null {
    try {
      const mqttConfigPath = process.env.MQTT_CONFIG_FILE || join(__dirname, '../../mqtt-broker.json');
      if (existsSync(mqttConfigPath)) {
        return JSON.parse(readFileSync(mqttConfigPath, 'utf-8'));
      }
    } catch {}
    return null;
  }

  async onModuleInit() {
    const savedConfig = this.loadSavedMqttConfig();
    if (savedConfig?.brokerUrl) {
      this.currentStatus.brokerUrl = savedConfig.brokerUrl;
      this.currentStatus.username = savedConfig.username;
      this.currentStatus.password = savedConfig.password;
    }
    const brokerUrl = this.configService.get('MQTT_BROKER_URL') || savedConfig?.brokerUrl || 'mqtt://localhost:1883';
    let connectedOnFirstTry = false;

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: 'mes-edge-' + Date.now(),
        clean: true,
        reconnectPeriod: 30000,
      });

      this.setupClientEvents(brokerUrl, connectedOnFirstTry ? true : false);
      
      setTimeout(() => {
        if (!connectedOnFirstTry) {
          this.logger.warn('MQTT broker not reachable at: ' + brokerUrl);
        }
      }, 8000);
    } catch (e: any) {
      this.logger.error('Could not initialize MQTT connection: ' + e.message);
      this.client = null;
    }
  }

  private setupClientEvents(brokerUrl: string, connectedOnFirstTry: boolean) {
    if (!this.client) return;

    this.client.on('error', (err) => {
      this.logger.error('MQTT client error: ' + err.message);
    });

    this.client.on('close', () => {
      this.currentStatus.connected = false;
      this.eventBus.broadcast('mqtt/status', { connected: false });
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

    this.client.on('connect', () => {
      this.reconnectAttempts = 0;
      this.currentStatus.connected = true;
      this.eventBus.broadcast('mqtt/status', { connected: true, brokerUrl: brokerUrl });
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

    this.client.on('message', async (topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString());
        const callbacks = this.subscriptionCallbacks.get(topic);
        if (callbacks) for (const cb of callbacks) cb(data);
        this.logger.log(`MQTT Message on ${topic}: ${JSON.stringify(data)}`);

        // Broadcast to EventBus so frontend MQTT Monitor can display the message
        this.eventBus.broadcast('mqtt/' + topic, { payload: data, timestamp: new Date().toISOString() });

        await this.handleMqttOrderMessage(topic, data);
      } catch (err) {
        this.logger.error(`Failed to parse MQTT message on topic ${topic}: ${err}`);
      }
    });
  }

  private async handleMqttOrderMessage(topic: string, data: any): Promise<void> {
    if (topic !== 'i4.0/production/orders') return;

    const bDeckelfarbe = String(data.bDeckelfarbe || data.deckelfarbe || 'grau');
    const uiKugelRot = Number(data.uiKugelRot) || Number(data.kugelRot) || 0;
    const uiKugelGruen = Number(data.uiKugelGruen) || Number(data.kugelGruen) || 0;
    const uiKugelBlau = Number(data.uiKugelBlau) || Number(data.kugelBlau) || 0;
    const totalQty = uiKugelRot + uiKugelGruen + uiKugelBlau;

    if (totalQty <= 0) {
      this.logger.warn(`[MQTT Order] Total qty is 0, skipping order creation for payload: ${JSON.stringify(data)}`);
      return;
    }

    try {
      const machines = await this.machinesService.findAll();
      const targetMachine = machines.find((m: any) => m.status === 'online') || (machines.length > 0 ? machines[0] : null);

      if (!targetMachine) {
        this.logger.warn('[MQTT Order] No machines available for auto-creation');
        return;
      }

      let operation = 'Webshop Auftrag - Kugeln setzen';
      const colorLower = bDeckelfarbe.toLowerCase();
      if (colorLower.includes('rot')) operation = 'Webshop Auftrag - Deckel rot + Kugeln setzen';
      else if (colorLower.includes('blau')) operation = 'Webshop Auftrag - Deckel blau + Kugeln setzen';
      else if (colorLower.includes('gün') || colorLower.includes('grü') || colorLower.includes('green')) operation = 'Webshop Auftrag - Deckel grün + Kugeln setzen';

      const orderName = `Webshop - Deckel ${bDeckelfarbe} (${totalQty}x Kugeln: R:${uiKugelRot}, G:${uiKugelGruen}, B:${uiKugelBlau})`;

      this.logger.log(`[MQTT Order] Creating new MES order from Webshop:\n  Name: ${orderName}\n  Machine: ${targetMachine.id} (${targetMachine.name})\n  Qty: ${totalQty}`);

      await this.ordersService.create({
        name: orderName,
        priority: 3,
        machine_id: targetMachine.id,
        operation,
        quantity: totalQty,
      });

      this.logger.log(`[MQTT Order] Successfully created MES order for Webshop request`);
    } catch (err) {
      this.logger.error(`[MQTT Order] Error creating order from ${topic}: ${(err as Error).message}`, (err as Error).stack);
    }
  }

  async connectToBroker(brokerUrl: string, username?: string, password?: string): Promise<boolean> {
    this.logger.log(`[Connect] brokerUrl=${brokerUrl}, user=${username || '(none)'}`);
    try {
      if (this.client) {
        this.client.end(false);
        this.client = null;
      }

      const options: mqtt.IClientOptions = {
        clientId: 'mes-edge-' + Date.now(),
        clean: true,
        reconnectPeriod: 30000,
        username: username || undefined,
        password: password || undefined,
      };

      this.client = mqtt.connect(brokerUrl, options);
      this.currentStatus = { brokerUrl, connected: false, username, password };
      await this.saveMqttConfig();

      this.setupClientEvents(brokerUrl, false);
      
      // Wait for connection to complete then broadcast status
      const waitForConnect = new Promise<boolean>(resolve => {
        const timeout = setTimeout(() => resolve(false), 10000);
        const checkConnected = setInterval(() => {
          if (this.currentStatus.connected) {
            clearTimeout(timeout);
            clearInterval(checkConnected);
            resolve(true);
          } else if (!this.client) {
            clearTimeout(timeout);
            clearInterval(checkConnected);
            resolve(false);
          }
        }, 250);
      });
      await waitForConnect;
      this.eventBus.broadcast('mqtt/status', { connected: this.currentStatus.connected, brokerUrl: this.currentStatus.brokerUrl });
      return true;
    } catch (e: any) {
      this.logger.error('Could not connect to MQTT broker: ' + e.message);
      this.currentStatus.connected = false;
      return false;
    }
  }

  async disconnectFromBroker(): Promise<void> {
    if (this.client) {
      this.client.end(false);
      this.client = null;
      this.currentStatus.connected = false;
      this.eventBus.broadcast('mqtt/status', { connected: false });
      this.logger.log('MQTT broker disconnected');
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

  getStatus() {
    return {
      connected: this.isConnected(),
      config: this.currentStatus,
    };
  }
}
