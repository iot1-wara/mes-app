import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const nodeOpcua = require('node-opcua');

export interface OpcUaStationConfig {
  id: number;
  address: string;
  name: string;
  nodePrefix?: string;
  stMesDbName?: string;
  dbProcessDataDbName?: string;
  userName?: string;
  password?: string;
  opcuaStationId?: number;
}

export interface StMesData {
  stationId: number;
  stationName: string;
  xStart: boolean;
  xQryBusy: boolean;
  xAck: boolean;
  xDone: boolean;
  xError: boolean;
  xErrL0: number;
  xErrL1: number;
  xErrL2: number;
  xAuto: boolean;
  xManual: boolean;
  xBusy: boolean;
  xReset: boolean;
  uiResourceId?: number;
  udiONo?: number;
  uiOPos?: number;
  uiOpNo?: number;
  uiCarrierId?: string;
  udiPNo?: string;
}

export interface DbProcessDataEntry {
  stationId: number;
  stationName: string;
  iCarrierID: number | null;
  iStepNo: number;
  iResourceID: number | null;
  iPar1: number;
  iPar2: number;
  iPar3: number;
  iPar4: number;
  ldtTimeStamp: Date | null;
}

export interface OpcUaStationStatus {
  stationId: number;
  address: string;
  connected: boolean;
  lastEventAt?: Date;
  nodesResolved: boolean;
  machineName?: string;
  currentCarrierId?: string | null;
}

// Event payloads fired by subscriptions
export type OpcUaEventType = 'xStart' | 'stMesStateChange' | 'dbProcessDataChange';

export interface OpcUaEvent {
  type: OpcUaEventType;
  stationId: number;
  timestamp: Date;
  data?: StMesData | DbProcessDataEntry;
}

// Internal node IDs resolved per station after browse
interface StationNodeIds {
  xStart: string;
  xQryBusy: string;
  xAck: string;
  xDone: string;
  xErrL0: string;
  xErrL1: string;
  xErrL2: string;
  xAuto: string;
  xManual: string;
  xBusy: string;
  xReset: string;
  uiResourceId: string;
  udiONo: string;
  uiOPos: string;
  uiOpNo: string;
  uiCarrierId: string;
  udiPNo: string;
  iCarrierID: string;
  iStepNo: string;
  iResourceID: string;
  iPar1: string;
  iPar2: string;
  iPar3: string;
  iPar4: string;
  ldtTimeStamp: string;
}

// Per-station connection state
interface StationData {
  client: any;
  session: any;
  namespaceIndex: number;
  nodes: StationNodeIds;
  subscriptions: Array<{ monItem: any; unsubscribe: () => void }>;
  connected: boolean;
  address: string;
  nodesResolved: boolean;
  currentCarrierId?: string | null;
  lastEventAt?: string;
}

@Injectable()
export class OpcUaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpcUaService.name);

  constructor(private readonly configService: ConfigService) {}
  
  // Per station connections
  private stations = new Map<number, StationData>();

  // Event listeners (listener name per station)
  private eventListeners = new Map<string, (...args: any[]) => void>();

  connected(): boolean {
    return this.size > 0;
  }

  get size(): number {
    let count = 0;
    this.stations.forEach(() => count++);
    return count;
  }

  getStatus(): OpcUaStationStatus[] {
    const result: OpcUaStationStatus[] = [];
    this.stations.forEach((value, stationId) => {
      result.push({
        stationId,
        address: value.address,
        connected: value.connected ?? false,
        nodesResolved: value.nodesResolved ?? false,
        lastEventAt: value.lastEventAt,
        currentCarrierId: value.currentCarrierId ?? null,
      });
    });
    return result;
  }

  async onModuleInit() {
    try { await this.initStations(); } catch (e) { this.logger.error('OPC UA init failed: ' + (e as Error).message); }
  }

  /** Reload stations from config file — closes existing connections and reconnects */
  async reloadStations(): Promise<boolean> {
    this.logger.log('Reloading OPC UA stations from config...');

    // Close all existing station connections
    this.stations.forEach(({ client, session }) => {
      try { if (session) session.close().catch(() => {}); } catch {}
      try { if (client && typeof client.disconnect === 'function') client.disconnect().catch(() => {}); } catch {}
    });
    this.stations.clear();

    // Reinitialize
    await this.initStations();
    return this.connected();
  }

  private async initStations(): Promise<void> {
    const configRaw = this.configService.get<string>('OPC_UA_STATIONS', '[]');
    let stations: OpcUaStationConfig[] = [];
    
    try {
      stations = JSON.parse(configRaw);
    } catch (e) {
      this.logger.warn(`Invalid OPC_UA_STATIONS config '${configRaw}'. Using legacy endpoint.`);
    }

    if (!stations.length) {
      const fallback = this.configService.get<string>('OPCUA_ENDPOINT_URL');
      if (fallback) {
        this.logger.log('No stations configured. Using legacy OPCUA_ENDPOINT_URL as single station.');
        stations = [{ id: 1, address: fallback, name: 'Legacy Station' }];
      } else {
        this.logger.warn('No OPC UA stations configured. OPC UA functionality disabled.');
        return;
      }
    }

    for (const station of stations) {
      await this.connectStation(station);
    }
  }

  // ==========================================================================
  // Siemens S7-1500 Node Discovery
  // ==========================================================================

  /**
   * Discover OPC UA node paths for stMES and dbProcessData on a Siemens S7-1500.
   * 
   * Siemens S7-1500 exports DB blocks as structured nodes. The typical address space
   * structure from TIA Portal is one of:
   *   1. ns=N;s=DeviceSettings|PLC1|<DBName>|<Field>         (TIA Portal default)
   *   2. ns=N;s=<DBName>_<Field>                             (Compact notation)
   *   3. ns=N;s=DB<Num>:<Field>                              (Direct DB reference)
   */
  private async discoverSiemensNodes(
    session: any,
    nsIdx: number,
    config: OpcUaStationConfig
  ): Promise<StationNodeIds> {
    const stMesDbName = config.stMesDbName || 'stMES';
    const db151DbName = config.dbProcessDataDbName || 'dbProcessData';
    const prefix = config.nodePrefix && config.nodePrefix.length > 0 ? config.nodePrefix : '';

    // Try to find DB blocks in the address space via browsing
    let foundStMesNode: string | null = null;
    let foundDb151Node: string | null = null;

    // Strategy A: Browse namespace for DB blocks by name patterns
    try {
      const targetNodes = [
        stMesDbName,
        'stMES',
        `DB${stMesDbName.toUpperCase()}`,
        `DeviceSettings|PLC1|${stMesDbName}`,
      ];

      const db151Nodes = [
        db151DbName,
        'dbProcessData',
        'DB151',
        `DB${db151DbName.toUpperCase()}`,
        `DeviceSettings|PLC1|${db151DbName}`,
      ];

      for (const candidate of targetNodes) {
        const nodeId = `ns=${nsIdx};s=${candidate}`;
        if (await this.nodeExists(session, nodeId)) {
          foundStMesNode = nodeId;
          break;
        }
      }

      for (const candidate of db151Nodes) {
        const nodeId = `ns=${nsIdx};s=${candidate}`;
        if (await this.nodeExists(session, nodeId)) {
          foundDb151Node = nodeId;
          break;
        }
      }

      // Strategy B: If name-based discovery failed, browse all nodes in the user namespace
      // and look for DB blocks by dataType (DataBlocK)
      if (!foundStMesNode || !foundDb151Node) {
        const browsedNodes = await this.browseUserNamespace(session, nsIdx);
        
        if (!foundStMesNode) {
          foundStMesNode = browsedNodes.find(n => 
            n.toLowerCase().includes('stmes') || 
            n.toLowerCase().includes('st_mes') ||
            (n.startsWith('DB') && !n.startsWith('DB151'))
          ) || null;
        }

        if (!foundDb151Node) {
          foundDb151Node = browsedNodes.find(n =>
            n.toLowerCase().includes('dbprocess') ||
            n.toLowerCase().includes('db151') ||
            (n.startsWith('DB') && n.match(/DB\d+/)?.[0] === 'DB' + stMesDbName.length * 10 + 1)
          ) || null;
        }
      }

    } catch {
      this.logger.warn(`Namespace browsing failed for Station ${config.id}, using fallback patterns`);
    }

    // Enumerate structure members from found DB block nodes
    let stMesMembers: string[] | null = null;
    let db151Members: string[] | null = null;

    if (foundStMesNode) {
      stMesMembers = await this.enumerateStructureMembers(session, nsIdx, foundStMesNode);
      this.logger.log(`Found stMES DB at ${foundStMesNode} with ${stMesMembers?.length || 0} members`);
    } else {
      this.logger.warn(`Could not find stMES DB for Station ${config.id}. Will use field naming: ${stMesDbName}`);
    }

    if (foundDb151Node) {
      db151Members = await this.enumerateStructureMembers(session, nsIdx, foundDb151Node);
      this.logger.log(`Found dbProcessData DB at ${foundDb151Node} with ${db151Members?.length || 0} members`);
    } else {
      this.logger.warn(`Could not find dbProcessData DB for Station ${config.id}. Will use field naming: ${db151DbName}`);
    }

    // Build the final node ID map using discovered structure or fallback patterns
    return this.buildNodeIds(stMesMembers, db151Members, stMesDbName, db151DbName, prefix, nsIdx);
  }

  /** Browse all nodes in the user namespace (index > 0) to find DB block names */
  private async browseUserNamespace(session: any, nsIdx: number): Promise<string[]> {
    const foundNames: string[] = [];
    
    try {
      const rootId = nodeOpcua.resolveNodeId(`ns=${nsIdx}`);
      const rootObject = session ? session.server.getObjectsFolder() : null;
      
      if (!rootObject) return foundNames;
      
      const browseResult = await session.browse({ nodeId: rootObject.nodeId });
      
      if (browseResult && browseResult.references) {
        for (const ref of browseResult.references) {
          if (ref.isForward && ref.targetName?.nodeName) {
            const name = ref.targetName.nodeName;
            foundNames.push(name);
            
            // If it's a DB block (starts with DB or DeviceSettings), enumerate its children
            if (name.startsWith('DB') || (rootObject.nodeId.toString().includes('DeviceSettings'))) {
              try {
                const childNodeId = `ns=${nsIdx};s=${name}`;
                const childResult = await session.browse({ nodeId: nodeOpcua.resolveNodeId(childNodeId) });
                if (childResult && childResult.references) {
                  for (const childRef of childResult.references) {
                    if (childRef.isForward && childRef.targetName?.nodeName) {
                      foundNames.push(`${name} ${childRef.targetName.nodeName}`);
                    }
                  }
                }
              } catch {
                // Ignore errors for DBs that can't be browsed
              }
            }
          }
        }
      }
    } catch {
      // Namespace browsing is best-effort, failures are non-fatal
    }

    return foundNames;
  }

  /** Check if a node ID exists in the address space without throwing */
  private async nodeExists(session: any, nodeId: string): Promise<boolean> {
    try {
      const resolved = nodeOpcua.resolveNodeId(nodeId);
      await session.readValue(resolved);
      return true;
    } catch {
      return false;
    }
  }

  /** Enumerate the members of a structured DB block via browse */
  private async enumerateStructureMembers(session: any, nsIdx: number, parentNodeId: string): Promise<string[] | null> {
    const result: string[] = [];
    try {
      const nodeId = nodeOpcua.resolveNodeId(parentNodeId);
      const browseResult = await session.browse({ nodeId });
      
      if (!browseResult || !browseResult.references) return result;

      for (const ref of browseResult.references) {
        // Look for HasComponent references with a variable target
        if (ref.referenceType === 'HasComponent' && ref.isForward) {
          const targetName = ref.targetName?.nodeName || '';
          if (targetName && typeof targetName === 'string') {
            result.push(targetName);
          }
        }
      }

    } catch (e) {
      this.logger.warn(`Could not enumerate members of ${parentNodeId}: ${(e as Error).message}`);
      return null;
    }
    return result.length > 0 ? result : null;
  }

  /** Build the final node ID map using discovered DB members or fallback naming */
  private buildNodeIds(
    stMesMembers: string[] | null,
    db151Members: string[] | null,
    stMesDb: string,
    db151Db: string,
    prefix: string,
    nsIdx: number
  ): StationNodeIds {

    /** Try to resolve a field name from discovered structure members */
    const isInMembers = (members: string[] | null, fieldName: string): boolean => {
      if (!members) return false;
      return members.some(m => m.toLowerCase() === fieldName.toLowerCase());
    };

    // s7Format: ns=N;s=DB<Num>:<Field> for numeric DB names
    const s7DbNodeId = (dbName: string, field: string): string => {
      if (dbName.startsWith('DB') && /^\d+$/.test(dbName.slice(2))) {
        return `ns=${nsIdx};s=DB${dbName}:${field}`;
      }
      return `ns=${nsIdx};s=${dbName} ${field}`;
    };

    // tiaFormat: ns=N;s=<Name>|<Field> for TIA Portal style
    const tiaNodeId = (dbName: string, field: string): string => 
      `ns=${nsIdx};s=${dbName}|${field}`;

  const compactNodeId = (dbName: string, field: string): string => {
    return dbName.startsWith('DB') ? s7DbNodeId(dbName, field) : `ns=${nsIdx};s=${dbName}_${field}`;
  };

    // Direct prefix format: ns=N;s=<prefix><Field>
    const directNodeId = (field: string): string => 
      prefix.length > 0 ? `ns=${nsIdx};s=${prefix}${field}` : null;

    // Field name aliases for TIA Portal -> UDT field name resolution
    const stMesFieldAliases: Array<[string, string[]]> = [
      ['xStart', ['xStart', 'X_Start', 'XSTART']],
      ['xQryBusy', ['xQryBusy', 'x_QryBusy', 'X_QRYBUSY', 'xQueryBusy']],
      ['xAck', ['xAck', 'X_Ack', 'XACK']],
      ['xDone', ['xDone', 'X_Done', 'XDONE']],
      ['xErrL0', ['xErrL0', 'x_ErrL0', 'X_ERRL0']],
      ['xErrL1', ['xErrL1', 'x_ErrL1', 'X_ERRL1']],
      ['xErrL2', ['xErrL2', 'x_ErrL2', 'X_ERRL2']],
      ['xAuto', ['xAuto', 'x_Auto', 'XAUTO']],
      ['xManual', ['xManual', 'x_Manual', 'XMANUAL']],
      ['xBusy', ['xBusy', 'x_Busy', 'XBUSY']],
      ['xReset', ['xReset', 'x_Reset', 'XRESET']],
      ['uiResourceId', ['uiResourceId', 'UIResourceId', 'ui_resourceID']],
      ['udiONo', ['udiONo', 'UDI_ONo', 'udiONO']],
      ['uiOPos', ['uiOPos', 'UI_OPos', 'ui_OPos']],
      ['uiOpNo', ['uiOpNo', 'UI_OPNO', 'ui_OPNO']],
      ['uiCarrierId', ['uiCarrierId', 'UI_CarrierID', 'ui_carrierID']],
      ['udiPNo', ['udiPNo', 'UDI_PNo', 'udi_PNo']],
    ];

    const dbFieldAliases: Array<[string, string[]]> = [
      ['iCarrierID', ['iCarrierID', 'ICarrierID', 'i_carrierID']],
      ['iStepNo', ['iStepNo', 'I_StepNo', 'i_stepno']],
      ['iResourceID', ['iResourceID', 'IResourceID', 'i_resourceID']],
      ['iPar1', ['iPar1', 'IPar1', 'i_par1']],
      ['iPar2', ['iPar2', 'IPar2', 'i_par2']],
      ['iPar3', ['iPar3', 'IPar3', 'i_par3']],
      ['iPar4', ['iPar4', 'IPar4', 'i_par4']],
      ['ldtTimeStamp', ['ldtTimeStamp', 'LDT_TimeStamp', 'ldt_timeStamp']],
    ];

    // Helper: node ID generator for a field using multiple naming strategies
    const makeNodeId = (dbName: string, fieldName: string): string => {
      // Try S7 numeric DB format first (DB151:XStart)
      if (dbName.startsWith('DB') && /^\d+$/.test(dbName.slice(2))) {
        return `ns=${nsIdx};s=DB${dbName}:${fieldName}`;
      }
      // TIA Portal style: stMES_xStart or stMES|xStart
      return `ns=${nsIdx};s=${dbName}_${fieldName}`;
    };

    const makeNodeIdWithPrefix = (fieldName: string): string => {
      if (prefix.length > 0) {
        return `ns=${nsIdx};s=${prefix}${fieldName}`;
      }
      return null;
    };

    // Check if a field name is in the discovered members list
    const isInStMes = (field: string) => isInMembers(stMesMembers, field);
    const isInDb151 = (field: string) => isInMembers(db151Members, field);

    // Build and return the node ID map using S7-style naming conventions
    const nodeIds: any = {} as StationNodeIds;
    
    for (const [field, aliases] of stMesFieldAliases) {
      const candidates = [];
      
      // 1. Direct field name
      candidates.push(makeNodeId(stMesDb, field));
      
      // 2. Try each alias in case TIA Portal uses different casing
      for (const alias of aliases.slice(1)) {
        candidates.push(makeNodeId(stMesDb, alias));
      }

      // 3. Prefix-based if configured
      const prefixNode = makeNodeIdWithPrefix(field);
      if (prefixNode) candidates.unshift(prefixNode);

      nodeIds[field] = candidates[0];
    }

    for (const [field, aliases] of dbFieldAliases) {
      const candidates = [];

      // 1. Direct field name
      candidates.push(makeNodeId(db151Db, field));
      
      // 2. Try each alias in case TIA Portal uses different casing
      for (const alias of aliases.slice(1)) {
        candidates.push(makeNodeId(db151Db, alias));
      }

      // 3. Prefix-based if configured
      const prefixNode = makeNodeIdWithPrefix(field);
      if (prefixNode) candidates.unshift(prefixNode);

      nodeIds[field] = candidates[0];
    }

    return nodeIds as StationNodeIds;
  }

  private isPlausibleS7NodeId(nodeId: string): boolean {
    // Valid S7-1500 OPC UA Node IDs contain ns= and s= segments with no trailing spaces
    return /^[ns]=\d+;s=[A-Za-z0-9_]/.test(nodeId);
  }

  // ==========================================================================
  // Station Connection Management
  // ==========================================================================

  private async connectStation(config: OpcUaStationConfig): Promise<void> {
    const client = new nodeOpcua.OPCUAClient({
      securityMode: nodeOpcua.SecurityMode[this.configService.get<string>('OPCUA_SECURITY_MODE', 'NONE') || 'NONE'],
    });

    try {
      this.logger.log(`Connecting to Station ${config.id} (${config.name}) at ${config.address}`);
      const endpoint = await client.findEndpointFromUrl(config.address);
      const serverUrl = `opc.tcp://${endpoint.hostname}:${endpoint.port}`;
      
      await client.connect(serverUrl);
      
      // Use credentials if provided for Siemens S7-1500 with auth enabled
      const userName = config.userName || this.configService.get<string>('OPC_UA_USERNAME');
      const password = config.password || this.configService.get<string>('OPC_UA_PASSWORD');
      
      let session: any;
      if (userName && password) {
        session = await client.createSession(userName, password);
      } else {
        session = await client.createSession();
      }

      // Find user namespace — Siemens S7-1500 typically uses index 4 for device data
      const namespaceIndex = this.findAddressSpaceNamespace(session);
      if (namespaceIndex === null) {
        this.logger.warn(`No user namespace found for Station ${config.id}, using namespace 1`);
      }

      const nsIdx = namespaceIndex ?? 1;

      // Browse the OPC UA address space to discover DB blocks and structure members
      const resolvedNodes = await this.discoverSiemensNodes(session, nsIdx, config);

      // Create subscriptions for stMES and dbProcessData fields
      const subscriptions: Array<{ monItem: any; unsubscribe: () => void }> = [];

      const allFields = [
        'xStart', 'xQryBusy', 'xAck', 'xDone',
        'xErrL0', 'xErrL1', 'xErrL2',
        'xAuto', 'xManual', 'xBusy', 'xReset',
        'uiResourceId', 'udiONo', 'uiOPos', 'uiOpNo', 'uiCarrierId', 'udiPNo',
      ];

      const dbFields = [
        'iCarrierID', 'iStepNo', 'iResourceID',
        'iPar1', 'iPar2', 'iPar3', 'iPar4', 'ldtTimeStamp'
      ];

      const allFieldList = [...allFields, ...dbFields];
      
      // Create a single subscription for all fields
      const subSettings: any = {
        publishingEnabled: true,
        priority: 10,
        lifetimeCount: 10000,
        keepAliveCount: 3,
        maxNotificationsPerPublish: 1000,
        publishingInterval: 500, // 500ms update rate for S7-1500 cycle time
      };

      const subscription = session.createSubscription2(subSettings);

      let resolvedCount = 0;

      for (const fieldName of allFieldList) {
        const nodeIdStr = resolvedNodes[fieldName as keyof StationNodeIds];
        if (!nodeIdStr) continue;

        const nodeId = nodeOpcua.resolveNodeId(nodeIdStr);
        
        const monitoredItem = subscription.subscribeDataChange(
          { nodeId, attributeId: nodeOpcua.AttributeIds.Value },
          {
            samplingInterval: 250,
            discardOldest: true,
            queueSize: 10,
          }
        );

        // Listen for data change events
        monitoredItem.on('datachange', (monitoredItem: any, dataNode: any) => {
          resolvedCount++;
          this.handleDataChange(config.id, config.name, fieldName, dataNode.value.value);
        });

        subscriptions.push({ monItem: monitoredItem, unsubscribe: () => {} });
      }

      this.stations.set(config.id, {
        client,
        session,
        namespaceIndex: nsIdx,
        nodes: resolvedNodes,
        subscriptions,
        connected: true,
        address: config.address,
        nodesResolved: true,
        currentCarrierId: null,
      });

      this.logger.log(`Station ${config.id} (${config.name}) connected successfully with ${resolvedCount} monitored fields`);

    } catch (e) {
      this.logger.error(`Failed to connect Station ${config.id}: ${(e as Error).message}`);
      // Store failed station info for reconnect logic
      const failConfig: OpcUaStationConfig = { id: config.id, address: config.address, name: config.name };
      if (config.userName) failConfig.userName = config.userName;
      if (config.password) failConfig.password = config.password;
      this.stations.set(config.id, {
        client: null,
        session: null,
        namespaceIndex: 0,
        nodes: {} as StationNodeIds,
        subscriptions: [],
        connected: false,
        address: (failConfig as any).address || config.address,
        nodesResolved: false,
        currentCarrierId: null,
      });
    }
  }

  // ==========================================================================
  // Data Change Handlers (unchanged)
  // ==========================================================================

  private async handleDataChange(stationId: number, stationName: string, fieldName: string, value: any): Promise<void> {
    const now = new Date();

    // Aggregate fields into stMES or dbProcessData events
    const stMesFields = ['xStart', 'xQryBusy', 'xAck', 'xDone', 'xErrL0', 'xErrL1', 'xErrL2', 
                          'xAuto', 'xManual', 'xBusy', 'xReset', 'uiResourceId', 'udiONo', 'uiOPos', 'uiOpNo', 'uiCarrierId', 'udiPNo'];
    
    if (fieldName === 'xStart' && value) {
      // Emit xStart event immediately when detected
      this.emitEvent({
        type: 'xStart',
        stationId,
        timestamp: now,
        data: this.aggregateStMesData(stationId, stationName),
      });
    }

    if (stMesFields.includes(fieldName)) {
      // Only emit full state change once per cycle, not on every field
      if (fieldName === 'xDone') {
        this.emitEvent({
          type: 'stMesStateChange',
          stationId,
          timestamp: now,
          data: this.aggregateStMesData(stationId, stationName),
        });
      }
    }

    // For dbProcessData, emit when carrier ID or step number changes
    if (fieldName === 'iCarrierID' || fieldName === 'iStepNo') {
      const dbData = this.aggregateDbProcessData(stationId, stationName);

      // Track current carrier for this station
      const station = this.stations.get(stationId);
      if (station && dbData) {
        station.currentCarrierId = dbData.iCarrierID ? String(dbData.iCarrierID) : null;
      }

      this.emitEvent({
        type: 'dbProcessDataChange',
        stationId,
        timestamp: now,
        data: dbData,
      });
    }
  }

  private aggregateStMesData(stationId: number, stationName: string): StMesData | null {
    const station = this.stations.get(stationId);
    if (!station?.session) return null;

    const result: Partial<StMesData> = { stationId, stationName };
    
    for (const field of ['xStart', 'xQryBusy', 'xAck', 'xDone', 'xErrL0', 'xErrL1', 'xErrL2', 
                          'xAuto', 'xManual', 'xBusy', 'xReset', 'uiResourceId', 'udiONo', 'uiOPos', 'uiOpNo', 'uiCarrierId', 'udiPNo']) {
      const nodeIdStr = station.nodes[field as keyof StationNodeIds];
      if (!nodeIdStr) continue;
      
      try {
        const resolved = nodeOpcua.resolveNodeId(nodeIdStr);
        const value = station.session.readValue(resolved);
        (result as any)[field] = value;
      } catch {}
    }

    return result as StMesData;
  }

  private aggregateDbProcessData(stationId: number, stationName: string): DbProcessDataEntry | null {
    const station = this.stations.get(stationId);
    if (!station?.session) return null;

    const result: Partial<DbProcessDataEntry> = { stationId, stationName };
    
    for (const field of ['iCarrierID', 'iStepNo', 'iResourceID', 'iPar1', 'iPar2', 'iPar3', 'iPar4', 'ldtTimeStamp']) {
      const nodeIdStr = station.nodes[field as keyof StationNodeIds];
      if (!nodeIdStr) continue;
      
      try {
        const resolved = nodeOpcua.resolveNodeId(nodeIdStr);
        const value = station.session.readValue(resolved);
        (result as any)[field] = value;
      } catch {}
    }

    return result as DbProcessDataEntry;
  }

  private emitEvent(event: OpcUaEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  on(fn: string | symbol, listener: (...args: any[]) => void): () => void {
    const id = Math.random().toString(36).slice(2);
    this.eventListeners.set(id, listener);
    return () => { this.eventListeners.delete(id); };
  }

  private findAddressSpaceNamespace(session: any): number | null {
    const namespaces = session.server ? session.server.discoveryInfo : [];
    if (!namespaces) return 1;
    
    // The user data namespace is usually index 1 (0 is standard, 1+ are custom)
    for (let i = 1; i < namespaces.length; i++) {
      const ns = namespaces[i];
      if (ns && (ns.includes('Siemens') || ns.includes('SPS') || ns.includes('PLC') || ns.includes('Station'))) {
        return i;
      }
    }
    return 1;
  }

  // ==========================================================================
  // Write Operations
  // ==========================================================================

  async writeField(stationId: number, fieldName: string, value: any): Promise<boolean> {
    const station = this.stations.get(stationId);
    if (!station?.session || !station.nodes[fieldName as keyof StationNodeIds]) return false;

    const nodeIdStr = station.nodes[fieldName as keyof StationNodeIds];
    try {
      const nodeId = nodeOpcua.resolveNodeId(nodeIdStr);
      await station.session.writeValue(nodeId, { value: Boolean(value), valueType: 8 });
      return true;
    } catch (e) {
      this.logger.error(`Write failed to Station ${stationId}.${fieldName}: ${(e as Error).message}`);
      return false;
    }
  }

  async writeStMesQuery(stationId: number, fieldName: string, value: any): Promise<boolean> {
    return this.writeField(stationId, fieldName, value);
  }

  onModuleDestroy() {
    this.stations.forEach(({ client, session }) => {
      try {
        if (session) session.close().catch(() => {});
        if (client && typeof client.disconnect === 'function') client.disconnect().catch(() => {});
      } catch {}
    });
  }
}
