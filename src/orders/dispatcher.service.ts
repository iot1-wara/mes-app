import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import EventEmitter from 'events';

export interface SpsHandshakeAck {
  xStart: boolean;
  xAck: boolean;
  carrier_id?: string;
  iStepNo?: number;
}

export interface SPSHandshakeResult {
  carrierId: string;
  success: boolean;
  xErrL0?: number;
  xErrL1?: number;
  xErrL2?: number;
}

@Injectable()
export class DispatcherService extends EventEmitter {
  private opcuasubscriptions = new Map<string, any>();
  private dispatchQueue: Array<{ machineId: string; carrierId: string; stepNo: number }> = [];
  private isdispatching = false;

  async start(machineId: string): Promise<void> {
    console.log(`[Dispatcher] Starting dispatcher for machine ${machineId}`);
    
    this.addListener('xStart', (data: Record<string, any>) => {
      const carrierId = data.carrier_id;
      if (carrierId) this.dispatchQueue.push({ machineId, carrierId, stepNo: data.iStepNo ?? 0 });
    });
  }

  async dispatch(nextCarrierId: string): Promise<SPSHandshakeResult> {
    this.isdispatching = true;
    
    try {
      const handshake = await this.executeStMESHandshake(nextCarrierId);
      
      if (!handshake.success) {
        this.emit('error', { carrierId: nextCarrierId, level: 'L0', timestamp: new Date() });
      }

      return {
        carrierId: nextCarrierId,
        success: handshake.success,
        xErrL0: handshake.xErrL0 ?? 0,
        xErrL1: handshake.xErrL1 ?? 0,
        xErrL2: handshake.xErrL2 ?? 0,
      };
    } finally {
      this.isdispatching = false;
    }
  }

  private async executeStMESHandshake(carrierId: string): Promise<{ success: boolean; xErrL0?: number; xErrL1?: number; xErrL2?: number }> {
    // Step 1: MES → SPS Send xQryBusy request
    const request = await this.sendOPCUAWrite('xQryBusy', true, carrierId);
    
    // Step 2: Wait for SPS → MES response on opcStart
    const response = new Promise<SpsHandshakeAck>((resolve) => {
      setTimeout(() => resolve({ xStart: false, xAck: false }), 5000);
      
      this.addListener('xStart', (data) => {
        if (data.carrier_id === carrierId) {
          resolve(data);
        }
      });
    });

    const ack = await response;
    
    if (!ack.xStart) {
      return { success: false, xErrL0: 1 };
    }

    // Step 3: MES → SPS Acknowledge with dbProcessData iStepNo
    await this.sendOPCUAWrite('xAck', true, carrierId);
    await this.sendOPCUAWrite('iStepNo', ack.iStepNo ?? 0, carrierId);

    return { success: true };
  }

  private async sendOPCUAWrite(variableName: string, value: any, carrierId: string): Promise<boolean> {
    const key = `${carrierId}:${variableName}`;
    this.opcuasubscriptions.set(key, { variableName, value, timestamp: Date.now() });
    return true;
  }

  addSubscription(machineId: string, callback: (data: Record<string, any>) => void): void {
    this.addListener(`${machineId}:xStart`, callback);
    console.log(`[Dispatcher] Subscribed to xStart on machine ${machineId}`);
  }

  getDispatchQueue(): typeof this.dispatchQueue {
    return [...this.dispatchQueue];
  }

  getOPCUAState(carrierId: string): Map<string, any> {
    const result = new Map();
    for (const [key, value] of this.opcuasubscriptions) {
      if (key.startsWith(carrierId)) result.set(key, value);
    }
    return result;
  }
}
