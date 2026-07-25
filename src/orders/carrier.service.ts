import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import type { FindOptionsRelations, FindOptionsSelect } from 'typeorm';
import { CarrierEntity } from './carrier.entity';
import type { CreateCarrierDto, UpdateCarrierDto, AdvanceCarrierDto } from './carrier.dto';

export const DECKEL_FARBE_NAME: Record<number, string> = {
  0: 'keine',
  1: 'rot',
  2: 'blau',
  3: 'grune',
};

@Injectable()
export class CarrierService {
  constructor(
    @InjectRepository(CarrierEntity)
    private readonly carriersRepo: Repository<CarrierEntity>,
  ) {}

  async create(dto: CreateCarrierDto): Promise<CarrierEntity> {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('name is required and must not be empty');
    }
    
    const existing = await this.carriersRepo.findOne({ where: { name: dto.name.trim() } });
    if (existing) {
      throw new BadRequestException(`Carrier with name "${dto.name.trim()}" already exists`);
    }
    
    const carrier = new CarrierEntity();
    carrier.name = dto.name.trim();
    carrier.status = (dto.status ?? 'idle') as any;
    carrier.iStepNo = dto.iStepNo ?? 0;
    carrier.nextStepNo = dto.nextStepNo != null ? Number(dto.nextStepNo) : 0;
    if (dto.order_id != null) carrier.order_id = String(dto.order_id);
    if (dto.current_station_id != null) carrier.current_station_id = String(dto.current_station_id);
    if (dto.next_resource_id != null) {
      carrier.iResourceID = Number(dto.next_resource_id);
    }
    carrier.iCarrierID = dto.iCarrierID != null ? Number(dto.iCarrierID) : null;
    carrier.iPar1 = dto.iPar1 != null ? Number(dto.iPar1) : 0;
    carrier.iPar2 = dto.iPar2 != null ? Number(dto.iPar2) : 0;
    carrier.iPar3 = dto.iPar3 != null ? Number(dto.iPar3) : 0;
    carrier.iPar4 = dto.iPar4 != null ? Number(dto.iPar4) : 0;
    if (dto.partNumber != null) carrier.partNumber = String(dto.partNumber);
    if (dto.lastProcessTimestamp != null) carrier.lastProcessTimestamp = new Date(dto.lastProcessTimestamp as unknown as string);
    return await this.carriersRepo.save(carrier);
  }

  async findAll(): Promise<CarrierEntity[]> {
    return await this.carriersRepo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string): Promise<CarrierEntity> {
    try {
      const carrier = await this.carriersRepo.findOne({ where: { id } });
      if (!carrier) throw new NotFoundException('Carrier not found');
      return carrier;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new NotFoundException('Carrier not found');
    }
  }

  async update(id: string, dto: UpdateCarrierDto): Promise<CarrierEntity> {
    const carrier = await this.findOne(id);
    
    if (dto.status === 'error') {
      carrier.handshake_flags = { ...carrier.handshake_flags, xErrL0: true } as typeof carrier.handshake_flags;
    }

    Object.assign(carrier, dto);
    return this.carriersRepo.save(carrier);
  }

  async advance(id: string, dto: AdvanceCarrierDto): Promise<CarrierEntity> {
    const carrier = await this.findOne(id);
    carrier.handshake_flags = { xStart: true, xQryBusy: false };
    carrier.iStepNo = dto.iStepNo;
    carrier.process_data = {
      ...carrier.process_data,
      iStepNo: dto.iStepNo,
      next_resource_id: dto.next_resource_id as unknown as number | undefined,
      step_description: dto.step_description || '',
    };

    return this.carriersRepo.save(carrier);
  }

  async getByStation(stationId: string): Promise<CarrierEntity[]> {
    try {
      return this.carriersRepo.find({ where: { current_station_id: stationId } });
    } catch {
      return [];
    }
  }

  async getActive(): Promise<CarrierEntity[]> {
    try {
      return this.carriersRepo.find({ where: { status: In(['in_process', 'at_station']) } });
    } catch {
      return [];
    }
  }

  async syncHandshake(id: string, xStartAck: boolean): Promise<CarrierEntity> {
    const carrier = await this.findOne(id);
    carrier.handshake_flags = { xStart: xStartAck, xQryBusy: false, xAck: true };
    
    if (xStartAck && carrier.status === 'idle') {
      carrier.status = 'in_process';
    }

    return this.carriersRepo.save(carrier);
  }

  async getHandshakeStatuses(): Promise<Array<{ id: string; name: string; handshake: Record<string, any>; status: string }>> {
    const carriers = await this.carriersRepo.createQueryBuilder('c')
      .select(['c.id', 'c.name', 'c.handshake_flags', 'c.status'])
      .where("c.status IN (:...statuses)", { statuses: ['in_process', 'at_station'] })
      .getMany();

    return carriers.map(c => ({
      id: c.id,
      name: c.name,
      handshake: c.handshake_flags || {},
      status: c.status,
    }));
  }

  async getDbProcessData(): Promise<Array<{
    carrierId: string;
    name: string;
    iCarrierID: number | null;
    iStepNo: number;
    iResourceID: number | null;
    next_resource_id: number | null;
    deckelfarbeName: string;
    iPar2: number;
    iPar3: number;
    iPar4: number;
    lastProcessTimestamp: Date | null;
    partNumber?: string;
    status: string;
    handshake: Record<string, any>;
    xAuto?: boolean;
    xManual?: boolean;
    xBusy?: boolean;
    xReset?: boolean;
  }>> {
    const carriers = await this.getDbProcessDataRaw();

    return carriers.map(c => ({
      carrierId: c.id,
      name: c.name,
      iCarrierID: (c as any).i_carrier_id ?? null,
      iStepNo: (c as any).i_step_no ?? 0,
      iResourceID: (c as any).i_resource_id ?? null,
      next_resource_id: (c as any).next_resource_id ?? null,
      deckelfarbeName: DECKEL_FARBE_NAME[(c as any).i_par1 ?? 0] || `? (${(c as any).i_par1})`,
      iPar2: (c as any).i_par2 ?? 0,
      iPar3: (c as any).i_par3 ?? 0,
      iPar4: (c as any).i_par4 ?? 0,
      lastProcessTimestamp: (c as any).last_process_timestamp ?? null,
      partNumber: (c as any).part_number,
      status: c.status,
      handshake: (c as any).handshake_flags || {},
      xAuto: (c as any).x_auto,
      xManual: (c as any).x_manual,
      xBusy: (c as any).x_busy,
      xReset: (c as any).x_reset,
    }));
  }

  private async getDbProcessDataRaw(): Promise<any[]> {
    try {
      return await this.carriersRepo.query(
        `SELECT id, name, i_step_no, next_step_no, current_station_id, 
                i_carrier_id, i_resource_id, i_par1, i_par2, i_par3, i_par4,
                part_number, last_process_timestamp, 
                process_data, total_material_used_qty, status, created_at, updated_at,
                COALESCE(handshake_flags->>'xStart', 'false') as x_start,
                COALESCE(handshake_flags->>'xQryBusy', 'false') as x_qry_busy,
                COALESCE(handshake_flags->>'xAck', 'false') as x_ack,
                next_resource_id
         FROM carriers 
         WHERE status IN ('in_process', 'at_station', 'idle')
         ORDER BY created_at DESC`
      );
    } catch {
      return [];
    }
  }

  async getNextResources(): Promise<number[]> {
    try {
      const rows = await this.carriersRepo.query(
        `SELECT DISTINCT i_resource_id FROM carriers WHERE i_resource_id IS NOT NULL ORDER BY i_resource_id`
      );
      return rows.map((r: any) => r.i_resource_id).filter(Boolean);
    } catch {
      return [];
    }
  }

  async advanceManual(id: string, dto: Omit<AdvanceCarrierDto, 'iStepNo'>): Promise<CarrierEntity> {
    const carrier = await this.findOne(id);
    const currentStep = (carrier.process_data?.iStepNo ?? carrier.iStepNo) || 0;
    const nextStep = currentStep + 1;

    carrier.handshake_flags = { xStart: true, xQryBusy: false };
    carrier.iStepNo = nextStep;
    carrier.process_data = {
      ...carrier.process_data,
      iStepNo: nextStep,
      next_resource_id: dto.next_resource_id as unknown as number | undefined,
    };

    return this.carriersRepo.save(carrier);
  }

  async getStats(): Promise<{ total: number; byStatus: Record<string, number>; avgPar1: number }> {
    const all = await this.findAll();
    const byStatus: Record<string, number> = {};
    for (const c of all) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }
    return { total: all.length, byStatus, avgPar1: 0 };
  }

  async remove(id: string): Promise<void> {
    await this.carriersRepo.delete(id);
  }

}
