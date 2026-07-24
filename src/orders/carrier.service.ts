import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import type { FindOptionsRelations, FindOptionsSelect } from 'typeorm';
import { CarrierEntity } from './carrier.entity';
import type { CreateCarrierDto, UpdateCarrierDto, AdvanceCarrierDto } from './carrier.dto';

@Injectable()
export class CarrierService {
  constructor(
    @InjectRepository(CarrierEntity)
    private readonly carriersRepo: Repository<CarrierEntity>,
  ) {}

  async create(dto: CreateCarrierDto): Promise<CarrierEntity> {
    const carrier: any = new CarrierEntity();
    carrier.name = dto.name;
    carrier.current_station_id = dto.current_station_id!;
    carrier.next_resource_id = dto.next_resource_id!;
    carrier.order_id = dto.order_id;
    carrier.iStepNo = dto.iStepNo || 0;
    carrier.nextStepNo = dto.nextStepNo || 1;
    carrier.status = dto.status || 'idle' as const;
    carrier.handshake_flags = { xStart: false, xQryBusy: false, xAck: false };
    carrier.process_data = { iStepNo: dto.iStepNo, next_resource_id: dto.next_resource_id as any };
    const saved = await this.carriersRepo.save(carrier);
    return saved as CarrierEntity;
  }

  async findAll(): Promise<CarrierEntity[]> {
    try {
      const rows = await this.carriersRepo.query(
        `SELECT id, name, i_step_no, next_step_no, current_station_id, next_resource_id, handshake_flags, process_data, total_material_used_qty, status, created_at, updated_at FROM carriers ORDER BY created_at DESC`
      );
      return rows.map((r: any) => {
        const c = new CarrierEntity();
        Object.keys(r).forEach(k => { c[k] = r[k]; });
        return c;
      });
    } catch {
      return [];
    }
  }

  async findOne(id: string): Promise<CarrierEntity> {
    try {
      const carrier = await this.carriersRepo.findOne({ where: { id } });
      if (!carrier) throw new BadRequestException('Carrier not found');
      return carrier;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Carrier not found');
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
    
    // Trigger OPC UA handshake
    carrier.handshake_flags = { xStart: true, xQryBusy: false };
    carrier.iStepNo = dto.iStepNo;
    carrier.process_data = {
      ...carrier.process_data,
      iStepNo: dto.iStepNo,
      next_resource_id: dto.next_resource_id as unknown as number | undefined,
      step_description: dto.step_description,
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
    const carriers = await this.carriersRepo.find({ 
      select: ['id', 'name', 'handshake_flags', 'status'] as any,
      where: { status: In(['in_process', 'at_station']) },
    });

    return carriers.map(c => ({
      id: c.id,
      name: c.name,
      handshake: c.handshake_flags || {},
      status: c.status,
    }));
  }
}
