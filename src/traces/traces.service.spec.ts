import { Test, TestingModule } from '@nestjs/testing';
import { TracesService } from './traces.service';
import { TraceEntity } from './trace.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('TracesService', () => {
  let service: TracesService;
  let mockRepo: Partial<Repository<TraceEntity>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockResolvedValue({ id: '1', ...{ machine_id: 'm1' } }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TracesService,
        {
          provide: getRepositoryToken(TraceEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<TracesService>(TracesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a trace', async () => {
      const dto = { machine_id: 'm1', category: 'process_data', key_data_point: 'temp', value: 42 };
      const result = await service.create(dto);
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.id).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should accept all filter options', async () => {
      await service.findAll({ machine_id: 'm1', category: 'process_data', key_data_point: 'temp', value_min: 0, value_max: 100 });
      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should return empty array when no filters match', async () => {
      const result = await service.findAll({});
      expect(result.length).toBe(0);
    });

    it('should order results by collected_at DESC', async () => {
      await service.findAll({ value_min: 1, take: 50 });
      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Trace not found');
    });

    it('should find by id', async () => {
      const trace = { id: '1', machine_id: 'm1' };
      mockRepo.findOne = jest.fn().mockResolvedValue(trace);
      const result = await service.findOne('1');
      expect(result).toBe(trace);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple traces', async () => {
      const dto = [{ machine_id: 'm1' }, { machine_id: 'm2' }];
      mockRepo.save = jest.fn().mockResolvedValue([{}, {}]);
      const result = await service.bulkCreate(dto);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTracesByMachine', () => {
    it('should return traces filtered by machine', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);
      await service.getTracesByMachine('m1');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { machine_id: 'm1' } }),
      );
    });
  });

  describe('getTracesByOrder', () => {
    it('should return traces filtered by order id', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);
      await service.getTracesByOrder('o1');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { order_id: 'o1' } }),
      );
    });
  });

  describe('getTracesByCategory', () => {
    it('should return traces for given category', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);
      await service.getTracesByCategory('quality');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { category: 'quality' } }),
      );
    });
  });
});
