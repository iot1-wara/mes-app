import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ShiftType = 'day' | 'swing' | 'night';

@Entity('shifts')
export class ShiftEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['day', 'swing', 'night'] })
  shift_type!: ShiftType;

  @Column({ type: 'date' })
  date!: Date;

  @Column()
  supervisor!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamptz' })
  started_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at?: Date;

  @Column({ default: false })
  closed!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
