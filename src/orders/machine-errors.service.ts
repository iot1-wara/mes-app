import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MachineErrorEntity, CreateErrorDto } from './machine-error.entity';

@Injectable()
export class MachineErrorsService {
  constructor(
    @InjectRepository(MachineErrorEntity)
    private readonly machineErrorsRepo: Repository<MachineErrorEntity>,
  ) {}

  async create(dto: CreateErrorDto): Promise<MachineErrorEntity> {
    return this.machineErrorsRepo.save({
      ...dto,
      duration_seconds: dto.duration_seconds || 0,
    });
  }

  async findByMachine(machineId: string): Promise<MachineErrorEntity[]> {
    return this.machineErrorsRepo.find({ 
      where: { machine_id: machineId }, 
      order: { created_at: 'DESC' }
    });
  }

  async getDowntimeStats(machineId: string, start?: Date, end?: Date): Promise<{
    totalEvents: number;
    totalDowntimeSeconds: number;
    avgDowntimeSec: number;
    maxDowntimeSec: number;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    const qb = this.machineErrorsRepo.createQueryBuilder('me')
      .where('me.machine_id = :mid', { mid: machineId })
      .select([
        'COUNT(*) FILTER (WHERE me.duration_seconds > 0)',
        'SUM(me.duration_seconds) FILTER (WHERE me.duration_seconds > 0)',
        'AVG(me.duration_seconds) FILTER (WHERE me.duration_seconds > 0)',
        'MAX(me.duration_seconds)',
      ]);

    if (start) qb.andWhere('me.created_at >= :start', { start });
    if (end) qb.andWhere('me.created_at <= :end', { end });

    const stats = await qb.getRawOne();

    // Top error categories
    const catStats = await this.machineErrorsRepo.createQueryBuilder('mep')
      .select(['me.error_category AS category', 'COUNT(*) AS count'])
      .where(`me.machine_id = :mid`, { mid: machineId })
      .groupBy('me.error_category')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      totalEvents: parseInt(stats['count'] ?? '0', 10),
      totalDowntimeSeconds: parseFloat(stats['sum(me.duration_seconds)'] ?? '0'),
      avgDowntimeSec: parseFloat((stats['avg(me.duration_seconds)'] || 0).toFixed(2)),
      maxDowntimeSec: parseFloat(stats['max(me.duration_seconds)'] ?? '0'),
      topCategories: catStats.map(s => ({ category: s.category, count: parseInt(s.count, 10) })),
    };
  }

  async getParetoStats(): Promise<Array<{ category: string; count: number }>> {
    const catStats = await this.machineErrorsRepo.createQueryBuilder('me')
      .select(['me.error_category AS category', 'COUNT(*) AS count'])
      .groupBy('me.error_category')
      .orderBy('count', 'DESC')
      .getRawMany();

    return catStats.map(s => ({ category: s.category, count: parseInt(s.count, 10) }));
  }

  async recoverError(errorId: string): Promise<MachineErrorEntity> {
    const error = await this.machineErrorsRepo.findOneOrFail({ where: { id: errorId } });
    const durationSecs = (new Date().getTime() - new Date(error.created_at).getTime()) / 1000;
    
    error.recovered_at = new Date();
    error.duration_seconds = Math.round(durationSecs);

    return this.machineErrorsRepo.save(error);
  }
}
