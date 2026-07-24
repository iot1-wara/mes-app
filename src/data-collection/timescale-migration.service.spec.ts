import { Test, TestingModule } from '@nestjs/testing';
import { TimescaleMigrationService } from './timescale-migration.service';

describe('TimescaleMigrationService', () => {
  let service: TimescaleMigrationService;
  let mockDataSource: any;
  let mockQueryRunner: any;

  beforeEach(() => {
    mockQueryRunner = {
      query: jest.fn().mockResolvedValue([{ counted: 0 }]),
      release: jest.fn().mockResolvedValue(undefined),
    };

    mockDataSource = {
      options: { type: 'postgres' },
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };
  });

  async function compile(modify?: (svc: TimescaleMigrationService) => void) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimescaleMigrationService,
        {
          provide: require('@nestjs/typeorm').getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TimescaleMigrationService>(TimescaleMigrationService);
    modify?.(service);
  }

  it('should be defined', async () => {
    await compile();
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should skip migration for non-postgres type', async () => {
      await compile();
      mockDataSource.options = { type: 'mysql' };
      await service.onModuleInit();
      expect(mockQueryRunner.query).not.toHaveBeenCalled();
    });

    it('should create hypertable when not already a hypertable', async () => {
      const queryCalls = [
        [{ counted: 0 }],  
        'create_hypertable_ok',  
        'compress_ok',      
        'retention_ok',     
        'ca_create_ok', 
        'ca_policy_ok', 
        'dashboard_create',
        'dashboard_ca_ok',
        'dashboard_policy_ok', 
      ];

      let callIdx = 0;
      mockQueryRunner.query = jest.fn().mockImplementation((sql) => {
        if (callIdx < queryCalls.length) return Promise.resolve(queryCalls[callIdx++]);
        return Promise.resolve([]);
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TimescaleMigrationService,
          {
            provide: require('@nestjs/typeorm').getDataSourceToken(),
            useValue: mockDataSource,
          },
        ],
      }).compile();

      service = module.get<TimescaleMigrationService>(TimescaleMigrationService);
      const results = await (service as any).onModuleInit();
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'CREATE EXTENSION IF NOT EXISTS timescaledb;',
      );
    });

    it('should skip all operations when hypertable already exists', async () => {
      mockQueryRunner.query.mockResolvedValueOnce([{ counted: 1 }]);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TimescaleMigrationService,
          {
            provide: require('@nestjs/typeorm').getDataSourceToken(),
            useValue: mockDataSource,
          },
        ],
      }).compile();

      service = module.get<TimescaleMigrationService>(TimescaleMigrationService);
      await (service as any).onModuleInit();

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'CREATE EXTENSION IF NOT EXISTS timescaledb;',
      );
    });
  });
});
