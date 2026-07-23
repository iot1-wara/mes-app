import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { AlarmsModule } from './alarms/alarms.module';
import { MachinesModule } from './machines/machines.module';
import { OrdersModule } from './orders/orders.module';
import { TracesModule } from './traces/traces.module';
import { DataCollectionModule } from './data-collection/data-collection.module';
import { EdgeGatewayModule } from './opcua/edge-gateway.module';
import { OpcUaModule } from './opcua/opcua.module';
import { AuthModule } from './auth/auth.module';
import { EventBusModule } from './events/event-gateway.module';
import { UserEntity } from './auth/user.entity';

@Injectable()
export class TimescaleMigrationService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (this.dataSource.options.type !== 'postgres') return;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);

      const [{ counted }] = await queryRunner.query(
        "SELECT COUNT(*) AS counted FROM timescaledb_information.hypertables WHERE table_name = 'data_points';",
      );

      if (counted === 0) {
        await queryRunner.query(
          `SELECT create_hypertable('data_points', 'timestamp', chunk_time_interval := INTERVAL '1 day');`,
        );
        
        await queryRunner.query(`ALTER TABLE data_points SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'machine_id, node_id, quality',
          timescaledb.compress_chunk_time_interval = '7 days'
        );`);

        await queryRunner.query(
          `SELECT add_retention_policy('data_points', retention_period := INTERVAL '90 days');`,
        );
      }
    } finally {
      await queryRunner.release();
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME || 'mes_admin',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || 'mes_production',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      autoLoadEntities: true,
    }),
    AuthModule,
    AlarmsModule,
    MachinesModule,
    OrdersModule,
    TracesModule,
    DataCollectionModule,
    EdgeGatewayModule,
    OpcUaModule,
    EventBusModule,
  ],
  providers: [TimescaleMigrationService],
})
export class AppModule {}
