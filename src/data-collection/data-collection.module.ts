import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataPointEntity } from './data-point.entity';
import { DataCollectionService } from './data-collection.service';
import { TimescaleBenchmarkService } from './timescale-benchmark.service';
import { DataCollectionController } from './data-collection.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DataPointEntity])],
  controllers: [DataCollectionController],
  providers: [DataCollectionService, TimescaleBenchmarkService],
  exports: [DataCollectionService, TimescaleBenchmarkService],
})
export class DataCollectionModule {}
