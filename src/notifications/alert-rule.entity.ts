import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('alert_rules')
export class AlertRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  machine_id!: string;

  @Column({ default: false })
  enabled!: boolean;

  @Column({ type: 'text' })
  metric!: string;

  @Column({ type: 'enum', enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'range'], default: 'gt' })
  operator!: string;

  @Column({ type: 'float', nullable: true })
  threshold_value?: number;

  @Column({ type: 'float', nullable: true })
  threshold_low?: number;

  @Column({ type: 'float', nullable: true })
  threshold_high?: number;

  @Column({ type: 'int', default: 60 })
  duration_seconds!: number;

  @Column({ type: 'enum', enum: ['info', 'warning', 'error', 'critical'], default: 'warning' })
  severity!: string;

  @Column({ type: 'text' })
  message_template!: string;

  @Column({ type: 'enum', enum: ['in_app', 'email', 'push', 'mqtt'], default: 'in_app' })
  channel!: string;

  @Column({ type: 'text', nullable: true })
  recipient?: string;

  @Column({ type: 'int', default: 1 })
  evaluation_interval_seconds!: number;

  @Column({ type: 'jsonb', default: '{}' })
  custom_config?: Record<string, any>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
