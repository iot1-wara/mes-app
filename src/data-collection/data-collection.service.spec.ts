import { Test, TestingModule } from '@nestjs/testing';
import { DataCollectionService } from './data-collection.service';
import { DataPointEntity } from './data-point.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('DataCollectionService', () => {
  let service: DataCollectionService;
  let mockRepo: Partial<Repository<DataPointEntity>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockResolvedValue({ id: '1', machine_id: '', node_id: '', value: 0, quality: 'good', collected_at: new Date() }),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      query: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({}),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataCollectionService,
        {
          provide: getRepositoryToken(DataPointEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<DataCollectionService>(DataCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a data point', async () => {
      const dto = { machine_id: 'm1', node_id: 'n1', value: 42.0, quality: 'good' };
      const result = await service.create(dto);
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.id).toBeDefined();
    });

    it('should set default quality to good', async () => {
      const dto = { machine_id: 'm1', node_id: 'n1', value: 42.0 };
      await service.create(dto);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ quality: 'good' }));
    });
  });

  describe('findAll', () => {
    it('should query by machine id and node id', async () => {
      await service.findAll('m1', 'n1');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { machine_id: 'm1', node_id: 'n1' }, take: 100 }),
      );
    });

    it('should work with just machine id', async () => {
      await service.findAll('m1');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { machine_id: 'm1' }, take: 100 }),
      );
    });
  });

  describe('findByTimeRange', () => {
    it('should query by date range', async () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-02');
      await service.findByTimeRange('m1', start, end);
      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple data points', async () => {
      const dto = [{ machine_id: 'm1', node_id: 'n1', value: 1.0 }];
      mockRepo.save = jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]);
      const result = await service.bulkCreate(dto);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('getStatsByMachine', () => {
    it('should return min, max, avg, count stats', async () => {
      const qbBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          'MIN(dp5.value)': 10,
          'MAX(dp5.value)': 100,
          'AVG(dp5.value)': 55,
          'COUNT(dp5.id)': '42',
        }),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(qbBuilder);

      const stats = await service.getStatsByMachine('m1');
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(100);
      expect(stats.avg).toBe(55);
      expect(stats.count).toBe(42);
    });
  });

  describe('getLatestByMachine', () => {
    it('should return latest data points per node', async () => {
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getQuery: jest.fn().mockReturnValue('SELECT 1'),
        getMany: jest.fn().mockResolvedValue([{ node_id: 'n1' }]),
      });
      const result = await service.getLatestByMachine('m1');
      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
