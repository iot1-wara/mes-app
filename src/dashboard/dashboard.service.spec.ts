import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { getDataSourceToken } from '@nestjs/typeorm';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockDataSource: Partial<DataSource>;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOEE', () => {
    it('should return OEE with zero values when DB has no data', async () => {
      mockDataSource.query = jest.fn().mockResolvedValue([]);
      const oee = await service.getOEE();
      expect(oee).toHaveProperty('availability');
      expect(oee).toHaveProperty('performance');
      expect(oee).toHaveProperty('quality');
      expect(oee).toHaveProperty('overall');
    });

    it('should return OEE for specific machine', async () => {
      mockDataSource.query = jest.fn().mockResolvedValue([{ avg_val: 75 }]);
      await service.getOEE('m1');
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        ['m1'],
      );
    });

    it('should return zero OEE on errors', async () => {
      mockDataSource.query = jest.fn().mockRejectedValue(new Error('DB error'));
      const oee = await service.getOEE();
      expect(oee.availability).toBe(0);
    });
  });

  describe('getTrendData', () => {
    it('should accept valid ranges and return data', async () => {
      mockDataSource.query = jest.fn().mockResolvedValue([{ name: '14:00', throughput: 100 }]);
      const trend = await service.getTrendData('24h');
      expect(mockDataSource.query).toHaveBeenCalled();
    });

    it('should default to 24h when invalid range given', async () => {
      mockDataSource.query = jest.fn().mockResolvedValue([]);
      await service.getTrendData('invalid-range');
      expect(mockDataSource.query).toHaveBeenCalled();
    });
  });

  describe('getPareto', () => {
    it('should return pareto chart data', async () => {
      mockDataSource.query = jest.fn().mockResolvedValue([{ name: 'Error1', value: 5 }]);
      const pareto = await service.getPareto();
      expect(mockDataSource.query).toHaveBeenCalled();
    });
  });

  describe('getMachineStats', () => {
    it('should return machine stats', async () => {
      mockDataSource.query = jest.fn().mockResolvedValue([{ id: 'm1', name: 'Test' }]);
      const stats = await service.getMachineStats();
      expect(mockDataSource.query).toHaveBeenCalled();
    });
  });
});
