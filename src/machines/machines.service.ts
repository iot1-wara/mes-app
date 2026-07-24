import { Injectable, NotFoundException } from '@nestjs/common';
import * as Papa from 'papaparse';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MachineEntity, MachineStatusEnum } from './machine.entity';
import type { CreateMachineDto, UpdateMachineDto } from './machine.dto';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(MachineEntity)
    private readonly machinesRepo: Repository<MachineEntity>,
  ) {}

  async create(dto: CreateMachineDto): Promise<MachineEntity> {
    const machine = this.machinesRepo.create({
      name: dto.name,
      status: dto.status as MachineStatusEnum,
      type: dto.type,
      location: dto.location,
      model: dto.model,
      serial_number: dto.serial_number,
      telemetry: {},
    });
    return this.machinesRepo.save(machine);
  }

  async findAll(): Promise<MachineEntity[]> {
    return this.machinesRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<MachineEntity> {
    const machine = await this.machinesRepo.findOne({ where: { id } });
    if (!machine) throw new NotFoundException('Machine not found');
    return machine;
  }

  async update(id: string, dto: UpdateMachineDto): Promise<MachineEntity> {
    const machine = await this.findOne(id);
    Object.assign(machine, dto);
    if (dto.type) machine.type = dto.type;
    return this.machinesRepo.save(machine);
  }

  async remove(id: string): Promise<void> {
    const result = await this.machinesRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Machine not found');
  }

  async updateHeartbeat(id: string): Promise<MachineEntity> {
    await this.machinesRepo.update(id, { last_heartbeat: new Date() });
    return this.findOne(id);
  }

  async findOnline(): Promise<MachineEntity[]> {
    return this.machinesRepo.find({ where: { status: MachineStatusEnum.ONLINE }, order: { name: 'ASC' } });
  }

  async findByLocation(location: string): Promise<MachineEntity[]> {
    return this.machinesRepo.find({ where: { location }, order: { name: 'ASC' } });
  }

  async importCsv(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    const csv = buffer.toString('utf-8');
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) throw new Error(parsed.errors[0].message);

    const headers = Object.keys(parsed.data[0] || {});
    const mandatory = ['name'];
    const missing = mandatory.filter(h => !headers.includes(h));
    if (missing.length) throw new Error(`CSV required columns: ${missing.join(', ')}`);

    const importStatuses: MachineStatusEnum[] = [MachineStatusEnum.ONLINE, MachineStatusEnum.OFFLINE, MachineStatusEnum.MAINTENANCE, MachineStatusEnum.ERROR, MachineStatusEnum.IDLE];
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      try {
        const machine = this.machinesRepo.create({
          name: String(row.name || '').trim(),
          status: (importStatuses.includes((row.status || 'online') as MachineStatusEnum)
            ? (row.status || 'online') as MachineStatusEnum
            : MachineStatusEnum.OFFLINE),
          type: row.type || '',
          location: row.location || '',
          model: row.model || '',
          serial_number: row.serial_number || '',
          telemetry: {},
        });
        await this.machinesRepo.save(machine);
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }
    return { imported, errors };
  }

  getCsvTemplate(): string {
    return [
      'name,status,type,location,model,serial_number',
      'Presser A,online,hydraulic,CNC-Werkstatt,BR-3000,SN-20260001',
      'Laser Cut B,maintenance,laser,CNC-Werkstatt,LC-500X,SN-20260002',
    ].join('\n');
  }
}