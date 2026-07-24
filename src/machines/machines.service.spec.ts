import { Test, TestingModule } from '@nestjs/testing';
import { MachinesService } from './machines.service';
import { MachineEntity, MachineStatusEnum } from './machine.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('MachinesService', () => {
  let service: MachinesService;
  let mockRepo: Partial<Repository<MachineEntity>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockImplementation((machine) => Promise.resolve({ id: '1', ...machine })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachinesService,
        {
          provide: getRepositoryToken(MachineEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<MachinesService>(MachinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a machine', async () => {
      const dto = { name: 'CNC-1', status: MachineStatusEnum.ONLINE as any, type: 'cnc', location: 'Hall-A' };
      const result = await service.create(dto);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.id).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all machines ordered by name', async () => {
      await service.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Machine not found');
    });

    it('should return a machine when found', async () => {
      const machine = { id: '1', name: 'CNC-1' };
      mockRepo.findOne = jest.fn().mockResolvedValue(machine);
      const result = await service.findOne('1');
      expect(result).toBe(machine);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepo.delete = jest.fn().mockResolvedValue({ affected: 0 });
      await expect(service.remove('nonexistent')).rejects.toThrow('Machine not found');
    });

    it('should delete successfully', async () => {
      mockRepo.delete = jest.fn().mockResolvedValue({ affected: 1 });
      await expect(service.remove('1')).resolves.toBeUndefined();
    });
  });

  describe('findOnline', () => {
    it('should return only online machines', async () => {
      await service.findOnline();
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { status: MachineStatusEnum.ONLINE }, order: { name: 'ASC' } });
    });
  });

  describe('findByLocation', () => {
    it('should return machines at given location', async () => {
      await service.findByLocation('Hall-A');
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { location: 'Hall-A' }, order: { name: 'ASC' } });
    });
  });

  describe('getCsvTemplate', () => {
    it('should return CSV template string', () => {
      const csv = service.getCsvTemplate();
      expect(csv).toContain('name,status,type,location');
    });
  });

  describe('importCsv', () => {
    it('should throw error for missing mandatory column', async () => {
      const csv = 'wrong_col,other\ntest,value\n';
      await expect(service.importCsv(Buffer.from(csv))).rejects.toThrow(
        "CSV required columns: name",
      );
    });

    it('should import machines from valid CSV', async () => {
      const csv = 'name,status,type,location\nCNC-1,online,cnc,Hall-A\n';
      const result = await service.importCsv(Buffer.from(csv));
      expect(result.imported).toBe(1);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should handle import with errors gracefully', async () => {
      const csv = 'name,status,type,location\nCNC-1,online,cnc,Hall-A\ntest,,,\n';
      const result = await service.importCsv(Buffer.from(csv));
      expect(typeof result.imported).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
