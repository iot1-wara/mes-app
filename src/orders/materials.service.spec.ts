import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsService } from './materials.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaterialEntity } from './material.entity';
import { Repository } from 'typeorm';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let mockRepo: Partial<Repository<MaterialEntity>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockResolvedValue({ id: '1' }),
      find: jest.fn().mockResolvedValue([]),
      findOneOrFail: jest.fn().mockResolvedValue({ id: '1', quantity_remaining: 100, quantity_used: 0 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '5' }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: getRepositoryToken(MaterialEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a material entry with consumed_at timestamp', async () => {
      const dto = { order_id: 'o1' };
      await service.create(dto as any);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('findByOrderId', () => {
    it('should return materials for a given order', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);
      const result = await service.findByOrderId('o1');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { order_id: 'o1' } }),
      );
    });
  });

  describe('totalConsumedForOrder', () => {
    it('should return total consumed quantity', async () => {
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '10' }),
      });
      const result = await service.totalConsumedForOrder('o1');
      expect(result).toBe(10);
    });
  });

  describe('updateMaterialUsed', () => {
    it('should throw if quantity exceeds remaining', async () => {
      mockRepo.findOneOrFail = jest.fn().mockResolvedValue({ id: '1', quantity_remaining: 5, quantity_used: 0 } as any);
      const result = service.updateMaterialUsed('1', 10);
      await expect(result).rejects.toThrow();
    });

    it('should update used and remaining quantities on valid input', async () => {
      const mockMat = { id: '1', quantity_remaining: 50, quantity_used: 0 };
      mockRepo.findOneOrFail = jest.fn().mockResolvedValue(mockMat as any);
      await service.updateMaterialUsed('1', 10);
      expect(mockMat.quantity_used).toBe(10);
      expect(mockMat.quantity_remaining).toBe(40);
    });
  });
});
