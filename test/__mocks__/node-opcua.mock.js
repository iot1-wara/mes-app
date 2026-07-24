// Mock node-opcua to avoid ESM hexy dependency issues in Jest e2e tests
const defaults = { securityModes: ['None', 'Sign', 'SignAndEncrypt'] };

module.exports = {
  defaults,
  UaClient: class UaClient {
    constructor() {}
    createSession = async () => ({ readValueId: () => {}, close: async () => {} });
    connect = async () => {};
    disconnect = async () => {};
    browse = async () => [];
    readFile = async () => ({});
    addSubscription = () => ({ on: () => void 0, removeListener: () => void 0, close: async () => {} });
  },
  nodeset: { filename: '' },
  resolveNodeTypeDescriptor: () => undefined,
  StandardNodeClasses: {},
  buildDataTypeDescriptors: () => ({}),
  resolveAttributeSource: () => [],
  clients: { createClient: () => ({}) },
};
