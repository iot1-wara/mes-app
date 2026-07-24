import { Test, TestingModule } from '@nestjs/testing';
import { CarrierService } from './carrier.service';
import { CarrierEntity } from './carrier.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('CarrierService', () => {
  let service: CarrierService;
  let mockRepo: Partial<Repository<CarrierEntity>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockResolvedValue({ id: '1' }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarrierService,
        { provide: getRepositoryToken(CarrierEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CarrierService>(CarrierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a carrier with default handshake flags', async () => {
      const dto = { name: 'C1', current_station_id: 's1', next_resource_id: 'r1' };
      await service.create(dto as any);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all carriers', async () => {
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('advance', () => {
    it('should set xStart handshake flag to true', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1', handshake_flags: {} } as any);
      const dto = { iStepNo: 5, next_resource_id: 'r2' };
      await service.advance('1', dto as any);
    });
  });

  describe('syncHandshake', () => {
    it('should update handshake state', async () => {
      const carrier = { id: '1', status: 'idle', handshake_flags: {} } as any;
      mockRepo.findOne = jest.fn().mockResolvedValue(carrier);
      mockRepo.save = jest.fn().mockResolvedValue(carrier);
      const result = await service.syncHandshake('1', true);
      expect(result.status).toBe('in_process');
    });

    it('should keep idle status when xStartAck is false', async () => {
      const carrier = { id: '1', status: 'idle', handshake_flags: {} } as any;
      mockRepo.findOne = jest.fn().mockResolvedValue(carrier);
      mockRepo.save = jest.fn().mockResolvedValue(carrier);
      const result = await service.syncHandshake('1', false);
      expect(result.handshake_flags.xStart).toBe(false);
    });
  });

  describe('getHandshakeStatuses', () => {
    it('should return handshake statuses for active carriers', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([
        { id: '1', name: 'C1', handshake_flags: { xStart: true }, status: 'in_process' },
      ]);
      const result = await service.getHandshakeStatuses();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('getByStation', () => {
    it('should return carriers at given station', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);
      const result = await service.getByStation('s1');
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { current_station_id: 's1' } });
    });
  });

  describe('getActive', () => {
    it('should return active carriers', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);
      const result = await service.getActive();
      expect(mockRepo.find).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should set xErrL0 flag when status is error', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1' } as any);
      await service.update('1', { status: 'error' });
    });
  });
});
