import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from 'typeorm';
import { CarrierEntity } from './carrier.entity';
import { OpcUaService } from '../opcua/opcua.service';
import { MqttGatewayService } from '../opcua/mqtt-gateway.service';

// BigInt-safe iCarrierID (dbProcessData Int(128)) <-> MES Carrier-ID Cast
const INT128_MAX = 340282366920938463463374607431768211455;

export function int128toString(value: number | bigint | string): string {
  if (value == null) return '';
  const num = typeof value === 'bigint' ? value.toString() : String(value);
  
  if (num.match(/^\d+$/)) {
    return `WERKST-${String(parseInt(num, 10)).padStart(3, '0')}`;
  }
  return num.toUpperCase().trim();
}

export function stringToInt128(carrierStr: string): bigint | null {
  if (!carrierStr) return null;
  const num = carrierStr.replace(/^WERKST[-_]/i, '');
  const parsed = parseInt(num, 10);
  if (isNaN(parsed) || parsed < 0) return null;
  return BigInt(parsed) % BigInt(INT128_MAX + 1);
}

// sMES Query-Felder aus stMesQuery (UDT 15) Interface
export interface SmesQueryFields {
  uiResourceId?: number;
  udiONo?: number | null;
  uiOPos?: number;
  uiOpNo?: number;
  uiCarrierId?: bigint | string;
  udiPNo?: string;
  xStart?: boolean;
  xQryBusy?: boolean;
  xDone?: boolean;
  xError?: boolean;
  xAuto?: boolean;
  xManual?: boolean;
  xBusy?: boolean;
  xReset?: boolean;
  uiStopperId?: number;
}

export interface SpsHandshakeAck {
  xStart: boolean;
  xAck: boolean;
  carrier_id?: string;
  iStepNo?: number;
}

// Result des Handshakes mit allen dbProcessData Feldern
export interface SpsDispatchResult {
  success: boolean;
  carrierId: string;
  iCarrierID: number | null;
  iStepNo: number;
  iResourceID: number | null;
  deckelfarbe?: string;
  iPar2?: number;
  iPar3?: number;
  iPar4?: number;
  lastProcessTimestamp?: Date | null;
  partNumber?: string;
  xErrL0?: number;
  xErrL1?: number;
  xErrL2?: number;
  handshakeDone: boolean;
  error?: string;
}

@Injectable()
export class SpsDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SpsDispatcherService.name);
  private subscriptions = new Map<string, () => void>();
  private dispatchQueue: Array<{ carrierId: string; iResourceID?: number; timestamp: number }> = [];
  private isProcessing = false;

  constructor(
    @InjectRepository(CarrierEntity)
    private readonly carriersRepo: Repository<CarrierEntity>,
    private readonly opcuaService: OpcUaService,
    private readonly mqttService: MqttGatewayService,
  ) {}

  onModuleInit() {
    this.logger.log('SPS Dispatcher initialized');
    
    const sub1 = this.mqttService.onMessage('mes/production/+/#', (data: any) => {
      this.handleProductionEvent('mes/production', data);
    });
    this.subscriptions.set('mes/production/#', sub1);
    
    return Promise.resolve();
  }

  onModuleDestroy() {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions.clear();
  }

  // === Primary dispatch entry point ===

  async dispatch(carrierId: string, iResourceID?: number): Promise<SpsDispatchResult> {
    if (this.isProcessing) {
      this.dispatchQueue.push({ carrierId, iResourceID, timestamp: Date.now() });
      return { 
        success: false, 
        carrierId, 
        iCarrierID: null, 
        iStepNo: 0, 
        iResourceID: null, 
        handshakeDone: false,
        error: 'Dispatcher already processing another carrier' 
      };
    }

    try {
      const next = this.dispatchQueue.shift();
      if (next) {
        this.dispatchQueue.push(next);
      }
      
      this.isProcessing = true;

      // Find the carrier by WERKST-XXX or numeric ID
      const carrierEntity = await this.resolveCarrierByIdentifier(carrierId);

      if (!carrierEntity) {
        return { 
          success: false, 
          carrierId, 
          iCarrierID: null, 
          iStepNo: 0, 
          iResourceID: null, 
          handshakeDone: false,
          error: `Carrier ${carrierId} nicht gefunden` 
        };
      }

      // Step 1: Read current dbProcessData from carrier entity (all 7 fields)
      const dbData = this.extractDbProcessData(carrierEntity);

      // Step 2: MES -> SPS Write xQryBusy=true
      const writeXqyBusy = await this.writeStMesQuery('xQryBusy', true, iResourceID ?? carrierEntity.iResourceID);
      if (!writeXqyBusy) {
        return { 
          ...dbData, 
          success: false, 
          handshakeDone: false, 
          error: 'xQryBusy write failed to SPS',
          xErrL0: 1 
        };
      }

      // Step 3: Wait for SPS response (xStart with matching carrierId)
      const ack = await this.waitForStMesAck(carrierEntity.name, iResourceID ?? carrierEntity.iResourceID);

      if (!ack.xStart) {
        return { 
          ...dbData, 
          success: false, 
          handshakeDone: false,
          error: 'No xStart response from SPS',
          xErrL0: 1 
        };
      }

      // Step 4: MES -> SPS Acknowledge with iStepNo + write dbProcessData fields
      await this.writeStMesQuery('xAck', true, iResourceID ?? carrierEntity.iResourceID);
      await this.writeStMesQuery('iStepNo', ack.iStepNo ?? carrierEntity.iStepNo, iResourceID ?? carrierEntity.iResourceID);
      
      if (carrierEntity.iPar1) await this.writeStMesQuery('iPar1', carrierEntity.iPar1, iResourceID ?? carrierEntity.iResourceID);
      if (carrierEntity.iPar2) await this.writeStMesQuery('iPar2', carrierEntity.iPar2, iResourceID ?? carrierEntity.iResourceID);
      if (carrierEntity.iPar3) await this.writeStMesQuery('iPar3', carrierEntity.iPar3, iResourceID ?? carrierEntity.iResourceID);
      if (carrierEntity.iPar4) await this.writeStMesQuery('iPar4', carrierEntity.iPar4, iResourceID ?? carrierEntity.iResourceID);

      // Set xDone=true on SPS side (MES has answered)
      await this.writeStMesQuery('xDone', true, iResourceID ?? carrierEntity.iResourceID);

      // Update entity with new iStepNo from SPS ack
      if (ack.iStepNo !== undefined) {
        carrierEntity.iStepNo = ack.iStepNo;
        carrierEntity.process_data = { ...carrierEntity.process_data, iStepNo: ack.iStepNo };
      }

      await this.carriersRepo.save({
        id: carrierEntity.id,
        handshake_flags: { ...carrierEntity.handshake_flags, xStart: true, xQryBusy: false, xAck: true },
      });

      return { 
        ...dbData, 
        success: true, 
        iCarrierID: carrierEntity.iCarrierID ?? null,
        iStepNo: ack.iStepNo ?? carrierEntity.iStepNo,
        handshakeDone: true,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  // === Resolve carrier by various ID formats ===
  private async resolveCarrierByIdentifier(idOrName: string): Promise<CarrierEntity | null> {
    // Try UUID first
    try {
      const byUuid = await this.carriersRepo.findOne({ where: { id: idOrName } });
      if (byUuid) return byUuid;
    } catch {}

    // Try by name "WERKST-" format
    const byName = await this.carriersRepo.findOne({ where: { name: idOrName.toUpperCase() } });
    if (byName) return byName;

    // Match numeric: "042" -> "WERKST-042"
    const numericMatch = String(idOrName).match(/\d+/);
    if (numericMatch && this.carriersRepo != null) {
      const pattern = `WERKST-${String(parseInt(numericMatch[0], 10)).padStart(3, '0')}`;
      
      // Also try direct iCarrierID numeric match
      for (const c of await this.carriersRepo.find()) {
        if (c.iCarrierID !== null && String(c.iCarrierID) === numericMatch[0]) {
          return c;
        }
      }
    }

    return null;
  }

  // === Extract all 7 dbProcessData fields from entity ===
  private extractDbProcessData(entity: CarrierEntity): SpsDispatchResult {
    const deckelfarbeMap: Record<number, string> = { 0: 'keine', 1: 'rot', 2: 'blau', 3: 'gruene' };
    const deckelfarbe = deckelfarbeMap[entity.iPar1 ?? 0] ?? `? (${entity.iPar1})`;

    return {
      success: false,
      carrierId: entity.name,
      iCarrierID: entity.iCarrierID ?? null,
      iStepNo: entity.iStepNo,
      iResourceID: entity.iResourceID ?? null,
      deckelfarbe,
      iPar2: entity.iPar2,
      iPar3: entity.iPar3,
      iPar4: entity.iPar4,
      lastProcessTimestamp: entity.lastProcessTimestamp,
      partNumber: entity.partNumber,
      handshakeDone: false,
    };
  }

  // === Write sMES Query fields to OPC UA / MQTT ===
  private async writeStMesQuery(fieldName: string, value: any, resourceId?: number): Promise<boolean> {
    const resourceTag = resourceId ? `r${resourceId}` : 'unknown';
    
    // Try OPC UA write first
    try {
      if (this.opcuaService.isConnected && this.opcuaService.isConnected()) {
        const opcUaNode = `ns=1;s=stMES/${resourceTag}:${fieldName}`;
        return true;
      }
    } catch {
      this.logger.warn(`OPC UA write to ${fieldName} failed`);
    }

    // Fallback: MQTT publish (for production deployment)
    try {
      await this.mqttService.publish(
        `mes/production/${resourceTag}/dbprocessdata`,
        { action: 'write', field: fieldName, value, timestamp: new Date().toISOString() }
      );
      
      // Check for error result in MQTT response (xError flag from SPS)
      if (value === false && fieldName === 'xDone') {
        this.logger.warn(`SPS rejected xDone for ${resourceTag}, possible xError`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.error(`MQTT write to ${fieldName} failed: ${(e as Error).message}`);
      return false;
    }
  }

  // === Wait for SPS xStart response with carrierId match ===
  private async waitForStMesAck(expectedCarrierId: string, resourceId?: number): Promise<SpsHandshakeAck> {
    const timeout = 5000;
    const startTime = Date.now();
    
    return new Promise<SpsHandshakeAck>((resolve) => {
      // Subscribe to xStart for this resource
      const topic = `mes/production/${resourceId ? `r${resourceId}` : '+'}/xStart`;
      
      const sub = this.mqttService.onMessage(topic, (data: any) => {
        if (data.carrier_id?.toUpperCase().includes(expectedCarrierId.toUpperCase()) ||
            data.resource_id === resourceId ||
            topic.includes(String(resourceId))) {
          
          resolve({
            xStart: true,
            xAck: false,
            carrier_id: data.carrier_id ?? expectedCarrierId,
            iStepNo: data.iStepNo ?? 0,
          });
        }
      });

      const timer = setTimeout(() => {
        sub();
        resolve({ xStart: false, xAck: false });
      }, timeout);

      // Cleanup on success (handled by MQTT subscription)
    });
  }

  // === Handle production events from SPS/MQTT ===
  private async handleProductionEvent(topic: string, data: any): Promise<void> {
    this.logger.log(`SPS Event: ${topic}`);

    if (data.carrier_id) {
      const carrierId = int128toString(data.carrier_id);
      
      // Check for errors
      if (data.xErrL0 || data.xErrL1 || data.xErrL2) {
        this.logger.warn(`Error from SPS: L0=${data.xErrL0}, L1=${data.xErrL1}, L2=${data.xErrL2}`);
        // Emit alarm event for Dashboard
      }

      // Dispatch automatically if xStart detected
      if (data.xStart) {
        this.dispatch(carrierId, data.resource_id).catch(e => {
          this.logger.error(`Dispatch failed: ${e.message}`);
        });
      }
    }
  }

  getDispatchQueue(): Array<{ carrierId: string; iResourceID?: number; timestamp: number }> {
    return [...this.dispatchQueue];
  }
}
