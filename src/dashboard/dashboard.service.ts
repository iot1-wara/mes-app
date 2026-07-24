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
    try {
      const where = machineId ? 'WHERE dp.machine_id = $1' : '';
      const params = machineId ? [machineId] : [];

      const availQry = await this.dataSource.query(
        `SELECT COUNT(DISTINCT date_trunc('minute', timestamp)) AS online_minutes
         FROM data_points dp ${where}`,
        params,
      );

      const perfQry = await this.dataSource.query(`
        SELECT AVG(value) AS avg_val FROM data_points dp ${where}
      `, params);

      const qualQry = await this.dataSource.query(`
        SELECT 
          COUNT(*) FILTER (WHERE quality = 'good') * 100.0 / NULLIF(COUNT(*), 0) AS rate
        FROM data_points dp ${where}
      `, params);

      const availability = parseFloat(availQry[0]?.online_minutes || '0');
      const performance = perfQry[0]?.avg_val != null ? Math.min(parseFloat(perfQry[0].avg_val), 100) : 95;
      const quality = parseFloat(qualQry[0]?.rate || '0');

      const overall = (availability / 1440 * performance / 100 * quality / 100) * 100;

      return {
        availability: Math.min(availability, 100),
        performance: Math.min(performance, 100),
        quality: Math.min(quality, 100),
        overall: isNaN(overall) ? 0 : parseFloat(overall.toFixed(1)),
      };
    } catch {
      return { availability: 0, performance: 0, quality: 0, overall: 0 };
    }
  }

  async getTrendData(range: string): Promise<any[]> {
    const validRanges = ['24h', '7d', '30d'];
      const rangeToHours: Record<string, string> = { '24h': '24 hours', '7d': '168 hours', '30d': '720 hours' };
      const actualRange = validRanges.includes(range) ? range : '24h';
      
      try {
        return this.dataSource.query(
          `SELECT 
            to_char(timestamp, 'HH24:00') AS name,
            COUNT(*)::int AS throughput,
            ROUND(AVG(CASE WHEN quality = 'good' THEN 100.0 ELSE 50.0 END))::int AS yield
          FROM data_points 
          WHERE timestamp >= now() - interval '${rangeToHours[actualRange] || rangeToHours['24h']}'
          GROUP BY to_char(timestamp, 'HH24:00')
          ORDER BY name`,
        );
    } catch (e) {
      console.error('[DashboardService] getTrendData error:', e);
      return [];
    }
  }

  async getPareto(): Promise<any[]> {
    try {
      return this.dataSource.query(`
        SELECT 
          error_category AS "name",
          GREATEST(SUM(duration_seconds / 60)::int, 0) AS "value"
        FROM machine_errors 
        WHERE created_at >= now() - interval '7 days'
        GROUP BY error_category 
        ORDER BY "value" DESC
      `);
    } catch {
      return [];
    }
  }

  async getMachineStats(): Promise<any[]> {
    try {
      return this.dataSource.query(`
        SELECT m.id, m.name, m.status,
          COUNT(dp.id) FILTER (WHERE dp.timestamp >= now() - interval '1 hour') AS recent_points,
          AVG(dp.value) FILTER (WHERE dp.timestamp >= now() - interval '1 hour') AS avg_value
        FROM machines m LEFT JOIN data_points dp ON m.id = dp.machine_id
        GROUP BY m.id, m.name, m.status
      `);
    } catch {
      return [];
    }
  }
}
