import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { OrderEntity } from './order.entity';
import type { CreateOrderDto, UpdateOrderDto } from './order.dto';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'on_hold', 'cancelled'],
  on_hold: ['in_progress'],
  completed: [],
  cancelled: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepo: Repository<OrderEntity>,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderEntity> {
    const order = this.ordersRepo.create({
      name: dto.name,
      priority: dto.priority,
      machine_id: dto.machine_id,
      operation: dto.operation,
      quantity: dto.quantity,
      start_time: dto.start_time,
      target_complete_time: dto.target_complete_time,
    });
    return this.ordersRepo.save(order);
  }

  async findAll(status?: string): Promise<OrderEntity[]> {
    const where = status ? { status } : {};
    return this.ordersRepo.find({ 
      where, 
      order: { created_at: 'DESC' },
      relations: ['materials']
    });
  }

  async findOne(id: string): Promise<OrderEntity> {
    const order = await this.ordersRepo.findOne({ 
      where: { id },
      relations: ['materials']
    });
    if (!order) throw new BadRequestException('Order not found');
    return order;
  }

  private validateTransition(currentStatus: string, newStatus: string): void {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ')}`
      );
    }
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderEntity> {
    const order = await this.findOne(id);
    
    if (dto.status && dto.status !== order.status) {
      this.validateTransition(order.status, dto.status);
      
      // Set SPS flags during transitions
      if (dto.status === 'in_progress') {
        order.start_time = new Date();
        order.sps_flag_udi_on = true;
      } else if (dto.status === 'completed') {
        order.end_time = new Date();
        order.completed_quantity = order.quantity;
        order.sps_flags = {
          uiOPos: true,
          uiOpNo: false,
        };
      } else if (dto.status === 'cancelled') {
        order.end_time = new Date();
        order.sps_flags = {
          udiONo: true,
        };
      }
    }

    Object.assign(order, dto);
    return this.ordersRepo.save(order);
  }

  async changeStatus(id: string, newStatus: string): Promise<OrderEntity> {
    const order = await this.findOne(id);
    this.validateTransition(order.status, newStatus);
    
    if (newStatus === 'in_progress') {
      order.start_time = new Date();
      order.sps_flag_udi_on = true;
    } else if (newStatus === 'completed') {
      order.end_time = new Date();
      order.completed_quantity = order.quantity;
      order.sps_flags = { uiOPos: true, uiOpNo: false };
    } else if (newStatus === 'cancelled') {
      order.end_time = new Date();
      order.sps_flags = { udiONo: true };
    } else if (newStatus === 'on_hold') {
      order.sps_flags = { ...order.sps_flags, uiOPos: false };
    }

    order.status = newStatus as OrderEntity['status'];
    return this.ordersRepo.save(order);
  }

  async remove(id: string): Promise<void> {
    const result = await this.ordersRepo.delete(id);
    if (result.affected === 0) throw new BadRequestException('Order not found');
  }

  async updateProgress(id: string, completedQty: number): Promise<OrderEntity> {
    const order = await this.findOne(id);
    order.completed_quantity = Math.min(completedQty, order.quantity);
    
    if (order.completed_quantity >= order.quantity && order.status === 'in_progress') {
      order.status = 'completed';
      order.end_time = new Date();
      order.sps_flags = { uiOPos: true, uiOpNo: false };
    }

    return this.ordersRepo.save(order);
  }

  async advanceStep(id: string): Promise<OrderEntity> {
    const order = await this.findOne(id);
    if (order.status !== 'in_progress') {
      throw new BadRequestException('Only in-progress orders can be advanced');
    }
    order.next_step_no = (order.next_step_no ?? 0) + 1;
    return this.ordersRepo.save(order);
  }

  async getPendingByLine(machineId: string): Promise<OrderEntity[]> {
    return this.ordersRepo.find({ 
      where: { machine_id: machineId, status: 'pending' }, 
      order: { priority: 'DESC', created_at: 'ASC' } 
    });
  }

  async getActiveOrders(): Promise<OrderEntity[]> {
    return this.ordersRepo.find({ 
      where: { status: In(['in_progress', 'on_hold']) }, 
      order: { priority: 'DESC', created_at: 'ASC' } 
    });
  }

  async getOrderStats(): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    on_hold: number;
    yieldRate: number;
  }> {
    const [total, ...statuses] = await this.ordersRepo
      .createQueryBuilder('o')
      .select([
        'COUNT(*) FILTER (WHERE status = \'pending\')',
        "COUNT(*) FILTER (WHERE status = 'in_progress')",
        "COUNT(*) FILTER (WHERE status = 'completed')",
        "COUNT(*) FILTER (WHERE status = 'cancelled')",
        "COUNT(*) FILTER (WHERE status = 'on_hold')",
      ])
      .getRawMany();

    return {
      total,
      pending: parseInt(statuses[0] ?? '0', 10),
      in_progress: parseInt(statuses[1] ?? '0', 10),
      completed: parseInt(statuses[2] ?? '0', 10),
      cancelled: parseInt(statuses[3] ?? '0', 10),
      on_hold: parseInt(statuses[4] ?? '0', 10),
      yieldRate: total > 0 ? parseFloat(((statuses[2] / total) * 100).toFixed(2)) : 0,
    };
  }
}
