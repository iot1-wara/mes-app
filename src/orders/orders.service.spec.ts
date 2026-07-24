import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './order.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockRepo: Partial<Repository<any>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockImplementation((order) => Promise.resolve({ id: '1', ...order })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([5, 2, 1, 0, 1]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an order', async () => {
      const dto = { name: 'Order-1', quantity: 100 };
      const result = await service.create(dto);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.id).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all orders without status filter', async () => {
      await service.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { created_at: 'DESC' } }),
      );
    });

    it('should filter by valid status', async () => {
      const result = await service.findAll('pending');
      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockRepo.find = jest.fn().mockRejectedValue(new Error('DB error'));
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('changeStatus', () => {
    it('should transition from pending to in_progress', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1', status: 'pending' });
      const result = await service.changeStatus('1', 'in_progress');
      expect(result.status).toBe('in_progress');
    });

    it('should throw for invalid transition', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1', status: 'completed' });
      await expect(service.changeStatus('1', 'pending')).rejects.toThrow(/Cannot transition/);
    });

    it('should handle on_hold transition', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1', status: 'in_progress' });
      const result = await service.changeStatus('1', 'on_hold');
      expect(result.status).toBe('on_hold');
    });
  });

  describe('getOrderStats', () => {
    it('should return order statistics', async () => {
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([5, 2, 1, 0, 1]),
      });
      const stats = await service.getOrderStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('yieldRate');
    });
  });

  describe('advanceStep', () => {
    it('should advance the next step number', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1', status: 'in_progress' });
      mockRepo.save = jest.fn().mockImplementation((o) => Promise.resolve({ ...o, next_step_no: 2 }));
      const result = await service.advanceStep('1');
      expect(result.next_step_no).toBe(2);
    });

    it('should throw if order is not in_progress', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1', status: 'completed' });
      await expect(service.advanceStep('1')).rejects.toThrow(/Only in-progress orders can be advanced/);
    });
  });

  describe('updateProgress', () => {
    it('should update completed quantity and auto-complete if done', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1', status: 'in_progress', quantity: 10, completed_quantity: 5 });
      mockRepo.save = jest.fn().mockImplementation((o) => Promise.resolve({ ...o }));
      const result = await service.updateProgress('1', 20);
      expect(result.status).toBe('completed');
    });
  });

  describe('getActiveOrders', () => {
    it('should return active orders', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);
      const result = await service.getActiveOrders();
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('getPendingByLine', () => {
    it('should return pending orders for a machine', async () => {
      await service.getPendingByLine('m1');
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { machine_id: 'm1', status: 'pending' },
        order: { priority: 'DESC', created_at: 'ASC' },
      });
    });
  });
});
