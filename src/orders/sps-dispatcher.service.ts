import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarrierEntity } from './carrier.entity';
import { OpcUaService, OpcUaEvent, OpcUaEventType, DbProcessDataEntry } from '../opcua/opcua.service';

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
  private opcuaEventListener: ReturnType<OpcUaService['on']> | null = null;
  private dispatchQueue: Array<{ carrierId: string; stationId?: number; timestamp: number }> = [];
  private isProcessing = false;

  constructor(
    @InjectRepository(CarrierEntity)
    private readonly carriersRepo: Repository<CarrierEntity>,
    private readonly opcuaService: OpcUaService,
  ) {}

  onModuleInit() {
    this.logger.log('SPS Dispatcher initialized');

    // Listen to all OPC UA events from all stations
    this.opcuaEventListener = this.opcuaService.on('xStart', (event: OpcUaEvent) => {
      this.handleOpcUaEvent(event).catch(e => {
        this.logger.error(`Error handling OPC UA event: ${e.message}`);
      });
    });

    return Promise.resolve();
  }

  onModuleDestroy() {
    if (this.opcuaEventListener) {
      this.opcuaEventListener();
    }
  }

  // === Primary dispatch entry point ===

  async dispatch(carrierId: string, stationId?: number): Promise<SpsDispatchResult> {
    if (this.isProcessing) {
      this.dispatchQueue.push({ carrierId, stationId, timestamp: Date.now() });
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

      // Step 2: MES -> SPS Write xQryBusy=true to correct station via OPC UA
      const writeSuccess = await this.opcuaService.writeStMesQuery(stationId ?? carrierEntity.iResourceID!, 'xQryBusy', true);
      if (!writeSuccess) {
        return { 
          ...dbData, 
          success: false, 
          handshakeDone: false, 
          error: 'xQryBusy write failed to SPS via OPC UA',
          xErrL0: 1 
        };
      }

      // Step 3: Wait for SPS response (xDone) with matching carrierId
      const ack = await this.waitForStMesAck(carrierEntity.name, stationId ?? carrierEntity.iResourceID);

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
      await this.opcuaService.writeStMesQuery(stationId ?? carrierEntity.iResourceID!, 'xAck', true);
      await this.opcuaService.writeStMesQuery(stationId ?? carrierEntity.iResourceID!, 'iStepNo', ack.iStepNo ?? carrierEntity.iStepNo);
      
      if (carrierEntity.iPar1) await this.opcuaService.writeStMesQuery(stationId ?? carrierEntity.iResourceID!, 'iPar1', carrierEntity.iPar1);
      if (carrierEntity.iPar2) await this.opcuaService.writeStMesQuery(stationId ?? carrierEntity.iResourceID!, 'iPar2', carrierEntity.iPar2);
      if (carrierEntity.iPar3) await this.opcuaService.writeStMesQuery(stationId ?? carrierEntity.iResourceID!, 'iPar3', carrierEntity.iPar3);
      if (carrierEntity.iPar4) await this.opcuaService.writeStMesQuery(stationId ?? carrierEntity.iResourceID!, 'iPar4', carrierEntity.iPar4);

      // Set xDone=true on SPS side (MES has answered)
      await this.opcuaService.writeStMesQuery(stationId ?? carrierEntity.iResourceID!, 'xDone', true);

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
    if (numericMatch) {
      // Try direct iCarrierID numeric match
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

  // === Wait for SPS xStart response via OPC UA event ===
  private async waitForStMesAck(expectedCarrierId: string, stationId?: number): Promise<SpsHandshakeAck> {
    return new Promise<SpsHandshakeAck>((resolve) => {
      const timeout = 5000;

      const unsubscribe = this.opcuaService.on('stMesStateChange', (event: OpcUaEvent) => {
        if (stationId && event.stationId !== stationId) return;

        const data = event.data as any;
        const carrierMatch = data.carrier_id?.toUpperCase().includes(expectedCarrierId.toUpperCase()) ||
                            String(data.uiCarrierId)?.toUpperCase() === expectedCarrierId.toUpperCase();

        if (data.xDone || carrierMatch) {
          unsubscribe();
          resolve({
            xStart: true,
            xAck: false,
            carrier_id: data.uiCarrierId ?? expectedCarrierId,
            iStepNo: data.iStepNo ?? 0,
          });
        }
      });

      const timer = setTimeout(() => {
        unsubscribe();
        resolve({ xStart: false, xAck: false });
      }, timeout);
    });
  }

  // === Handle xStart event from OPC UA subscription ===
  private async handleOpcUaEvent(event: OpcUaEvent): Promise<void> {
    this.logger.log(`OPC UA Event received: ${event.type} from Station ${event.stationId}`);

    const data = event.data as DbProcessDataEntry;
    
    if (!data?.iCarrierID) return;

    // Skip if no error flags and not xStart - ignore other noise for now
    if (event.type !== 'xStart') return;

    const carrierId = int128toString(data.iCarrierID);
    this.logger.log(`Carrying: ${carrierId} at Station ${event.stationId}`);

    // Dispatch automatically when xStart detected from SPS
    this.dispatch(carrierId, event.stationId).catch(e => {
      this.logger.error(`Dispatch failed for station ${event.stationId}: ${e.message}`);
    });
  }

  getDispatchQueue(): Array<{ carrierId: string; stationId?: number; timestamp: number }> {
    return [...this.dispatchQueue];
  }
}
