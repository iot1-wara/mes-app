import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AlarmSeverity = 'info' | 'warning' | 'error' | 'critical';

@Entity('alarms')
export class AlarmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['info', 'warning', 'error', 'critical'], default: 'info' })
  severity!: AlarmSeverity;

  @Column()
  machine_id!: string;

  @Column()
  message!: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ type: 'uuid', nullable: true })
  rule_id?: string;

  @Column({ type: 'enum', enum: ['in_app', 'email', 'push', 'mqtt'], default: 'in_app' })
  channel!: string;

  @Column({ type: 'text', nullable: true })
  recipient?: string;

  @Column({ type: 'enum', enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' })
  delivery_status!: string;

  @Column({ type: 'timestamp', nullable: true })
  acknowledged_at?: Date;

  @Column({ default: false })
  acknowledged!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
