import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmEntity } from './alarm.entity';
import type { CreateAlarmDto, UpdateAlarmDto } from './alarm.dto';

@Injectable()
export class AlarmsService {
  constructor(
    @InjectRepository(AlarmEntity)
    private readonly alarmsRepo: Repository<AlarmEntity>,
  ) {}

  async create(dto: CreateAlarmDto): Promise<AlarmEntity> {
    const alarm = this.alarmsRepo.create({
      severity: dto.severity,
      machine_id: dto.machine_id,
      message: dto.message,
      source: dto.source,
    });
    return this.alarmsRepo.save(alarm);
  }

  async findAll(): Promise<AlarmEntity[]> {
    return this.alarmsRepo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string): Promise<AlarmEntity> {
    const alarm = await this.alarmsRepo.findOne({ where: { id } });
    if (!alarm) throw new NotFoundException('Alarm not found');
    return alarm;
  }

  async update(id: string, dto: UpdateAlarmDto): Promise<AlarmEntity> {
    const alarm = await this.findOne(id);
    Object.assign(alarm, dto);
    if (dto.acknowledged_at) alarm.acknowledged = true;
    return this.alarmsRepo.save(alarm);
  }

  async acknowledge(id: string): Promise<AlarmEntity> {
    const alarm = await this.findOne(id);
    alarm.acknowledged = true;
    alarm.acknowledged_at = new Date();
    return this.alarmsRepo.save(alarm);
  }

  async remove(id: string): Promise<void> {
    const result = await this.alarmsRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Alarm not found');
  }

  async setActiveCount(): Promise<number> {
    return this.alarmsRepo.count({ where: { acknowledged: false } });
  }
}
