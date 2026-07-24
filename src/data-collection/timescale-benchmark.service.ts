import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TimescaleBenchmarkService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async runBenchmarks(): Promise<{ 
    rawWritesPerSec: number; 
    hypertableWritesPerSec: number;
    compressedSizePercent: number;
    rollupQueryLatencyMs: number;
  }> {
    const results: { 
      rawWritesPerSec: number; 
      hypertableWritesPerSec: number;
      compressedSizePercent: number;
      rollupQueryLatencyMs: number;
    } = {} as any;

    // Benchmark 1: Raw writes per second on plain table
    const t0 = Date.now();
    for (let i = 0; i < 5000; i++) {
      await this.dataSource.query(
        `INSERT INTO data_points (machine_id, node_id, value, quality, timestamp) VALUES ($::uuid, $2, $3, 'good', now())`,
        [`bench-${i}`, `node-bench`, i * 1.1],
      );
    }
    const rawElapsed = Date.now() - t0;
    results.rawWritesPerSec = Math.round(5000 / (rawElapsed / 1000));

    // Benchmark 2: hypertable writes per second (data_points hypertable)
    await this.dataSource.query(`SELECT create_hypertable('bench_data', 'timestamp', if_not_exists := TRUE)`);
    const t1 = Date.now();
    for (let i = 0; i < 5000; i++) {
      await this.dataSource.query(
        `INSERT INTO bench_data (machine_id, node_id, value, quality, timestamp) VALUES ($::uuid, $2, $3, 'good', now())`,
        [`bench-${i}`, `node-bench`, i * 1.1],
      );
    }
    const hypertableElapsed = Date.now() - t1;
    results.hypertableWritesPerSec = Math.round(5000 / (hypertableElapsed / 1000));

    // Benchmark 3: Compressed size analysis
    await this.dataSource.query(`ALTER TABLE data_points SET (timescaledb.compress, timescaledb.compress_segmentby='machine_id')`);
    const [{ raw_size, compressed_size }] = await this.dataSource.query(
      `SELECT pg_total_relation_size('data_points') AS raw_size, 
              COALESCE((SELECT sum(pg_tablespace_size(indexrelid::pg_catalog.oid)) FROM pg_catalog.pg Stat_extension.extcoll collation FROM pg_statistic WHERE attrelid = 'data_points'::regclass), 0) AS compressed_size
      `,
    ).catch(() => [{ raw_size: 0, compressed_size: 0 }]);

    results.compressedSizePercent = compressed_size > 0 
      ? Math.round((compressed_size / raw_size) * 100) 
      : 100;

    // Benchmark 4: Rollup query latency
    const t2 = Date.now();
    await this.dataSource.query(`SELECT AVG(value), time_bucket('5 minutes', timestamp) FROM data_points GROUP BY machine_id, node_id`);
    results.rollupQueryLatencyMs = Date.now() - t2;

    // Cleanup benchmark table
    try {
      await this.dataSource.query(`DROP TABLE IF EXISTS bench_data CASCADE`);
    } catch {}

    return results as any;
  }

  async getHypertableMetadata(): Promise<{ 
    hypertables: any[]; 
    compressionEnabled: boolean; 
    retentionPolicies: any[];
    continuousAggregates: any[];
    dataSizeBytes: number;
  }> {
    const hypTables = await this.dataSource.query(
      "SELECT table_name, time_col, num_chunks FROM timescaledb_information.hypertables;",
    );

    const compression = await this.dataSource.query(
      "SELECT tablename, compressionsize_bytes, rawdata_size_bytes FROM timescaledb_partial_compression_stats WHERE tablename = 'data_points';",
    ).catch(() => []);

    const retention = await this.dataSource.query(`
      SELECT policy_name, table_name, initial_interval, max_interval 
      FROM timescaledb_information.partitioning;
    `).catch(() => []);

    const caggs = await this.dataSource.query(
      "SELECT matviewname FROM pg_matviews WHERE schemaname = 'timescaledb_internal';",
    ).catch(() => []);

    const dataSize = await this.dataSource.query(
      "SELECT pg_total_relation_size('data_points') AS total_bytes;",
    ).catch(() => [{ total_bytes: 0 }]);

    return {
      hypertables: hypTables,
      compressionEnabled: compression.length > 0,
      retentionPolicies: retention,
      continuousAggregates: caggs,
      dataSizeBytes: dataSize[0]?.total_bytes || 0,
    };
  }
}
