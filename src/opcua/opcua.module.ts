import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpcUaService } from './opcua.service';

@Module({
  imports: [ConfigModule],
  providers: [OpcUaService],
  exports: [OpcUaService],
})
export class OpcUaModule {}
