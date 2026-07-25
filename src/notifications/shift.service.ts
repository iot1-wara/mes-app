import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ShiftEntity, ShiftType } from './shift.entity';

@Injectable()
export class ShiftService {
  constructor(
    @InjectRepository(ShiftEntity)
    private readonly shiftsRepo: Repository<ShiftEntity>,
  ) {}

  async create(dto: { shift_type: ShiftType; supervisor: string; notes?: string }): Promise<ShiftEntity> {
    if (!['day', 'swing', 'night'].includes(dto.shift_type)) {
      throw new BadRequestException('shift_type must be day, swing, or night');
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingOpen = await this.shiftsRepo.findOne({
      where: { date: today, shift_type: dto.shift_type, closed: false },
    });
    if (existingOpen) {
      throw new BadRequestException(`Shift ${dto.shift_type} already open for today`);
    }

    const shift = this.shiftsRepo.create({
      ...dto,
      date: today,
      started_at: new Date(),
    });
    return this.shiftsRepo.save(shift);
  }

  async findAll(params?: { date?: Date; shift_type?: ShiftType; closed?: boolean }): Promise<ShiftEntity[]> {
    const where: any = {};
    if (params?.date) where.date = params.date;
    if (params?.shift_type) where.shift_type = params.shift_type;
    if (params?.closed !== undefined) where.closed = params.closed;
    return this.shiftsRepo.find({ where, order: { date: 'DESC' } });
  }

  async findOne(id: string): Promise<ShiftEntity> {
    const shift = await this.shiftsRepo.findOne({ where: { id } });
    if (!shift) throw new Error('Shift not found');
    return shift;
  }

  async closeShift(id: string): Promise<ShiftEntity> {
    const shift = await this.findOne(id);
    shift.ended_at = new Date();
    shift.closed = true;
    return this.shiftsRepo.save(shift);
  }

  generateReport(shiftId: string) {
    return async () => {
      const shift = await this.findOne(shiftId);
      return {
        shift_id: shift.id,
        shift_type: shift.shift_type,
        date: shift.date,
        supervisor: shift.supervisor,
        started_at: shift.started_at,
        ended_at: shift.ended_at,
        notes: shift.notes,
        status: shift.closed ? 'closed' : 'open',
      };
    };
  }

  async getStatsByPeriod(startDate: Date, endDate: Date) {
    const shifts = await this.shiftsRepo.find({ where: { date: Between(startDate, endDate), closed: true } });
    return {
      total_shifts: shifts.length,
      day_shifts: shifts.filter(s => s.shift_type === 'day').length,
      swing_shifts: shifts.filter(s => s.shift_type === 'swing').length,
      night_shifts: shifts.filter(s => s.shift_type === 'night').length,
      closed_shifts: shifts.filter(s => s.closed).length,
    };
  }
}
