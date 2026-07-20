import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlarmsModule } from './alarms/alarms.module';
import { MachinesModule } from './machines/machines.module';
import { OrdersModule } from './orders/orders.module';
import { TracesModule } from './traces/traces.module';
import { DataCollectionModule } from './data-collection/data-collection.module';
import { EdgeGatewayModule } from './opcua/edge-gateway.module';
import { OpcUaModule } from './opcua/opcua.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
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
    AlarmsModule,
    MachinesModule,
    OrdersModule,
    TracesModule,
    DataCollectionModule,
    EdgeGatewayModule,
    OpcUaModule,
  ],
})
export class AppModule {}
