import EventEmitter from 'events';
import * as nodeOpcua from 'node-opcua';

interface MockPlcState {
  xStart: boolean;
  xAck: boolean;
  xEnd: boolean;
  iStepNo: number;
  xQryBusy: boolean;
  xErrL0: number;
  xErrL1: number;
  xErrL2: number;
  carrier_id: string;
}

export interface MockPlcStationConfig {
  id: number;
  port: number;
  address: string;
  name: string;
  state?: Partial<MockPlcState>;
}

// Variable definitions for the mock PLC namespace
const VARIABLES = [
  { nodeId: 'ns=1;s=stMES:xQryBusy', dataType: nodeOpcua.DataType.Boolean },
  { nodeId: 'ns=1;s=stMES:xStart', dataType: nodeOpcua.DataType.Boolean },
  { nodeId: 'ns=1;s=stMES:xAck', dataType: nodeOpcua.DataType.Boolean },
  { nodeId: 'ns=1;s=stMES:xDone', dataType: nodeOpcua.DataType.Boolean },
  { nodeId: 'ns=1;s=stMes:xErrL0', dataType: nodeOpcua.DataType.Int32 },
  { nodeId: 'ns=1;s=stMeS:xErrL1', dataType: nodeOpcua.DataType.Int32 },
];

export class MockPlcServer extends EventEmitter {
  private servers = new Map<number, any>();
  private states = new Map<number, MockPlcState>();
  
  getStation(port: number): MockPlcState | undefined {
    return this.states.get(port);
  }

  async start(configs: Partial<MockPlcStationConfig>[]): Promise<void> {
    const ports = configs.map(c => c.port ?? (5500 + (c.id ?? 1)));
    
    for (const config of configs) {
      const port = config.port ?? (5500 + (config.id ?? 1));
      const state = { ...MockPlcServer.createDefaultState(), ...config.state };
      this.states.set(port, state);

      const server = new nodeOpcua.OPCUAServer({ port });
      await server.start();

      const addressSpace = (server as any).addressSpace;
      const namespace = addressSpace.getOwnNamespace();

      // Create station folder and stMES/dbProcessData hierarchy
      const rootObjects = namespace.objectsFolder;
      const stationFolder = namespace.addFolder({ organizedBy: rootObjects, browseName: config.name || `Station ${config.id}` });
      
      const smesFolder = namespace.addFolder({organizedBy: stationFolder,browseName: 'stMES'});
      

      // Register all stMES variables
      for (const v of VARIABLES) {
        const fieldName = v.nodeId.split(':')[1]?.split('stMES:')?.[1];
        if (!fieldName) continue;
        
        const valueKey = fieldName as keyof MockPlcState;
        const nodeValue = state[valueKey] ?? 0;

        namespace.addVariable({
          organizedBy: smesFolder,
          nodeId: v.nodeId.replace('stMES', `station${config.id}`),
          browseName: fieldName,
          dataType: v.dataType,
          accessor: 'master',
          value: {value: nodeValue as never, valueType: String(v.dataType)},
        });
      }

      // Register dbProcessData variables (carrier ID, step number, resource ID, params)
      const dbProcessFolder = namespace.addFolder({ organizedBy: stationFolder, browseName: 'dbProcessData' });

      const dbFields = [
        { nodeId: `ns=1;s=dbProcessData${config.id}:iCarrierID`, dataType: nodeOpcua.DataType.Int32 },
        { nodeId: `ns=1;s=dbProcessData${config.id}:iStepNo`, dataType: nodeOpcua.DataType.Int16 },
        { nodeId: `ns=1;s=dbProcessData${config.id}:iResourceID`, dataType: nodeOpcua.DataType.Int16 },
        { nodeId: `ns=1;s=dbProcessData${config.id}:iPar1`, dataType: nodeOpcua.DataType.Int16 },
        { nodeId: `ns=1;s=dbProcessData${config.id}:iPar2`, dataType: nodeOpcua.DataType.Int16 },
      ];

      for (const v of dbFields) {
          const fieldName = v.nodeId.split(':')[1]?.split(':dbProcessData')?.[1];
          if (!fieldName) continue;
          
          namespace.addVariable({ organizedBy: dbProcessFolder, nodeId: v.nodeId, browseName: fieldName, dataType: v.dataType, accessor: 'master', value: { value: 0 as never, valueType: String(v.dataType)} });
      }

      this.servers.set(port, server);
    }

  console.log(`[MockPlcServer] Started ${configs.length} mock station(s)`);
  }

  private static createDefaultState() {
    return {
      xStart: false, xAck: false, xEnd: false, iStepNo: 0, 
      xQryBusy: false, xErrL0: 0, xErrL1: 0, xErrL2: 0, carrier_id: '' };
  }

  async stop(): Promise<void> {
    for (const [, server] of this.servers) { await server.shutdown().catch(() => {}); }
    this.servers.clear();
  }
}
