import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TimescaleMigrationService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (this.dataSource.options.type !== 'postgres') return;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.query(`SELECT 1`);

      // Check if TimescaleDB extension is available
      let tdbAvailable: boolean;
      try {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
        tdbAvailable = true;
      } catch (err: any) {
        if (err?.code === '0A000' || err?.message?.includes('timescaledb')) {
          console.log('[TimescaleDB] Extension not available — running in standard PostgreSQL mode');
          return;
        }
        throw err;
      }

      const [{ counted }] = await queryRunner.query(
        "SELECT COUNT(*) AS counted FROM timescaledb_information.hypertables WHERE table_name = 'data_points';",
      );

      if (counted === 0) {
        // Create hypertable with daily chunks
        await queryRunner.query(
          `SELECT create_hypertable('data_points', 'timestamp', chunk_time_interval := INTERVAL '1 day');`,
        );

        // Add compression for older data
        await queryRunner.query(`ALTER TABLE data_points SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'machine_id, node_id, quality',
          timescaledb.compress_chunk_time_interval = '7 days'
        );`);

        // Set retention policy: delete raw data after 90 days
        await queryRunner.query(
          `SELECT add_retention_policy('data_points', retention_period := INTERVAL '90 days');`,
        );

        // Create rollup to 1-minute/1-hour averages for long-term storage
        await this.createContinuousAggregate(queryRunner);

        // Create 5-min / 30-min rollups for dashboard aggregation
        await this.createDashboardAggregates(queryRunner);
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async createContinuousAggregate(qb: any): Promise<void> {
    // Hourly rollup (raw → 1h averages) with automatic refresh policy
    await qb.query(`CREATE MATERIALIZED VIEW IF NOT EXISTS data_points_hourly WITH (timescaledb.continuous) AS
      SELECT machine_id, node_id, quality, time_bucket('1 hour', timestamp) AS bucket,
             AVG(value) AS avg_value, MIN(value) AS min_value, MAX(value) AS max_value,
             COUNT(*) AS point_count
      FROM data_points
      GROUP BY machine_id, node_id, quality, time_bucket('1 hour', timestamp);`);

    // Automatic refresh: fill 3 hours before now, every hour
    await qb.query(`SELECT add_continuous_aggregate_policy('data_points_hourly',
        start_offset := INTERVAL '3 hours',
        end_offset := INTERVAL NULL,
        schedule_interval := INTERVAL '1 hour');`);
  }

  private async createDashboardAggregates(qb: any): Promise<void> {
    // 5-min rollup for dashboard queries (aggregated from hourly view)
    await qb.query(`CREATE MATERIALIZED VIEW IF NOT EXISTS data_points_dashboard WITH (timescaledb.continuous) AS
      SELECT machine_id, node_id, quality, time_bucket('5 minutes', bucket) AS bucket_5min,
             AVG(avg_value) AS value, MIN(min_value) AS min_val, MAX(max_value) AS max_val,
             SUM(point_count) AS total_points
      FROM data_points_hourly
      GROUP BY machine_id, node_id, quality, time_bucket('5 minutes', bucket);`);

    // Refresh every 30 minutes for dashboard readiness
    await qb.query(`SELECT add_continuous_aggregate_policy('data_points_dashboard',
        start_offset := INTERVAL '1 hour',
        end_offset := INTERVAL NULL,
        schedule_interval := INTERVAL '30 minutes');`);
  }
}
