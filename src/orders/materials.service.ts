import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialEntity, CreateMaterialDto } from './material.dto';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(MaterialEntity)
    private readonly materialsRepo: Repository<MaterialEntity>,
  ) {}

  async create(dto: CreateMaterialDto): Promise<MaterialEntity> {
    const material = this.materialsRepo.create({ ...dto, consumed_at: new Date() });
    return this.materialsRepo.save(material);
  }

  async findByOrderId(orderId: string): Promise<MaterialEntity[]> {
    return this.materialsRepo.find({ where: { order_id: orderId }, order: { consumed_at: 'DESC' } });
  }

  async totalConsumedForOrder(orderId: string): Promise<number> {
    const result = await this.materialsRepo
      .createQueryBuilder('m')
      .select('SUM(m.quantity_used)', 'total')
      .where('m.order_id = :orderId', { orderId })
      .getRawOne();
    return parseInt(result?.total ?? '0', 10);
  }

  async updateMaterialUsed(materialId: string, qtyUsed: number): Promise<MaterialEntity> {
    const material = await this.materialsRepo.findOneOrFail({ where: { id: materialId } });
    
    if (qtyUsed > material.quantity_remaining) {
      throw new BadRequestException('Quantity exceeded remaining amount');
    }

    material.quantity_used += qtyUsed;
    material.quantity_remaining -= qtyUsed;

    return this.materialsRepo.save(material);
  }
}
