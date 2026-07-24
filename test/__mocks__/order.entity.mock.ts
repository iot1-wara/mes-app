import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { MaterialEntity as RealMaterialEntity } from '../../src/materials/material.entity';

@Entity('orders')
@Index(['machine_id'])
@Index(['status'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column()
  machine_id!: string;

  @Column()
  operation!: string;

  @Column({ default: 'pending' })
  status!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ type: 'int', default: 0 })
  completed_quantity!: number;

  @OneToMany(() => RealMaterialEntity, (mat) => mat.order)
  materials!: RealMaterialEntity[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
