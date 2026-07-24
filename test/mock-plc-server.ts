import { OPCUAServer, DataType, Variant } from 'node-opcua';

export interface PlcState {
  xStart: boolean;
  xAck: boolean;
  xEnd: boolean;
  xQryBusy: boolean;
  iStepNo: number;
  xErrL0: number;
  xErrL1: number;
  xErrL2: number;
  carrier_id: string;
}

export class MockPlcServer {
  private server: OPCUAServer | null = null;
  private state: PlcState;
  readonly port: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: Record<string, any> = {};
  ns: any = null;

  constructor(port?: number) {
    this.port = port || 26543;
    this.state = {
      xStart: false,
      xAck: false,
      xEnd: false,
      xQryBusy: false,
      iStepNo: 0,
      xErrL0: 0,
      xErrL1: 0,
      xErrL2: 0,
      carrier_id: '',
    };
  }

  get endpointUrl(): string {
    return `opc.tcp://localhost:${this.port}`;
  }

  get currentState(): Readonly<PlcState> {
    return { ...this.state };
  }

  async start(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.server = new OPCUAServer({
      port: this.port,
      resourcePath: '/UA/Server',
      serverInfo: {
        productName: 'MockPLC',
        productUri: 'mes-app:mock-plc',
        manufacturerName: 'MES App',
      },
    });

    await this.server.initialize();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const addressSpace = this.server.engine.addressSpace;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    this.ns = addressSpace.getOwnNamespace();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const obj = this.ns.addObject({
      browseName: 'MES_PLC',
      componentOf: addressSpace!.rootFolder.objects,
    });

    const addVar = (browseName: string, dataType: DataType) => {
      return this.ns.addVariable({
        browseName,
        dataType,
        valueRank: -1,
        componentOf: obj,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        initialValue: { valor: 0, statusCode: { severity: 0 } },
        accessLevel: 3,
        writable: true,
      });
    };

    this.nodes.xStart = addVar('xStart', DataType.Boolean);
    this.nodes.xAck = addVar('xAck', DataType.Boolean);
    this.nodes.xEnd = addVar('xEnd', DataType.Boolean);
    this.nodes.xQryBusy = addVar('xQryBusy', DataType.Boolean);
    this.nodes.iStepNo = addVar('iStepNo', DataType.Int32);
    this.nodes.xErrL0 = addVar('xErrL0', DataType.Int32);
    this.nodes.xErrL1 = addVar('xErrL1', DataType.Int32);
    this.nodes.xErrL2 = addVar('xErrL2', DataType.Int32);

    this.nodes.carrier_id = this.ns.addVariable({
      browseName: 'carrier_id',
      dataType: DataType.String,
      valueRank: -1,
      componentOf: obj,
      initialValue: { valor: '', statusCode: { severity: 0 } },
      accessLevel: 3,
      writable: true,
    });

    // Write initial values
    this.setXStart(false);
    this.setxAck(false);
    this.setXEnd(false);
    this.setXQryBusy(false);
    this.setIStepNo(0);
    this.setXErrL0(0);
    this.setXErrL1(0);
    this.setXErrL2(0);
    this.setCarrierId('');

    await this.server.start();
    return this.port;
  }

  setNodeValue(name: string, value: any): void {
    const node = this.nodes[name];
    if (!node) return;

    const variant = new Variant({ dataType: node.dataType, value });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    node.setValueFromSource(variant);

    this.state[(name as keyof PlcState)] = value;
  }

  setXStart(value: boolean): void {
    this.setNodeValue('xStart', value);
  }

  setxAck(value: boolean): void {
    this.setNodeValue('xAck', value);
  }

  setXEnd(value: boolean): void {
    this.setNodeValue('xEnd', value);
  }

  setXQryBusy(value: boolean): void {
    this.setNodeValue('xQryBusy', value);
  }

  setIStepNo(value: number): void {
    this.setNodeValue('iStepNo', value);
  }

  setXErrL0(value: number): void {
    this.setNodeValue('xErrL0', value);
  }

  setXErrL1(value: number): void {
    this.setNodeValue('xErrL1', value);
  }

  setXErrL2(value: number): void {
    this.setNodeValue('xErrL2', value);
  }

  setCarrierId(id: string): void {
    this.setNodeValue('carrier_id', id);
  }

  getState(): PlcState {
    return { ...this.state };
  }

  async shutdown(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.shutdown(5000, () => resolve());
      }).catch(() => {});
      this.server = null;
    }
    this.ns = null;
    this.nodes = {};
  }

  getServer(): OPCUAServer | null {
    return this.server;
  }
}
