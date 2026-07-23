import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getOEE(machineId?: string): Promise<{ 
    availability: number; 
    performance: number; 
    quality: number; 
    overall: number;
  }> {
    const where = machineId ? 'WHERE dp.machine_id = $1' : '';
    const params = machineId ? [machineId] : [];

    // Availability: online minutes / planned minutes (last 24h)
    const availQry = await this.dataSource.query(
      `SELECT COUNT(DISTINCT date_trunc('minute', ts)) AS online_minutes
       FROM data_points dp ${where}`,
      params,
    );

    // Performance: actual avg value vs theoretical max (use avg value as proxy)
    const perfQry = await this.dataSource.query(`
      SELECT AVG(value) AS avg_val FROM data_points dp ${where}
    `, params);

    // Quality: good / total ratio using the continuous aggregate view
    const qualQry = await this.dataSource.query(`
      SELECT 
        COUNT(*) FILTER (WHERE quality = 'good') * 100.0 / NULLIF(COUNT(*), 0) AS rate
      FROM data_points dp ${where}
    `, params);

    const availability = parseFloat(availQry[0]?.online_minutes || '0');
    const performance = perfQry[0]?.avg_val != null ? Math.min(parseFloat(perfQry[0].avg_val), 100) : 95;
    const quality = parseFloat(qualQry[0]?.rate || '0');
    
    // OEE = Availability * Performance * Quality (all as fractions then back to %)
    const overall = (availability / 1440 * performance / 100 * quality / 100) * 100;

    return {
      availability: Math.min(availability, 100),
      performance: Math.min(performance, 100),
      quality: Math.min(quality, 100),
      overall: isNaN(overall) ? 0 : parseFloat(overall.toFixed(1)),
    };
  }

  async getTrendData(range: string): Promise<any[]> {
    const intervalMap = {
      '24h': { bucket: "'1 hour'::interval", format: null },
      '7d': { bucket: "'6 hours'::interval", format: null },
      '30d': { bucket: "'1 day'::interval", format: null },
    };

    const cfg = intervalMap[range] || intervalMap['24h'];

    return this.dataSource.query(`
      SELECT 
        to_char(time_bucket(${cfg.bucket}, timestamp), 'HH24:00') AS name,
        COUNT(*)::int AS throughput,
        ROUND(AVG(CASE WHEN quality = 'good' THEN 100.0 ELSE 50.0 END))::int AS yield
      FROM data_points WHERE timestamp >= now() - interval '${range}'
      GROUP BY time_bucket(${cfg.bucket}, timestamp)
      ORDER BY name
    `);
  }

  async getPareto(): Promise<any[]> {
    return this.dataSource.query(`
      SELECT 
        error_category AS "name",
        GREATEST(SUM(duration_seconds / 60)::int, 0) AS "value"
      FROM machine_errors 
      WHERE created_at >= now() - interval '7 days'
      GROUP BY error_category 
      ORDER BY "value" DESC
    `);
  }

  async getMachineStats(): Promise<any[]> {
    return this.dataSource.query(`
      SELECT m.id, m.name, m.status,
        COUNT(dp.id) FILTER (WHERE dp.timestamp >= now() - interval '1 hour') AS recent_points,
        AVG(dp.value) FILTER (WHERE dp.timestamp >= now() - interval '1 hour') AS avg_value
      FROM machines m LEFT JOIN data_points dp ON m.id = dp.machine_id
      GROUP BY m.id, m.name, m.status
    `);
  }
}
