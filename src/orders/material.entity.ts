import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { OrderEntity } from './order.entity';

@Entity('materials')
export class MaterialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  material_lot?: string;

  @Column({ type: 'int', default: 0 })
  quantity_used!: number;

  @Column({ type: 'int', default: 0 })
  quantity_remaining!: number;

  @ManyToOne(() => OrderEntity, (order) => order.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity;

  @Column()
  order_id!: string;

  @CreateDateColumn()
  consumed_at!: Date;
}

export class CreateMaterialDto {
  name!: string;
  material_lot?: string;
  quantity_used!: number;
  quantity_remaining!: number;
  order_id!: string;
}
