import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { AlarmEntity } from '../alarms/alarm.entity';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AlarmEntity, { nullable: true, onDelete: 'SET NULL' })
  alarm?: AlarmEntity;

  @Column()
  channel!: 'email' | 'push' | 'mqtt';

  @Column({ type: 'text', nullable: true })
  recipient!: string;

  @Column()
  subject!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'enum', enum: ['pending', 'sent', 'failed'], default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
