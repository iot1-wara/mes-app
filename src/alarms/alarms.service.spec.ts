import { Test, TestingModule } from '@nestjs/testing';
import { AlarmsService } from './alarms.service';
import { AlarmEntity } from './alarm.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('AlarmsService', () => {
  let service: AlarmsService;
  let mockRepo: Partial<Repository<AlarmEntity>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((alarm) => Promise.resolve({ id: '1', ...alarm })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn().mockResolvedValue(5),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmsService,
        {
          provide: getRepositoryToken(AlarmEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AlarmsService>(AlarmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an alarm', async () => {
      const dto = { severity: 'critical' as any, machine_id: 'm1', message: 'Test', source: 'test' };
      const result = await service.create(dto);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.id).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all alarms', async () => {
      const result = await service.findAll();
      expect(result).toEqual([]);
      expect(mockRepo.find).toHaveBeenCalledWith({ order: { created_at: 'DESC' } });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Alarm not found');
    });

    it('should return alarm when found', async () => {
      const alarm = { id: '1', name: 'Test' } as any;
      mockRepo.findOne = jest.fn().mockResolvedValue(alarm);
      const result = await service.findOne('1');
      expect(result).toBe(alarm);
    });
  });

  describe('acknowledge', () => {
    it('should set acknowledged and acknowledged_at', async () => {
      const alarm = { id: '1', acknowledged: false, acknowledged_at: null } as any;
      mockRepo.findOne = jest.fn().mockResolvedValue(alarm);
      mockRepo.save = jest.fn().mockResolvedValue(alarm);
      const result = await service.acknowledge('1');
      expect(result.acknowledged).toBe(true);
      expect(await result.acknowledged_at).toBeInstanceOf(Date);
    });
  });

  describe('setActiveCount', () => {
    it('should count unacknowledged alarms', async () => {
      mockRepo.count = jest.fn().mockResolvedValue(3);
      const result = await service.setActiveCount();
      expect(result).toBe(3);
      expect(mockRepo.count).toHaveBeenCalledWith({ where: { acknowledged: false } });
    });
  });

  describe('bulkAcknowledge', () => {
    it('should bulk update alarms', async () => {
      mockRepo.update = jest.fn().mockResolvedValue({ affected: 2 });
      const result = await service.bulkAcknowledge(['1', '2']);
      expect(result).toBe(2);
    });
  });

  describe('exportCsv', () => {
    it('should return CSV string', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([
        { id: '1', severity: 'critical' as any, machine_id: 'm1', message: 'test', source: 's', acknowledged: false, acknowledged_at: null, created_at: new Date('2026-01-01') },
      ]);
      const csv = await service.exportCsv();
      expect(csv).toContain('ID');
      expect(csv).toContain('critical');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException for non-existing alarm', async () => {
      mockRepo.delete = jest.fn().mockResolvedValue({ affected: 0 });
      await expect(service.remove('nonexistent')).rejects.toThrow('Alarm not found');
    });

    it('should delete successfully', async () => {
      mockRepo.delete = jest.fn().mockResolvedValue({ affected: 1 });
      await expect(service.remove('1')).resolves.toBeUndefined();
    });
  });
});
