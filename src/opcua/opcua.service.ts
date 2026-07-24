import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const nodeOpcua = require('node-opcua');

@Injectable()
export class OpcUaService implements OnModuleInit, OnModuleDestroy {
  private client: any;
  private session: any;
  private readonly logger = new Logger(OpcUaService.name);
  private connected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const address = this.configService.get('OPC_UA_SERVER_ADDRESS', 'opc.tcp://localhost:4840');
    try {
      const client = new nodeOpcua.OPCUAClient({});
      this.logger.log('OPC UA Client created. Waiting for server at ' + address);
      this.connected = true;
      this.client = client;
    } catch (e) {
      this.logger.warn('OPC UA initialization skipped (server not available): ' + (e as Error).message);
      this.connected = false;
      this.client = null;
    }
  }

  onModuleDestroy() {
    if (this.session) { this.session.destroy().catch(() => {}); }
    if (this.client && typeof this.client.disconnect === 'function') { this.client.disconnect().catch(() => {}); }
  }

  async readNode(nodeId: string): Promise<any> {
    if (!this.session) throw new Error('OPC UA not connected');
    const dataValue = await this.session.readDataValue(nodeOpcua.resolveNodeId(nodeId));
    return dataValue?.value?.value;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getServerStatus(): Promise<any> {
    if (!this.client) return null;
    return this.client.server ? this.client.server.discoveryInfo : null;
  }
}
