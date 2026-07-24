import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MaterialEntity } from './material.entity';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'int', default: 5 })
  priority!: number;

  @Column()
  machine_id!: string;

  @Column()
  operation!: string;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'released', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'pending'
  })
  status!: 'pending' | 'released' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ type: 'int', default: 0 })
  completed_quantity!: number;

  // SPS handshake flags (diagnostic interface OPC UA)
  @Column({ nullable: true })
  sps_flag_udi_on?: boolean;

  @Column({ type: 'jsonb', nullable: true })
  sps_flags?: { udiONo?: boolean; uiOPos?: boolean; uiOpNo?: boolean };

  // Production step tracking
  @Column({ type: 'int', default: 0, nullable: true })
  next_step_no?: number;

  @Column({ type: 'int', default: 0, nullable: true })
  iStepNo?: number;

  @Column({ type: 'int', default: 0, nullable: true })
  iResourceID?: number;

  @Column({ type: 'timestamp', nullable: true })
  start_time?: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_time?: Date;

  @Column({ type: 'timestamp', nullable: true })
  target_complete_time?: Date;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @OneToMany(() => MaterialEntity, (mat) => mat.order)
  materials?: any[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
