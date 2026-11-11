/** OpenSE4 browser bridge protocol, v0.1. This is NOT an OpenSE4 engine implementation. */
export class BridgeError extends Error {}
export function assertSnapshot(s) {
  if (!s || typeof s !== 'object' || !Number.isInteger(s.turn) || !Array.isArray(s.empires) || !Array.isArray(s.systems)) {
    throw new BridgeError('Invalid engine snapshot: expected turn, empires[], systems[]');
  }
  return s;
}
export class OpenSE4Bridge {
  constructor(transport) { this.transport = transport; }
  async capabilities() { return this.transport.call('capabilities', {}); }
  async initialize(options) { return assertSnapshot(await this.transport.call('initialize',options)); }
  async snapshot() { return assertSnapshot(await this.transport.call('snapshot',{})); }
  async command(command) {
    if (!command || typeof command.type !== 'string') throw new BridgeError('Command must have a type');
    const result = await this.transport.call('command',command);
    if (!result || typeof result.accepted !== 'boolean') throw new BridgeError('Invalid command result');
    return result;
  }
  async endTurn() { return assertSnapshot(await this.transport.call('endTurn',{})); }
  async save() { return this.transport.call('save',{}); }
  async load(payload, aiMode = payload?.aiMode || 'classic') { return assertSnapshot(await this.transport.call('load',{payload,aiMode})); }
}
export class MissingNativeEngineTransport {
  async call() { throw new BridgeError('OpenSE4 native engine is not yet compiled or connected. Use Legacy Playtest to play v0.8.'); }
}
