import { Test, TestingModule } from '@nestjs/testing';
import { TimescaleBenchmarkService } from './timescale-benchmark.service';
import { DataSource } from 'typeorm';

describe('TimescaleBenchmarkService', () => {
  let service: TimescaleBenchmarkService;
  let mockDs: Partial<DataSource>;

  beforeEach(async () => {
    mockDs = {
      query: jest.fn().mockResolvedValue([]),
      createQueryRunner: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue([{ counted: 0 }]),
        release: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimescaleBenchmarkService,
        { provide: DataSource, useValue: mockDs },
      ],
    }).compile();

    service = module.get<TimescaleBenchmarkService>(TimescaleBenchmarkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHypertableMetadata', () => {
    it('should return metadata info about hypertables', async () => {
      mockDs.query = jest.fn().mockResolvedValue([{ table_name: 'data_points' }]);
      const cqRunner = {
        query: jest.fn().mockResolvedValue([{ size_bytes: 1024 }, { size_bytes: 2048 }]),
        release: jest.fn(),
      };
      mockDs.createQueryRunner = jest.fn().mockReturnValue(cqRunner);

      const meta = await service.getHypertableMetadata();
      expect(meta).toHaveProperty('hypertables');
      expect(meta).toHaveProperty('dataSizeBytes');
    });
  });
});
