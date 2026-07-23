import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CarrierEntity } from './carrier.entity';
import type { CreateCarrierDto, UpdateCarrierDto, AdvanceCarrierDto } from './carrier.dto';

@Injectable()
export class CarrierService {
  constructor(
    @InjectRepository(CarrierEntity)
    private readonly carriersRepo: Repository<CarrierEntity>,
  ) {}

  async create(dto: CreateCarrierDto): Promise<CarrierEntity> {
    const carrier = this.carriersRepo.create({
      name: dto.name,
      current_station_id: dto.current_station_id,
      next_resource_id: dto.next_resource_id,
      order_id: dto.order_id,
      iStepNo: dto.iStepNo || 0,
      nextStepNo: dto.nextStepNo || 1,
      status: dto.status || 'idle',
      handshake_flags: { xStart: false, xQryBusy: false, xAck: false },
      process_data: { iStepNo: dto.iStepNo, next_resource_id: dto.next_resource_id },
    });
    return this.carriersRepo.save(carrier);
  }

  async findAll(): Promise<CarrierEntity[]> {
    return this.carriersRepo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string): Promise<CarrierEntity> {
    const carrier = await this.carriersRepo.findOne({ where: { id }, relations: ['order'] });
    if (!carrier) throw new BadRequestException('Carrier not found');
    return carrier;
  }

  async update(id: string, dto: UpdateCarrierDto): Promise<CarrierEntity> {
    const carrier = await this.findOne(id);
    
    if (dto.status === 'error') {
      carrier.handshake_flags = { ...carrier.handshake_flags, xErrL0: true };
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
      next_resource_id: dto.next_resource_id,
      step_description: dto.step_description,
    };

    return this.carriersRepo.save(carrier);
  }

  async getByStation(stationId: string): Promise<CarrierEntity[]> {
    return this.carriersRepo.find({ where: { current_station_id: stationId }, relations: ['order'] });
  }

  async getActive(): Promise<CarrierEntity[]> {
    return this.carriersRepo.find({ where: { status: In(['in_process', 'at_station']) }, relations: ['order'] });
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
      select: ['id', 'name', 'handshake_flags', 'status'],
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
