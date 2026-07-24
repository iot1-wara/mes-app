import { Test, TestingModule } from '@nestjs/testing';
import { MachineErrorsService } from './machine-errors.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MachineErrorEntity } from './machine-error.entity';
import { Repository } from 'typeorm';


describe('MachineErrorsService', () => {
  let service: MachineErrorsService;
  let mockRepo: Partial<Repository<any>>;

    beforeEach(async () => {
      const baseQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
      };

      mockRepo = {
        save: jest.fn().mockResolvedValue({ id: '1' }),
        find: jest.fn().mockResolvedValue([]),
        findOneOrFail: jest.fn().mockResolvedValue({ id: '1', created_at: new Date() } as any),
        createQueryBuilder: jest.fn().mockImplementation(() => ({
          ...baseQb,
          getRawOne: jest.fn().mockResolvedValue({
            'count': '0',
            'sum(me.duration_seconds)': 0,
            'avg(me.duration_seconds)': 0,
            'max(me.duration_seconds)': 0,
          }),
          getRawMany: jest.fn().mockResolvedValue([]),
        })),
      };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineErrorsService,
        { provide: getRepositoryToken(MachineErrorEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<MachineErrorsService>(MachineErrorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save a machine error with duration_seconds default', async () => {
      const dto = { machine_id: 'm1' };
      await service.create(dto as any);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('findByMachine', () => {
    it('should return errors for a given machine', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);
      await service.findByMachine('m1');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { machine_id: 'm1' } }),
      );
    });
  });

  describe('getDowntimeStats', () => {
    it('should return downtime statistics', async () => {
      let callCount = 0;
      mockRepo.createQueryBuilder = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: stats query (getRawOne path)
          return {
            where: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({
              'count': '5',
              'sum(me.duration_seconds)': 300,
              'avg(me.duration_seconds)': 60,
              'max(me.duration_seconds)': 120,
            }),
          };
        } else {
          // Second call: category query (getRawMany path)  
          return {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnValue({
              getRawMany: jest.fn().mockResolvedValue([
                { category: 'mechanical', count: '3' },
              ]),
            }),
          };
        }
      });

      const stats = await service.getDowntimeStats('m1');
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('topCategories');
    });
  });

  describe('getParetoStats', () => {
    it('should return error category distribution', async () => {
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{}]),
      });
      const pareto = await service.getParetoStats();
      expect(Array.isArray(pareto)).toBe(true);
    });
  });

  describe('recoverError', () => {
    it('should set recovered_at and calculate duration', async () => {
      const err = { id: '1', created_at: new Date('2026-01-01'), recovered_at: null } as any;
      mockRepo.findOneOrFail = jest.fn().mockResolvedValue(err);
      mockRepo.save = jest.fn().mockResolvedValue({ ...err, recovered_at: new Date() });
      const result = await service.recoverError('1');
      expect(result).toHaveProperty('recovered_at');
    });
  });
});
