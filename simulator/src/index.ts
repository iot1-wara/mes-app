// Siemens S7-1500 OPC UA Simulator + HTTP REST API for Test UI
import "dotenv/config";
import { EventEmitter } from "events";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { Variant, DataType, StatusCodes as OPCStatusCode } from "node-opcua";
import { OPCUAServer } from "node-opcua";

interface StationConfig {
  name: string; dbNumber: number; port: number; cycleTime: number; errorRate: number;
}

const STATIONS: StationConfig[] = [
  { name: "Entriegelung",  dbNumber: 151, port: 5500, cycleTime: 3000, errorRate: 0 },
  { name: "Spritzgiessen", dbNumber: 152, port: 5501, cycleTime: 6000, errorRate: 0.04 },
  { name: "Montage",       dbNumber: 153, port: 5502, cycleTime: 8000, errorRate: 0.02 },
  { name: "Pruefung",      dbNumber: 154, port: 5503, cycleTime: 5000, errorRate: 0.01 },
  { name: "Verpackung",    dbNumber: 155, port: 5504, cycleTime: 4000, errorRate: 0.005 },
];

interface StateRefs {
  xQryBusy: number; xStart: number; xAck: number; xDone: number;
  xCtrlError: number; xErrL0: number; xErrL1: number; iCarrierID: number;
  iStepNo: number; iResourceID: number; iPar1: number; iPar2: number; iPar3: number; iPar4: number;
}

interface StateOutput {
  state: string; xQryBusy: number; xStart: number; xAck: number; xDone: number;
  xCtrlError: number; xErrL0: number; xErrL1: number; iCarrierID: number;
  iStepNo: number; iResourceID: number; iPar1: number; iPar2: number; iPar3: number; iPar4: number;
}

const stateByPort = new Map<number, StateOutput>();

const EMPTY_OUTPUT: StateOutput = {
  state: "Idle", xQryBusy: 0, xStart: 0, xAck: 0, xDone: 0,
  xCtrlError: 0, xErrL0: 0, xErrL1: 0, iCarrierID: 0, iStepNo: 0,
  iResourceID: 0, iPar1: 0, iPar2: 0, iPar3: 0, iPar4: 0,
};

function getStateFor(port: number): StateOutput {
  return stateByPort.get(port) || EMPTY_OUTPUT;
}

function setStateFor(port: number, fn: (s: StateOutput) => void) {
  if (!stateByPort.has(port)) stateByPort.set(port, Object.assign({}, EMPTY_OUTPUT));
  const s = stateByPort.get(port)!;
  fn(s);
}

function getAllStates(): Record<number, StateOutput> {
  const r: Record<number, StateOutput> = {};
  for (const [port, s] of stateByPort) r[port] = Object.assign({}, s);
  return r;
}

class Simulator extends EventEmitter {
  private servers = new Map<number, OPCUAServer>();
  private stateRefsMap = new Map<number, StateRefs>();
  private httpServer: any = null;

  async startStation(config: StationConfig): Promise<void> {
    const server = await this.createServer(config);
    this.servers.set(config.port, server);
    setStateFor(config.port, (s) => { s.state = "Idle"; });
    console.log("[%s] OPC UA Server at opc.tcp://localhost:%d/PLC/Simulated", config.name, server.endpoints[0].port);
  }
  async startAll(): Promise<void> {
    for (const c of STATIONS) await this.startStation(c);
    console.log("\n=== Simulator ready -- " + STATIONS.length + " station(s) ===");
  }
  private async createServer(config: StationConfig): Promise<OPCUAServer> {
    const server = new OPCUAServer({
      port: config.port, resourcePath: "/PLC/Simulated",
      buildInfo: { productName: "Simatic S7-1500 simulator", buildNumber: "1.0.0", buildDate: "" as never },
    });
    await server.initialize();
    const addressSpace = (server as any).engine.addressSpace;
    if (!addressSpace) throw new Error("Cannot access OPC UA address space");
    const nsIdx = addressSpace.getOwnNamespace().index;
    const ns = addressSpace.getOwnNamespace();
    const rootObjects = addressSpace.rootFolder.objects;
    ns.addObject({ organizedBy: rootObjects, browseName: "PLC_" + config.name });
    ns.addObject({ organizedBy: rootObjects, browseName: "dbProcessData" });
    const refs: StateRefs = { xQryBusy: 0, xStart: 0, xAck: 0, xDone: 0, xCtrlError: 0, xErrL0: 0, xErrL1: 0, iCarrierID: 0, iStepNo: 0, iResourceID: 0, iPar1: 0, iPar2: 0, iPar3: 0, iPar4: 0 };
    this.stateRefsMap.set(config.port, refs);
    function addVar(id: string, dt: DataType) {
      ns.addVariable({
        nodeId: "ns=" + nsIdx + ";s=" + id,
        browseName: id,
        dataType: dt,
        minimumSamplingInterval: 1000,
        value: {
          get: () => {
            const v = (refs as any)[id];
            if (dt === DataType.Boolean) return new Variant({ dataType: dt, value: !!v });
            return new Variant({ dataType: dt, value: v });
          },
          set: (v: any) => {
            (refs as any)[id] = v.value.value;
            return OPCStatusCode.Good;
          }
        }
      });
    }
    for (const n of ["xQryBusy","xStart","xAck","xDone"]) addVar(n, DataType.Boolean);
    for (const n of ["xCtrlError","xErrL0","xErrL1"]) addVar(n, DataType.Int32);
    for (const n of ["iCarrierID","iStepNo","iResourceID","iPar1","iPar2","iPar3","iPar4"]) addVar(n, DataType.Int32);
    await server.start();
    this.setupCarrierSimulation(config, refs);
    return server;
  }
  private setupCarrierSimulation(config: StationConfig, refs: StateRefs): void {
    let currentState = "Idle";
    const emitState = () => { setStateFor(config.port, (s) => {
      s.state = currentState; s.xQryBusy = refs.xQryBusy; s.xStart = refs.xStart;
      s.xAck = refs.xAck; s.xDone = refs.xDone; s.xCtrlError = refs.xCtrlError;
      s.xErrL0 = refs.xErrL0; s.xErrL1 = refs.xErrL1; s.iCarrierID = refs.iCarrierID;
      s.iStepNo = refs.iStepNo; s.iResourceID = refs.iResourceID; s.iPar1 = refs.iPar1;
      s.iPar2 = refs.iPar2; s.iPar3 = refs.iPar3; s.iPar4 = refs.iPar4; }); };
    setInterval(() => {
      switch (currentState) {
        case "Idle": currentState = "WaitingForStart"; emitState(); break;
        case "WaitingForStart":
          if (refs.xStart) { currentState = "Processing"; refs.xQryBusy = 1; emitState();
            setTimeout(() => { refs.xAck = 1; }, 50);
            setTimeout(() => { refs.xAck = 0; }, 200); } break;
        case "Processing":
          if (refs.xStart) { refs.iCarrierID += 1; refs.iStepNo += 1;
            refs.iResourceID = Math.floor(Math.random() * 4);
            refs.iPar1 = Math.floor(Math.random() * config.dbNumber);
            refs.iPar2 = Math.floor(Math.random() * 100);
            if (Math.random() < config.errorRate) { currentState = "Error"; refs.xCtrlError = Math.floor(Math.random()*4)+36; emitState(); }
            else { setTimeout(() => { refs.xDone=1; currentState="WaitForAck"; emitState(); }, config.cycleTime); }
          } break;
        case "WaitForAck":
          if (refs.xAck) { refs.xQryBusy=0; refs.iCarrierID=0; refs.iStepNo=0;
            refs.iPar3=Math.floor(Math.random()*50); setTimeout(()=>{refs.xDone=0;currentState="Idle";emitState();},100); } break;
        case "Error": if (refs.xErrL0) { refs.xCtrlError=0; currentState="Idle"; emitState(); } break;
      }
    }, config.cycleTime / 2);
    emitState();
  }
  getStateRefs(port: number): StateRefs | undefined { return this.stateRefsMap.get(port); }
  getAllPorts(): number[] { return Array.from(this.stateRefsMap.keys()); }
  getStationName(port: number): string { return STATIONS.find(s=>s.port===port)?.name || "port-"+port; }
  startHttpApi(httpPort: number) {
    const sim = this;
    const srv = createServer((req, res) => {
      const url = req.url || "";
      const method = req.method || "GET";
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (method==="OPTIONS"){res.writeHead(204);res.end();return;}
      const p = url.slice(1).split("/").filter(Boolean);
      if ((p[0]==="api"&&p[1]=== "state")||p[0]==="health") {
        const ps = (p[0]==="api")?p[2]:null;
        if (ps) { const port=parseInt(ps,10); const s=stateByPort.get(port);
          if(!s){res.writeHead(404,{"Content-Type":"application/json"});res.end(JSON.stringify({error:"No station"}));return;}
          res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify(Object.assign({},s))); }
        else { const m:Record<number,StateOutput>={}; for(const[k,v]of stateByPort)m[k]=Object.assign({},v);
          res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify(m)); }
        return; }
      if (p[0]==="api"&&p[1]==="command") {
        let b=""; req.on("data",c=>{b+=String(c)});req.on("end",()=>{
          try { const d=JSON.parse(b); const cmd=d.command||""; const val=d.value??1;
            if(p[2]){ const port=parseInt(p[2],10); setStateFor(port,s=>{(s as any)[cmd]=val});
              console.log("[HTTP] "+cmd+"="+val+" on port "+port);
              res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({ok:true,port,cmd,val})); }
            else { let n=0;for(const pp of sim.getAllPorts()){setStateFor(pp,s=>{(s as any)[cmd]=val});n++;}
              res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({ok:true,stationCount:n,cmd,val})); }
          } catch(e){res.writeHead(400,{"Content-Type":"application/json"});res.end(JSON.stringify({ok:false,error:String(e)}));} });
        return; }
      res.writeHead(404);res.end();
    });
    srv.listen(httpPort,"0.0.0.0",()=>{console.log("\n[HTTP API] Simulator Test UI at http://localhost:"+httpPort+"/api/state");});
    this.httpServer=srv;
  }
  async stop(): Promise<void> {
    for(const[,sv]of this.servers)await sv.shutdown().catch(()=>{});
    if(this.httpServer)this.httpServer.close();
    this.servers.clear();this.stateRefsMap.clear();stateByPort.clear(); }
}

const OPC_PORT = Number(process.env.OPC_UA_SERVER_PORT ?? 4840);
const MAX_STATIONS = Math.min(STATIONS.length, parseInt(process.env.STATION_COUNT ?? "5", 10));

async function main() {
  const defaultHttpPort = parseInt(process.env.HTTP_API_PORT ?? "4841", 10);
  console.log("=== Siemens S7-1500 OPC UA Simulator ===");
  console.log("Configured stations: " + STATIONS.length);
  const sim = new Simulator();
  if (OPC_PORT > 0 && OPC_PORT <= 65535) {
    console.log("\nSingle station mode on port " + OPC_PORT + "\n");
    await sim.startStation(Object.assign({},STATIONS[0],{port:OPC_PORT}));
  } else {
    console.log("\nRunning all " + MAX_STATIONS + " stations\n");
    await sim.startAll();
  }
  if (defaultHttpPort > 0) sim.startHttpApi(defaultHttpPort);
  const shutdown=async()=>{console.log("\nShutting down...");await sim.stop();process.exit(0)};
  process.on("SIGINT",shutdown); process.on("SIGTERM",shutdown);
}
main().catch((err:Error)=>{console.error(err.message||err);process.exit(1)});