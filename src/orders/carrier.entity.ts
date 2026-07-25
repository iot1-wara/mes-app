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

  // dbProcessData (DB151) direct mapping fields — matches SPS DB151 exactly
  @Column({ type: 'int', nullable: true })
  iCarrierID!: number | null;  // Int(128) from SPS — stored as INT with BigInt cast in SPS dispatcher

  @Column({ type: 'int', nullable: true })
  iResourceID!: number | null;  // Int(2) from SPS — target station (migrated from string to integer)

  @Column({ type: 'int', default: 0 })
  iPar1!: number;  // Deckelfarbe (0=keine, 1=R, 2=B, 3=G)

  @Column({ type: 'int', default: 0 })
  iPar2!: number;  // Anzahl rote Kugeln

  @Column({ type: 'int', default: 0 })
  iPar3!: number;  // Anzahl grüne Kugeln

  @Column({ type: 'int', default: 0 })
  iPar4!: number;  // Anzahl blaue Kugeln

  // Mapped from sMES query fields (stMesQuery)
  @Column({ nullable: true })
  partNumber?: string;  // udiPNo — Part Number des Werkstücks

  @Column({ type: 'timestamp', nullable: true })
  lastProcessTimestamp!: Date | null;  // ldtTimeStamp aus dbProcessData

  // OPC UA handshake flags (from MES → SPS interface)
  @Column({ type: 'jsonb', nullable: true })
  handshake_flags!: { xStart?: boolean; xQryBusy?: boolean; xAck?: boolean };

  // Fallback: sMES query state bits (xAuto/xManual/xBusy/xReset)
  @Column({ type: 'jsonb', nullable: true, default: {} })
  mes_state!: Record<string, any>;

  // dbProcessData routing params (legacy fallback for dynamic fields)
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

  @Column({ nullable: true })
  order_id!: string | null;

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
