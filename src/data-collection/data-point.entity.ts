import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('data_points')
@Index(['machine_id', 'timestamp'])
@Index(['node_id', 'timestamp'])
export class DataPointEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  machine_id: string;

  @Column()
  node_id: string;

  @Column({ type: 'float8' })
  value: number;

  @Column({ type: 'enum', enum: ['good', 'bad', 'uncertain'], default: 'good' })
  quality: 'good' | 'bad' | 'uncertain';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn()
  collected_at: Date;
}
