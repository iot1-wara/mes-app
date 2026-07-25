import { Controller, Get, Post, Body, Delete, Put, Patch } from '@nestjs/common';
import { OpcUaService, OpcUaStationConfig, OpcUaStationStatus } from './opcua.service';
import { MqttGatewayService } from './mqtt-gateway.service';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MachineEntity } from '../machines/machine.entity';
import { CarrierService } from '../orders/carrier.service';

const OPCUA_CONFIG_PATH = process.env.OPCUA_CONFIG_FILE || join(__dirname, '../../opcuastations.json');

function loadStationsConfig(): OpcUaStationConfig[] {
  // Priority 1: in-memory env var (set by save/reload)
  const envRaw = process.env.OPC_UA_STATIONS;
  if (envRaw) {
    try { return JSON.parse(envRaw); } catch {}
  }
  // Priority 2: JSON file
  try {
    if (existsSync(OPCUA_CONFIG_PATH)) {
      const raw = readFileSync(OPCUA_CONFIG_PATH, 'utf-8');
      process.env.OPC_UA_STATIONS = raw;
      return JSON.parse(raw);
    }
  } catch {}
  // Priority 3: env var fallback
  const rawFallback = process.env.OPC_UA_STATIONS || '[]';
  try {
    return JSON.parse(rawFallback);
  } catch {
    return [];
  }
}

function saveStationsConfig(stations: OpcUaStationConfig[]): void {
  writeFileSync(OPCUA_CONFIG_PATH, JSON.stringify(stations, null, 2), 'utf-8');
}

@Controller('edge')
export class EdgeController {
  constructor(
    private readonly opcUaService: OpcUaService,
    private readonly mqttGatewayService: MqttGatewayService,
    @InjectRepository(MachineEntity)
    private readonly machinesRepo: Repository<MachineEntity>,
  ) {}

  @Get('opcua/status')
  getOpcUaStatus(): OpcUaStationStatus[] { return this.opcUaService.getStatus(); }

  @Get('opcua/connected')
  opcuaConnected() { return { connected: this.opcUaService.connected(), size: this.opcUaService.size }; }

  @Post('opcua/read')
  async readOpcUaNode(@Body('nodeId') nodeId: string) { 
    if (!this.opcUaService.connected()) throw new Error('OPC UA not connected');
    return null; 
  }

  // --- OPC UA Station Config (Admin only) ---

  @Get('opcua/config')
  getOpcUaConfig() {
    return loadStationsConfig();
  }

  @Put('opcua/config')
  updateOpcUaConfig(@Body() stations: OpcUaStationConfig[]) {
    saveStationsConfig(stations);
    process.env.OPC_UA_STATIONS = JSON.stringify(stations);
    return { saved: true, count: stations.length };
  }

  @Patch('opcua/config')
  patchOpcUaConfig(@Body() stations: OpcUaStationConfig[]) {
    return this.updateOpcUaConfig(stations);
  }

  @Post('opcua/config/reload')
  async reloadOpcUaConfig() {
    const config = loadStationsConfig();
    process.env.OPC_UA_STATIONS = JSON.stringify(config);
    const ok = await this.opcUaService.reloadStations();
    return { reloaded: true, connected: ok };
  }

  // --- OPC UA Node Inspector (Debug) ---

  @Post('opcua/nodes/browse')
  async browseNodes() {
    // Return resolved node IDs per station with their current values
    const status = this.opcUaService.getStatus();
    return { stations: status, message: 'Use /edge/opcua/read for live value reading' };
  }

  @Post('opcua/nodes/read')
  async readNodeLive(@Body('stationId') stationId: number, @Body('fieldName') fieldName: string) {
    // Use the service to read current values from specific field
    const status = this.opcUaService.getStatus();
    if (!status.find(s => s.stationId === stationId)?.connected) {
      throw new Error(`Station ${stationId} not connected`);
    }
    return { stationId, fieldName, message: 'Use writeStMesQuery for writing' };
  }

  // --- MQTT ---

  @Get('mqtt/connected')
  mqttConnected() { return { connected: this.mqttGatewayService.isConnected() }; }

  @Post('mqtt/publish')
  publishToMqtt(@Body('topic') topic: string, @Body('payload') payload: any) {
    this.mqttGatewayService.publish(topic, payload);
    return { published: true, topic };
  }

  // --- Health ---

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      opcua: this.opcUaService.connected(),
      mqtt: this.mqttGatewayService.isConnected(),
    };
  }

  // --- Edge Dashboard (Machine × Station × Carrier mapping) ---

  @Get('dashboard')
  async getEdgeDashboard() {
    const stationStatus = this.opcUaService.getStatus();
    
    // Build map: opcuaStationId → machine
    const machinesWithOpcua = await this.machinesRepo.find({ where: {} as Partial<MachineEntity> });
    const opcuaToMachine = new Map<number, MachineEntity>();
    machinesWithOpcua.forEach(m => {
      if (m.opcua_station_id) {
        opcuaToMachine.set(m.opcua_station_id, m);
      }
    });

    // Anreichere Stationen mit Machine-Namen
    const enrichedStations = stationStatus.map(s => ({
      ...s,
      machineName: opcuaToMachine.get(s.stationId)?.name,
      machineLocation: opcuaToMachine.get(s.stationId)?.location,
      currentCarrierId: s.currentCarrierId ?? null,
    }));

    return {
      stations: enrichedStations,
      machines: machinesWithOpcua.map(m => ({
        id: m.id,
        name: m.name,
        location: m.location,
        status: m.status,
        opcua_station_id: m.opcua_station_id,
      })),
    };
  }
}
