export class MaterialEntity {
  id!: string;
  name!: string;
  material_lot!: string;
  quantity_used!: number;
  quantity_remaining!: number;
  order_id!: string;
  consumed_at!: Date;
}

export class CreateMaterialDto {
  name!: string;
  material_lot?: string;
  quantity_used!: number;
  quantity_remaining!: number;
  order_id!: string;
}
