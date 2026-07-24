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

const DataType = nodeOpcua.DataType;
const STRING_TYPE_CODE: string = 'string';

// Variable definitions for the mock PLC namespace
const VARIABLES = [
  { nodeId: 'ns=1;s=mockPlc:xQryBusy', dataType: DataType.Boolean },
  { nodeId: 'ns=1;s=mockPlc:xStart', dataType: DataType.Boolean },
  { nodeId: 'ns=1;s=mockPlc:xAck', dataType: DataType.Boolean },
  { nodeId: 'ns=1;s=mockPlc:xEnd', dataType: DataType.Boolean },
  { nodeId: 'ns=1;s=mockPlc:iStepNo', dataType: DataType.Int32 },
  { nodeId: 'ns=1;s=mockPlc:xErrL0', dataType: DataType.Int32 },
  { nodeId: 'ns=1;s=mockPlc:xErrL1', dataType: DataType.Int32 },
  { nodeId: 'ns=1;s=mockPlc:xErrL2', dataType: DataType.Int32 },
  { nodeId: 'ns=1;s=mockPlc:carrier_id', dataType: DataType.String },
];

export class MockPlcServer extends EventEmitter {
  private server: any = null;
  private port: number;
  private addressSpace: any;
  private readonly state: MockPlcState = {
    xStart: false,
    xAck: false,
    xEnd: false,
    iStepNo: 0,
    xQryBusy: false,
    xErrL0: 0,
    xErrL1: 0,
    xErrL2: 0,
    carrier_id: '',
  };

  constructor(port?: number) {
    super();
    this.port = port ?? 5500;
  }

  getState(): MockPlcState {
    return { ...this.state };
  }

  async start(): Promise<void> {
    this.server = new nodeOpcua.OPCUAServer({ port: this.port });

    await this.server.start();

    this.addressSpace = this.server.addressSpace;
    const namespace = this.addressSpace.getOwnNamespace();

    // Create a mockPLC folder as organizing node
    const rootObjects = namespace.objectsFolder;
    const mockFolder = namespace.addFolder({
      organizedBy: rootObjects,
      browseName: 'mockPLC',
    });

    // Register all variables on the server with current values
    for (const v of VARIABLES) {
      const nodeValue = this.getNodeValue(v.nodeId.split(':')[1].replace('mockPlc:', ''));
      
      namespace.addVariable({
        componentOf: mockFolder,
        nodeId: v.nodeId,
        browseName: v.nodeId.split(':')[1],
        dataType: v.dataType,
        accessor: 'master',
        value: {
          value: nodeValue.value as never,
          valueType: nodeValue.typeCode,
        },
      });
    }

    // Set up read/write handlers
    this.setupReadHandler();
    
    console.log(`[MockPlcServer] Listening on port ${this.port}`);
  }

  private getNodeValue(variableName: string): { value: any; typeCode: string } {
    switch (variableName) {
      case 'xStart': return { value: this.state.xStart, typeCode: String(DataType.Boolean) };
      case 'xAck': return { value: this.state.xAck, typeCode: String(DataType.Boolean) };
      case 'xEnd': return { value: this.state.xEnd, typeCode: String(DataType.Boolean) };
      case 'xQryBusy': return { value: this.state.xQryBusy, typeCode: String(DataType.Boolean) };
      case 'iStepNo': return { value: this.state.iStepNo, typeCode: String(DataType.Int32) };
      case 'xErrL0': return { value: this.state.xErrL0, typeCode: String(DataType.Int32) };
      case 'xErrL1': return { value: this.state.xErrL1, typeCode: String(DataType.Int32) };
      case 'xErrL2': return { value: this.state.xErrL2, typeCode: String(DataType.Int32) };
      case 'carrier_id': return { value: this.state.carrier_id, typeCode: STRING_TYPE_CODE };
      default: return { value: 0, typeCode: String(DataType.Int32) };
    }
  }

  private setupReadHandler(): void {
    if (!this.server || !this.addressSpace) return;

    const serverEngine = this.server.engine!;
    
    // Intercept writes from MES → PLC client
    serverEngine.registerWriteHandler = (nodeId: any, handler: Function) => {
      console.log(`[MockPlcServer] Write registration on ${nodeId}`);
    };
  }

  async setXStart(value: boolean): Promise<void> {
    this.state.xStart = value;
    if (value) {
      this.emit('xStart', { xStart: true, xAck: false, carrier_id: this.state.carrier_id, iStepNo: this.state.iStepNo });
    }
  }

  async setxAck(value: boolean): Promise<void> {
    this.state.xAck = value;
  }

  async setXEnd(value: boolean): Promise<void> {
    this.state.xEnd = value;
  }

  async setIStepNo(value: number): Promise<void> {
    this.state.iStepNo = value;
  }

  async setXQryBusy(value: boolean): Promise<void> {
    this.state.xQryBusy = value;
    this.emit('xQryBusy', { xQryBusy: value, timestamp: Date.now() });
  }

  async setCarrierId(id: string): Promise<void> {
    this.state.carrier_id = id;
  }

  async setError(level: 'xErrL0' | 'xErrL1' | 'xErrL2', value: number): Promise<void> {
    const k = level as keyof MockPlcState;
    (this.state as any)[k] = value;
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.shutdown();
      this.server = null;
    }
  }
}
