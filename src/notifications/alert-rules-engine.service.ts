import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRuleEntity } from './alert-rule.entity';
import { EventBusService } from '../events/event-bus.service';
import { DataCollectionService } from '../data-collection/data-collection.service';

@Injectable()
export class AlertRulesEngineService {
  private readonly logger = new Logger(AlertRulesEngineService.name);
  private activeViolations: Map<string, { ruleId: string; triggeredAt: number }> = new Map();

  constructor(
    @InjectRepository(AlertRuleEntity)
    private readonly rulesRepo: Repository<AlertRuleEntity>,
    private readonly eventBus: EventBusService,
    private readonly dataCollectionService: DataCollectionService,
  ) {}

  async create(dto: import('./alert-rule.dto').CreateAlertRuleDto): Promise<AlertRuleEntity> {
    const rule: AlertRuleEntity = this.rulesRepo.create({ ...dto, enabled: dto.enabled ?? true });
    return await this.rulesRepo.save(rule);
  }

  async findAll(): Promise<AlertRuleEntity[]> {
    return this.rulesRepo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string): Promise<AlertRuleEntity> {
    const rule = await this.rulesRepo.findOne({ where: { id } });
    if (!rule) throw new Error('Alert rule not found');
    return rule;
  }

  async update(id: string, dto: import('./alert-rule.dto').UpdateAlertRuleDto): Promise<AlertRuleEntity> {
    const rule = await this.findOne(id);
    Object.assign(rule, dto);
    return await this.rulesRepo.save(rule);
  }

  async remove(id: string): Promise<void> {
    const result = await this.rulesRepo.delete(id);
    if (result.affected === 0) throw new Error('Alert rule not found');
  }

  async isEnabledCount(): Promise<number> {
    return this.rulesRepo.count({ where: { enabled: true } });
  }

  getActiveViolations(): Map<string, { ruleId: string; triggeredAt: number }> {
    return this.activeViolations;
  }

  clearViolation(ruleId: string): void {
    this.activeViolations.delete(ruleId);
  }

  @Cron('*/10 * * * * *')
  async evaluateRules(): Promise<void> {
    const rules = await this.rulesRepo.find({ where: { enabled: true } });
    for (const rule of rules) {
      await this.evaluateRule(rule);
    }
  }

  private async evaluateRule(rule: AlertRuleEntity): Promise<void> {
    const key = `${rule.machine_id}:${rule.metric}`;

    try {
      let currentValue: number | null = null;

      try {
        const stats = await this.dataCollectionService.getStatsByMachine(rule.machine_id, rule.metric);
        if (stats) {
          currentValue = (stats as any).avg ?? (stats as any).max ?? (stats as any).min ?? null;
        }
      } catch {
        this.logger.debug(`No data for rule ${rule.id} on machine ${rule.machine_id}, metric ${rule.metric}`);
        return;
      }

      if (currentValue === null) return;

      const violated = this.checkThreshold(currentValue, rule);
      if (!violated) {
        this.activeViolations.delete(key);
        return;
      }

      const existing = this.activeViolations.get(key);
      if (existing && Date.now() - existing.triggeredAt < rule.duration_seconds * 1000) {
        this.logger.debug(`Threshold still breached for rule ${rule.id}, duration not exceeded`);
        return;
      }

      this.activeViolations.set(key, { ruleId: rule.id, triggeredAt: Date.now() });

      const message = rule.message_template
        .replace('{metric}', rule.metric)
        .replace('{value}', currentValue.toFixed(2))
        .replace('{threshold}', String(rule.threshold_value ?? '(none)'))
        .replace('{machine}', rule.machine_id);

      this.eventBus.emit('alert.triggered', {
        ruleId: rule.id,
        machineId: rule.machine_id,
        metric: rule.metric,
        value: currentValue,
        severity: rule.severity,
        message,
        channel: rule.channel,
        recipient: rule.recipient,
      });

      this.logger.warn(`[alert-rule] ${rule.name}: threshold violated [${rule.operator}] ${rule.metric}=${currentValue.toFixed(2)} (threshold: ${rule.threshold_value}) on ${rule.machine_id}`);
    } catch (error) {
      this.logger.error(`[alert-rule] evaluation failed for rule ${rule.id}: ${error}`);
    }
  }

  private checkThreshold(value: number, rule: AlertRuleEntity): boolean {
    switch (rule.operator) {
      case 'gt': return value > (rule.threshold_value ?? Infinity);
      case 'gte': return value >= (rule.threshold_value ?? Infinity);
      case 'lt': return value < (rule.threshold_value ?? -Infinity);
      case 'lte': return value <= (rule.threshold_value ?? -Infinity);
      case 'eq': return Math.abs(value - (rule.threshold_value ?? 0)) < 0.001;
      case 'range': return value >= (rule.threshold_low ?? -Infinity) && value <= (rule.threshold_high ?? Infinity);
      default: return false;
    }
  }
}
