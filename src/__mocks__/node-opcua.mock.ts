// Mock node-opcua to avoid ESM module issues (hexy dependency) in Jest
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
    addSubscription = () => ({ on: jest.fn(), removeListener: jest.fn(), close: async () => {} });
  },
  nodeset: { filename: '' },
  resolveNodeTypeDescriptor: () => undefined,
  StandardNodeClasses: {},
  buildDataTypeDescriptors: () => ({}),
  resolveAttributeSource: () => [],
  clients: { createClient: () => ({}) },
};
