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
      // Ensure TimescaleDB extension is installed
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);

      // Check if data_points is already a hypertable
      const [{ counted }] = await queryRunner.query(
        "SELECT COUNT(*) AS counted FROM timescaledb_information.hypertables WHERE table_name = 'data_points';",
      );

      if (counted === 0) {
        // Create hypertable with daily chunks
        await queryRunner.query(
          `SELECT create_hypertable('data_points', 'timestamp', chunk_time_interval := INTERVAL '1 day', if_not_exists := TRUE);`,
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

        // Create rollup to 1-minute averages every hour for long-term storage
        await this.createContinuousAggregate(queryRunner);
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async createContinuousAggregate(qb: any): Promise<void> {
    // Create a continuous aggregate with TimescaleDB's policy for automatic refresh
    await qb.query(`CREATE MATERIALIZED VIEW IF NOT EXISTS data_points_hourly WITH (timescaledb.continuous) AS
      SELECT machine_id, node_id, quality, time_bucket('1 hour', timestamp) AS bucket,
             AVG(value) AS avg_value, MIN(value) AS min_value, MAX(value) AS max_value,
             COUNT(*) AS point_count
      FROM data_points
      GROUP BY machine_id, node_id, quality, time_bucket('1 hour', timestamp);`);

    // Set refresh policy for the continuous aggregate
    await qb.query(`SELECT add_continuous_aggregate_policy('data_points_hourly',
        start_offset := INTERVAL '3 hours',
        end_offset := INTERVAL NULL,
        schedule_interval := INTERVAL '1 hour');`);
  }
}
