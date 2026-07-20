import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AlarmSeverity = 'info' | 'warning' | 'error' | 'critical';

@Entity('alarms')
export class AlarmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['info', 'warning', 'error', 'critical'], default: 'info' })
  severity: AlarmSeverity;

  @Column()
  machine_id: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ type: 'timestamp', nullable: true })
  acknowledged_at?: Date;

  @Column({ default: false })
  acknowledged: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
