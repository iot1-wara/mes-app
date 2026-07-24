import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OrderEntity } from './order.entity';

@Entity('carriers')
@Index(['current_station_id'])
@Index(['order_id', 'status'])
export class CarrierEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;  // e.g. "WERKST-001" carrier identifier

  @Column({ type: 'int', default: 0 })
  iStepNo!: number;  // Current step number (maps to dbProcessData.iStepNo)

  @Column({ type: 'int', default: 0 })
  nextStepNo!: number;

  @Column({ nullable: true })
  current_station_id?: string;

  @Column({ nullable: true })
  next_resource_id?: string;

  // OPC UA handshake flags (from MES → SPS interface)
  @Column({ type: 'jsonb', nullable: true })
  handshake_flags!: { xStart?: boolean; xQryBusy?: boolean; xAck?: boolean };

  // dbProcessData routing params
  @Column({ type: 'jsonb', nullable: true })
  process_data!: {
    iStepNo?: number;
    next_resource_id?: number;
    step_description?: string;
    material_lot?: string;
    [key: string]: any;
  };

  // Material consumption tracking
  @Column({ type: 'int', default: 0 })
  total_material_used_qty!: number;

  @ManyToOne(() => OrderEntity, (order) => order.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: any;

  @Column()
  order_id!: string;

  @Column({ 
    type: 'enum', 
    enum: ['idle', 'in_process', 'at_station', 'moved', 'error', 'waiting_for_material'],
    default: 'idle'
  })
  status!: 'idle' | 'in_process' | 'at_station' | 'moved' | 'error' | 'waiting_for_material';

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
