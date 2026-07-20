import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('traces')
export class TraceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  machine_id: string;

  @Column({ nullable: true })
  order_id?: string;

  @Column({ type: 'enum', enum: ['process_data', 'quality', 'material', 'energy', 'op_input'] })
  category: 'process_data' | 'quality' | 'material' | 'energy' | 'op_input';

  @Index()
  @Column()
  key_data_point: string;

  @Column({ type: 'jsonb' })
  value: any;

  @Column({ type: 'jsonb', nullable: true })
  tags?: Record<string, string>;

  @CreateDateColumn()
  collected_at: Date;
}
