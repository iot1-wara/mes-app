import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('machine_errors')
@Index(['machine_id', 'created_at'])
export class MachineErrorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  machine_id: string;

  @Column({ type: 'int', default: 0 })
  xErrL0: number; // Level zero error (critical)

  @Column({ type: 'int', default: 0 })
  xErrL1: number; // Level one error (warning)

  @Column({ type: 'int', default: 0 })
  xErrL2: number; // Level two error (info)

  @Column()
  error_category: string; // 'hardware', 'software', 'material', 'environment'

  @Column()
  description: string;

  @Column({ nullable: true })
  recovered_at?: Date;

  @Column({ type: 'int', default: 0 })
  duration_seconds: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export class CreateErrorDto {
  machine_id: string;
  xErrL0: number;
  xErrL1: number;
  xErrL2: number;
  error_category: string;
  description: string;
  duration_seconds?: number;
}
